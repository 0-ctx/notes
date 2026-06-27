;(function () {
  const canvases = document.querySelectorAll("[data-ink-shader]")
  if (canvases.length === 0) return

  const vertexSource = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

  const fragmentSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotate = mat2(0.82, -0.57, 0.57, 0.82);

  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(p);
    p = rotate * p * 2.04 + 11.7;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.065;

  vec2 q = vec2(
    fbm(p * 0.9 + vec2(0.0, t)),
    fbm(p * 0.9 + vec2(5.2, -t))
  );

  vec2 r = vec2(
    fbm(p * 1.35 + q * 2.4 + vec2(t * 1.8, 0.0)),
    fbm(p * 1.15 + q * 2.9 + vec2(0.0, -t * 1.4))
  );

  float field = fbm(p * 1.05 + r * 2.8);
  float wash = fbm(p * 2.2 + q * 3.0 - t);
  float fibers = fbm(p * 18.0 + vec2(t * 5.0, -t * 2.0));

  float ink = smoothstep(0.38, 0.82, field);
  float feather = smoothstep(0.42, 0.88, wash) * (1.0 - smoothstep(0.74, 1.0, field));
  float paper = 0.88 + 0.07 * fbm(uv * 7.0 + vec2(0.0, t));
  float grain = (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.035;
  float vignette = smoothstep(1.18, 0.34, length(p * vec2(0.82, 1.0)));

  float value = paper;
  value -= ink * 0.68;
  value -= feather * 0.16;
  value += fibers * 0.045;
  value += grain;
  value = mix(value * 0.72, value, vignette);

  gl_FragColor = vec4(vec3(clamp(value, 0.04, 0.96)), 1.0);
}
`

  function createShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  function createProgram(gl) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
    if (!vertexShader || !fragmentShader) return null

    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      return null
    }

    return program
  }

  function start(canvas) {
    const gl =
      canvas.getContext("webgl", { antialias: false, depth: false, stencil: false }) ||
      canvas.getContext("experimental-webgl", { antialias: false, depth: false, stencil: false })

    if (!gl) {
      canvas.classList.add("is-fallback")
      return
    }

    const program = createProgram(gl)
    if (!program) return

    const positionLocation = gl.getAttribLocation(program, "a_position")
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution")
    const timeLocation = gl.getUniformLocation(program, "u_time")

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )

    let width = 0
    let height = 0
    const startedAt = performance.now()

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const nextWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const nextHeight = Math.max(1, Math.floor(canvas.clientHeight * dpr))

      if (nextWidth !== width || nextHeight !== height) {
        width = nextWidth
        height = nextHeight
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    function render(now) {
      resize()
      gl.useProgram(program)
      gl.enableVertexAttribArray(positionLocation)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(resolutionLocation, width, height)
      gl.uniform1f(timeLocation, (now - startedAt) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      requestAnimationFrame(render)
    }

    requestAnimationFrame(render)
  }

  canvases.forEach(start)
})()
