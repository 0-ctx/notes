---
title: re:ctx
---

<section class="index-hero" aria-label="Animated ink diffusion shader">
  <canvas class="index-hero__canvas" data-ink-shader aria-hidden="true"></canvas>
</section>

_Nothing amazing ever happens here. Everything is ordinary._



#### *Read log*


* [x] [The Second Half - Shunyu Yao - 姚顺雨](https://ysymyth.github.io/The-Second-Half/) *




Why RL didn't work before? Why RL works now? ***Priors***.  
Scaling language pre-training gave us powerful priors. Yao mentions how this* may seem counterintutive to a classic RL researcher even just few years ago. (whole *miracle* was empirical anyway)

**language reasoning as actions*

AI's first half involved search for novel methods to hillclimb harder and harder benchmarks. Now The "recipe" is in place and is scaling well *so far*.  
But "*If novel methods are no longer needed and harder benchmarks will just get solved increasingly soon, what should we do?*"

> The second half of AI will shift focus from solving problems to defining problems. In this new era, evaluation becomes more important than training.


- [x] [Scaling Laws, Honestly | Diogo Almeida](https://x.com/CompleteSkeptic/status/2073442518117884197)

Kaplan et al. trained all models on the fixed amount of data (~130B tokens) and used a learning rate schedule that zeroes. Former caused big models to not get enough data and later caused models to not train enough.

[2406.12907](https://arxiv.org/abs/2406.12907), which tries to reconcile difference in results of two scaling lawa papers, is also inaccurate.


Labs' equity vortex drying academia, closed research and not acknowledging wrong results... is a sad state of affairs.

- [x] [LSA LongCat Sparse Attention - arjunkocher](https://www.k-a.in/LSA.html)

The indexer becomes the bottleneck in sparse attention; Meituan LSA focuses on this bottleneck and introduces three **orthogonal** optimizations to indexer.


- [x] [A brief history of distillation in AI | Sergio Paniego](https://x.com/SergioPaniego/status/2073066275819991472?s=20)
  - [x] [Distilling the Knowledge in a Neural Network](https://huggingface.co/papers/1503.02531)
  - [ ] [Alpaca: A Strong, Replicable Instruction-Following Model](https://crfm.stanford.edu/2023/03/13/alpaca.html)
  - [ ] [Self-Instruct: Aligning Language Model with Self Generated Instructions](https://huggingface.co/papers/2212.10560)
  - [ ] [On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes](https://huggingface.co/papers/2306.13649)

TL;DR Distillation gives a better training signal than hard labels.
> ... line between distillation, supervised fine-tuning, reinforcement learning and synthetic data is getting blurry.


---


<script src="./static/ink-shader.js"></script>
