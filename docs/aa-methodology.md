# AA 官方方法参考（非内置评分数据）

核对时间：2026-10-29。来源：[Intelligence Benchmarking](https://artificialanalysis.ai/methodology/intelligence-benchmarking)。当前版本 v5.0；版本后续可能变化。

官方指数涵盖知识工作、编码、科学、通用四个类别，每类 25%。9 个 evaluation 对应 10 个独立加权组件：

| 组件                                  | 官方公开权重 |
| ------------------------------------- | -----------: |
| AA-Briefcase v1.1                     |          15% |
| AutomationBench-AA                    |           5% |
| GDP.pdf                               |           5% |
| FrontierCode 2.0                      |          15% |
| Terminal-Bench 4.0                    |          10% |
| Terminal-Bench-Science 0.1            |          15% |
| CritPt v2 Hard Subset                 |          10% |
| AA-Omniscience v1.1 Accuracy          |          10% |
| AA-Omniscience v1.1 Non-Hallucination |           5% |
| HLE-Diamond                           |          10% |

这是公开方法信息，不是本工具从排名推断出的结果，也没有附带任何模型实测评分。默认演示的六个能力维度是通用虚构维度，不声称是 v5 评测组合。

AA-Omniscience Accuracy 与 Non-Hallucination 是独立组件，不应以其总 index 代替。AA-Briefcase 的官方归一化基于加入指数时冻结的 Elo，再进行指定缩放和截断，不应直接以原始 Elo 与百分比混算。官方具体版本和转换规则以来源页面为准。

本项目统一采用**数据集内 min–max**，不同于官方固定锚点标度，因而相同数字的权重也不代表同样的含义。请不要把实验求解结果贴上“AA 官方权重”标签。若有获授权数据，保留评测版本、配置、日期、源标度信息，避免混用评测条件或版本。
