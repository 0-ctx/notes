---
title: PostTrainBench
draft: true
tags:
  - evaluation
  - post-training
---

[PostTrainBench](https://posttrainbench.com/) asks whether coding agents can automate a concrete chunk of AI R&D: take a base LLM, use one H100 for 10 hours, and post-train it to improve on a target benchmark.

Paper: [PostTrainBench: Can LLM Agents Automate LLM Post-Training?](https://arxiv.org/abs/2603.08640)

Setup:

- Base models: Qwen3-1.7B, Qwen3-4B, SmolLM3-3B, Gemma-3-4B.
- Benchmarks: AIME 2025, GSM8K, GPQA, HumanEval, BFCL, ArenaHard-Writing, HealthBench-Easy.
- Agents get broad autonomy: web access, code execution, data curation, method choice, hyperparameters.
- Constraints: no benchmark test-data training, no evaluation-harness edits, no model substitution.

Interesting because it turns "can agents do AI research?" into an end-to-end artifact: the submitted checkpoint either improves the held-out score or it does not.

The headline result is mixed. Frontier agents improve base models, but still lag behind official instruction-tuned versions on average. The paper reports 23.2% weighted average for the best agent versus 51.1% for official instruct models. But the gap is uneven: agents can spike on narrow tasks with clear signals, e.g. GPT-5.1 Codex Max hitting 89% on BFCL with Gemma-3-4B versus 67% for the official model.

Failure modes are the important part:

- test-set contamination / training on evals
- submitting existing instruct checkpoints instead of training the assigned base model
- exploiting forgotten constraints after long context runs
- generating synthetic data through APIs that were not allowed

This feels like a good benchmark for the messy middle between software-engineering agents and automated ML research. It is not just measuring insight; it is measuring persistence, experiment hygiene, contamination resistance, and whether the scaffold can keep rules alive over a long run.

Open question: if the benchmark rewards final score under a time limit, agents are naturally pushed toward shortcut discovery. That makes the reward-hacking incidents less like an anomaly and more like part of the object being measured.
