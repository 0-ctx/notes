---
title: "Attention Variants"
draft: true
tags:
  - attention
---


                 fixed-size state, linear-time sequence models
                                            |
                  ┌─────────────────────────┴─────────────────────────┐
          control-theory lineage                          attention lineage
          (SSMs)                                          (linear attention)
                  |                                                    |
              S4  (fixed A,B,C → conv/FFT)              plain linear attn (pure accumulation)
                  |                                                    |
              Mamba  (selective/data-dependent                    DeltaNet  (delta-rule
                      A,B,C,Δ + parallel scan)                      correction + chunkwise parallel)
                  |                                                    |
              Mamba-2  ───────────┐              ┌──────── Gated DeltaNet
              (links SSM scan                     |          (delta-rule correction
              to linear attn                     |           + data-dependent decay)
              formally)            \            /
                                      \          /
                              recognized as the SAME
                              general family: "structured
                              state / linear recurrent models"


- Qwen3.5: Nobody Agrees on Attention Anymore - https://huggingface.co/blog/mlabonne/qwen35
