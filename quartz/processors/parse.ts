import esbuild from "esbuild"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { Processor, unified } from "unified"
import { Root as MDRoot } from "remark-parse/lib"
import { Element, Root as HTMLRoot, Text as HTMLText } from "hast"
import { visit } from "unist-util-visit"
import { MarkdownContent, ProcessedContent } from "../plugins/vfile"
import { PerfTimer } from "../util/perf"
import { read } from "to-vfile"
import { FilePath, QUARTZ, slugifyFilePath } from "../util/path"
import path from "path"
import workerpool, { Promise as WorkerPromise } from "workerpool"
import { QuartzLogger } from "../util/log"
import { trace } from "../util/trace"
import { BuildCtx, WorkerSerializableBuildCtx } from "../util/ctx"
import { styleText } from "util"

export type QuartzMdProcessor = Processor<MDRoot, MDRoot, MDRoot>
export type QuartzHtmlProcessor = Processor<undefined, MDRoot, HTMLRoot>

const taskListLabelClass = "task-list-label"
const taskListLabelBlockTags = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "div",
  "dl",
  "fieldset",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "main",
  "menu",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "ul",
])

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && (node as { type?: unknown }).type === "element"

const isText = (node: unknown): node is HTMLText =>
  typeof node === "object" && node !== null && (node as { type?: unknown }).type === "text"

const classList = (node: Element): string[] => {
  const className = node.properties?.className
  if (Array.isArray(className)) return className.map(String)
  if (typeof className === "string") return className.split(/\s+/).filter(Boolean)
  return []
}

const addClass = (node: Element, className: string) => {
  const classes = classList(node)
  if (!classes.includes(className)) {
    node.properties = { ...node.properties, className: [...classes, className] }
  }
}

const isCheckboxInput = (node: unknown): node is Element =>
  isElement(node) && node.tagName === "input" && node.properties?.type === "checkbox"

const isTaskLabelBoundary = (node: unknown) =>
  isElement(node) && taskListLabelBlockTags.has(node.tagName)

function wrapTaskListLabels() {
  return (tree: HTMLRoot) => {
    visit(tree, "element", (node) => {
      if (!isElement(node) || node.tagName !== "li") return
      if (!classList(node).includes("task-list-item")) return

      const checkboxIndex = node.children.findIndex(isCheckboxInput)
      if (checkboxIndex === -1) return

      let labelStart = checkboxIndex + 1
      while (true) {
        const child = node.children[labelStart]
        if (!isText(child) || child.value.trim() !== "") break
        labelStart += 1
      }

      const firstLabelChild = node.children[labelStart]
      if (isElement(firstLabelChild) && firstLabelChild.tagName === "p") {
        addClass(firstLabelChild, taskListLabelClass)
        return
      }

      if (isElement(firstLabelChild) && classList(firstLabelChild).includes(taskListLabelClass)) {
        return
      }

      let labelEnd = labelStart
      while (labelEnd < node.children.length && !isTaskLabelBoundary(node.children[labelEnd])) {
        labelEnd += 1
      }

      if (labelEnd === labelStart) return

      const labelChildren = node.children.slice(labelStart, labelEnd)
      node.children.splice(labelStart, labelChildren.length, {
        type: "element",
        tagName: "span",
        properties: { className: [taskListLabelClass] },
        children: labelChildren,
      })
    })
  }
}

export function createMdProcessor(ctx: BuildCtx): QuartzMdProcessor {
  const transformers = ctx.cfg.plugins.transformers

  return (
    unified()
      // base Markdown -> MD AST
      .use(remarkParse)
      // MD AST -> MD AST transforms
      .use(
        transformers.flatMap((plugin) => plugin.markdownPlugins?.(ctx) ?? []),
      ) as unknown as QuartzMdProcessor
    //  ^ sadly the typing of `use` is not smart enough to infer the correct type from our plugin list
  )
}

export function createHtmlProcessor(ctx: BuildCtx): QuartzHtmlProcessor {
  const transformers = ctx.cfg.plugins.transformers
  return (
    unified()
      // MD AST -> HTML AST
      .use(remarkRehype, { allowDangerousHtml: true })
      // HTML AST -> HTML AST transforms
      .use(transformers.flatMap((plugin) => plugin.htmlPlugins?.(ctx) ?? []))
      .use(wrapTaskListLabels)
  )
}

function* chunks<T>(arr: T[], n: number) {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n)
  }
}

async function transpileWorkerScript() {
  // transpile worker script
  const cacheFile = "./.quartz-cache/transpiled-worker.mjs"
  const fp = "./quartz/worker.ts"
  return esbuild.build({
    entryPoints: [fp],
    outfile: path.join(QUARTZ, cacheFile),
    bundle: true,
    keepNames: true,
    platform: "node",
    format: "esm",
    packages: "external",
    sourcemap: true,
    sourcesContent: false,
    plugins: [
      {
        name: "css-and-scripts-as-text",
        setup(build) {
          build.onLoad({ filter: /\.scss$/ }, (_) => ({
            contents: "",
            loader: "text",
          }))
          build.onLoad({ filter: /\.inline\.(ts|js)$/ }, (_) => ({
            contents: "",
            loader: "text",
          }))
        },
      },
    ],
  })
}

