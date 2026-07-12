---
title: EdgeBench
draft: true
tags:
  - evaluation
  - agents
---

[EdgeBench](https://edge-bench.org/) is a benchmark for environment learning: how agents improve after deployment when they can interact with a real task environment, observe feedback, and iterate for many hours.

Paper: [EdgeBench: Unveiling Scaling Laws of Learning from Real-World Environments](https://arxiv.org/abs/2607.05155)

Setup:

- 134 real-world tasks, with an initial public release of 51 tasks and the evaluation framework.
- Each task runs for at least 12 hours of continuous agent operation; selected runs go beyond 72 hours.
- Task families: scientific problems & ML, systems & software engineering, combinatorial optimization, professional knowledge work, formal math & theorem proving, and interactive games.
- Feedback is task-native: build logs, tests, simulator traces, proof states, experimental errors, rubric comments, objective values, etc.

The interesting distinction: most benchmarks ask what the model already knows. EdgeBench asks whether an agent can learn from a local environment that was not fully available during pretraining. That makes it closer to measuring deployed usefulness: can the agent diagnose, revise, and compound feedback over time?

Headline claim: after averaging roughly 38,000 hours of agent-environment interaction, performance follows a log-sigmoid curve:

$$
S(t) = \frac{S_{\max}}{1 + (t_{\mathrm{mid}} / t)^{\beta}}
$$

They also report that agent learning speed from environments roughly doubles every three months, measured on tasks where initial model performance is comparable.

Why it matters:

- It moves evaluation from static answer quality to learning dynamics.
- Long-horizon behavior becomes first-class: persistence, debugging, experiment design, memory, and use of feedback.
- The benchmark is partly about scaffolds and context management, not just base model intelligence.
- It gives a way to compare agents by learning rate, not only final score.

Question: if the smooth law only appears after averaging many jagged task curves, the benchmark may be better for measuring population-level progress than for predicting any single deployment. Still, that may be exactly the right object: frontier progress in environment learning, not one task's leaderboard drama.
