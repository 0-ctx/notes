---
title: Short Notes on RL for LLMs
---


Short Notes on RL for LLMs

## Policy Gradients

***Why?***  
Because when actions are sampled discretely, we generally cannot backpropagate through the action, environment, or reward.  
Policy gradients let us optimize the expected reward using only sampled actions, their rewards, and their log-probability gradients.

***Key Idea***  
Sample actions and use the gradients of their log-probabilities. Increase the probability of actions that performed better than the baseline, and decrease the probability of actions that performed worse.

$$
\nabla_\theta J(\theta)
=
\mathbb{E}\left[
R \nabla_\theta \log \pi_\theta(a \mid s)
\right]
$$


## REINFORCE

***Why?***  
Because the policy-gradient equation is an expectation, but in practice we only have sampled trajectories. We need a concrete estimator that can turn those samples into a gradient update.

***Key Idea***  
Sample a trajectory, observe its return, and use that use the return-to-go $G_t$ to weight the log-probability gradient.  

$$ 
\nabla_\theta J(\theta) \approx  \sum_{t} \big(G_t - b(s_t)\big) \nabla_\theta \log \pi_\theta(a_t \mid s_t)  
$$





## KL Divergence

***Why?***  
Because while optimizing a policy, especially an LLM, we often do not want it to drift arbitrarily far from a trusted reference model.

***Key Idea***  
Measure how different one probability distribution is from another.

$$
D_{\mathrm{KL}}(\pi \parallel \pi_{\mathrm{ref}})
=
\mathbb{E}_{a \sim \pi}  
\left[  
\log  
\frac{\pi(a)}  
{\pi_{\mathrm{ref}}(a)}  
\right]  

$$






## GAE

*TODO*

## PPO

***Why?***  
Because raw policy-gradient updates can be too large and destabilize training.  
The principled fix (a hard trust region, TRPO) needs expensive second-order optimization. PPO wants that stability with plain SGD, reusable across several epochs of the same batch.


***Key Idea***  
Measure how much the new policy has changed relative to the old policy, then prevent excessively large changes.

$$
\rho_t(\theta)
=
\frac{  
\pi_\theta(a_t \mid s_t)  
}{  
\pi_{\theta_{\mathrm{old}}}(a_t \mid s_t)  
}  
$$

PPO clips this ratio during optimization.



$$
L^{CLIP}(\theta) 
= 
\mathbb{E}_t\Big[\min\big(\rho_t(\theta)\hat{A}_t,\ \text{clip}(\rho_t(\theta), 1-\epsilon, 1+\epsilon)\hat{A}_t\big)\Big]
$$

GAE uses the critic to calculate advantage estimate $\hat{A}_t$ 

$$  
\text{reward}  
\rightarrow  
V(s_t)  
\rightarrow  
\text{GAE}  
\rightarrow  
\hat{A}_t  
\rightarrow  
\text{PPO update}  
$$




## DPO

****Why?****  
Traditional RLHF with PPO is operationally complicated. It can require a reward model, rollouts, a value model, KL control, and an online RL loop.

***Key Idea***  
Given a preferred response and a rejected response, directly train the model so that the preferred response becomes relatively more likely.

The optimal RLHF policy has a closed form in terms of the reward; plug it into the **Bradley–Terry preference model** and *the reward model cancels out algebraically*, leaving a loss on the policy's own log-probs. No critic, no GAE, no reward model, no rollouts.

$$ 
\mathcal{L}_{DPO}(\theta) = -\mathbb{E}_{(x,y_w,y_l)}\left[\log \sigma\left(\beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\right)\right] 
$$




## GRPO

***Why?***  
Because PPO usually requires a critic or value model, which is expensive for large language models.

***Key Idea***  
Generate several responses for the same prompt, compare their rewards within that group, and use relative performance as the advantage signal.  
Delete the critic and GAE entirely. Sample a group of completions per prompt, score them, and normalize within the group to get the advantage  then move KL to the loss instead of the reward.


$$ 
\hat{A}_i
=
\frac{
R_i - \operatorname{mean}(R_1, \ldots, R_G)
}{
\operatorname{std}(R_1, \ldots, R_G)
}
$$

Define the token-level probability ratio:

$$
\rho_{i,t}(\theta)
=
\frac{
\pi_\theta(o_{i,t} \mid q, o_{i,<t})
}{
\pi_{\theta_{\mathrm{old}}}(o_{i,t} \mid q, o_{i,<t})
}
$$

Then:

$$
\mathcal{J}_{\mathrm{GRPO}}(\theta)
=
\mathbb{E}
\left[
\frac{1}{G}
\sum_{i=1}^{G}
\frac{1}{|o_i|}
\sum_{t=1}^{|o_i|}
\left(
\min
\left(
\rho_{i,t}(\theta)\hat{A}_i,
\operatorname{clip}\!\left(
\rho_{i,t}(\theta), 1-\epsilon, 1+\epsilon
\right)\hat{A}_i
\right)
-
\beta D_{\mathrm{KL}}
\left(
\pi_\theta \,\|\, \pi_{\mathrm{ref}}
\right)
\right)
\right]
$$


## References

- Sutton, R.S., McAllester, D., Singh, S., & Mansour, Y. (1999). Policy Gradient Methods for RL with Function Approximation. NeurIPS. https://dblp.org/rec/conf/nips/SuttonMSM99.html
- Williams, R.J. (1992). Simple Statistical Gradient-Following Algorithms for Connectionist RL. Machine Learning, 8, 229–256. https://link.springer.com/article/10.1007/BF00992696
- Kullback, S., & Leibler, R.A. (1951). On Information and Sufficiency. Ann. Math. Statist., 22, 79–86. https://projecteuclid.org/journals/annals-of-mathematical-statistics/volume-22/issue-1/On-Information-and-Sufficiency/10.1214/aoms/1177729694.full
- Schulman, J., Moritz, P., Levine, S., Jordan, M., & Abbeel, P. (2015/2016). High-Dimensional Continuous Control Using Generalized Advantage Estimation. arXiv:1506.02438. https://arxiv.org/abs/1506.02438
- Schulman, J., Wolski, F., Dhariwal, P., Radford, A., & Klimov, O. (2017). Proximal Policy Optimization Algorithms. arXiv:1707.06347. https://arxiv.org/abs/1707.06347
- Ouyang, L., Wu, J., Jiang, X., et al. (2022). Training Language Models to Follow Instructions with Human Feedback. arXiv:2203.02155. https://arxiv.org/abs/2203.02155
- Rafailov, R., Sharma, A., Mitchell, E., Ermon, S., Manning, C.D., & Finn, C. (2023). Direct Preference Optimization. arXiv:2305.18290. https://arxiv.org/abs/2305.18290
- Shao, Z., Wang, P., Zhu, Q., et al. (2024). DeepSeekMath. arXiv:2402.03300. https://arxiv.org/abs/2402.03300