export function createFileParser(ctx: BuildCtx, fps: FilePath[]) {
  const { argv, cfg } = ctx
  return async (processor: QuartzMdProcessor) => {
    const res: MarkdownContent[] = []
    for (const fp of fps) {
      try {
        const perf = new PerfTimer()
        const file = await read(fp)

        // strip leading and trailing whitespace
        file.value = file.value.toString().trim()

        // Text -> Text transforms
        for (const plugin of cfg.plugins.transformers.filter((p) => p.textTransform)) {
          file.value = plugin.textTransform!(ctx, file.value.toString())
        }

        // base data properties that plugins may use
        file.data.filePath = file.path as FilePath
        file.data.relativePath = path.posix.relative(argv.directory, file.path) as FilePath
        file.data.slug = slugifyFilePath(file.data.relativePath)

        const ast = processor.parse(file)
        const newAst = await processor.run(ast, file)
        res.push([newAst, file])

        if (argv.verbose) {
          console.log(`[markdown] ${fp} -> ${file.data.slug} (${perf.timeSince()})`)
        }
      } catch (err) {
        trace(`\nFailed to process markdown \`${fp}\``, err as Error)
      }
    }

    return res
  }
}

export function createMarkdownParser(ctx: BuildCtx, mdContent: MarkdownContent[]) {
  return async (processor: QuartzHtmlProcessor) => {
    const res: ProcessedContent[] = []
    for (const [ast, file] of mdContent) {
      try {
        const perf = new PerfTimer()

        const newAst = await processor.run(ast as MDRoot, file)
        res.push([newAst, file])

        if (ctx.argv.verbose) {
          console.log(`[html] ${file.data.slug} (${perf.timeSince()})`)
        }
      } catch (err) {
        trace(`\nFailed to process html \`${file.data.filePath}\``, err as Error)
      }
    }

    return res
  }
}

const clamp = (num: number, min: number, max: number) =>
  Math.min(Math.max(Math.round(num), min), max)

export async function parseMarkdown(ctx: BuildCtx, fps: FilePath[]): Promise<ProcessedContent[]> {
  const { argv } = ctx
  const perf = new PerfTimer()
  const log = new QuartzLogger(argv.verbose)

  // rough heuristics: 128 gives enough time for v8 to JIT and optimize parsing code paths
  const CHUNK_SIZE = 128
  const concurrency = ctx.argv.concurrency ?? clamp(fps.length / CHUNK_SIZE, 1, 4)

  let res: ProcessedContent[] = []
  log.start(`Parsing input files using ${concurrency} threads`)
  if (concurrency === 1) {
    try {
      const mdRes = await createFileParser(ctx, fps)(createMdProcessor(ctx))
      res = await createMarkdownParser(ctx, mdRes)(createHtmlProcessor(ctx))
    } catch (error) {
      log.end()
      throw error
    }
  } else {
    await transpileWorkerScript()
    const pool = workerpool.pool("./quartz/bootstrap-worker.mjs", {
      minWorkers: "max",
      maxWorkers: concurrency,
      workerType: "thread",
    })
    const serializableCtx: WorkerSerializableBuildCtx = {
      buildId: ctx.buildId,
      argv: ctx.argv,
      allSlugs: ctx.allSlugs,
      allFiles: ctx.allFiles,
      incremental: ctx.incremental,
      virtualPages: [],
    }

    try {
      const textToMarkdownPromises: WorkerPromise<MarkdownContent[]>[] = []
      let processedFiles = 0
      for (const chunk of chunks(fps, CHUNK_SIZE)) {
        textToMarkdownPromises.push(pool.exec("parseMarkdown", [serializableCtx, chunk]))
      }

      const mdResults: Array<MarkdownContent[]> = await Promise.all(
        textToMarkdownPromises.map(async (promise) => {
          const result = await promise
          processedFiles += result.length
          log.updateText(`text->markdown ${styleText("gray", `${processedFiles}/${fps.length}`)}`)
          return result
        }),
      )

      const markdownToHtmlPromises: WorkerPromise<ProcessedContent[]>[] = []
      processedFiles = 0
      for (const mdChunk of mdResults) {
        markdownToHtmlPromises.push(pool.exec("processHtml", [serializableCtx, mdChunk]))
      }
      const results: ProcessedContent[][] = await Promise.all(
        markdownToHtmlPromises.map(async (promise) => {
          const result = await promise
          processedFiles += result.length
          log.updateText(`markdown->html ${styleText("gray", `${processedFiles}/${fps.length}`)}`)
          return result
        }),
      )

      res = results.flat()
    } finally {
      await pool.terminate()
    }
  }

  log.end(`Parsed ${res.length} Markdown files in ${perf.timeSince()}`)
  return res
}
