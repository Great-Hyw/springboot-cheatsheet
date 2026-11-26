# 实战专题自动审计报告

- 生成时间：2026-11-26T15:29:36.596Z（2026/11/26 23:29:36）
- 数据目录：`src/data`
- 结论：**pass**（错误 0 / 存疑 0 / 建议 2）
- 条目：37（4/4 文件已落盘）

## 文件

| 分块 | 文件 | 已落盘 | 条目/期望 |
| --- | --- | --- | --- |
| conventions | topics-conventions.json | 是 | 10/10 |
| interview | topics-interview.json | 是 | 12/12 |
| layers | topics-layers.json | 是 | 9/9 |
| coordinates | topics-coordinates.json | 是 | 6/6 |

## 问题清单

| 级别 | code | 位置 | 描述 |
| --- | --- | --- | --- |
| info | ANSWER_SENTENCE_COUNT | topics-interview.json / interview-mvc-request-flow | topics-interview.json items[5]: 「一句话答案」句数 1（规范 2–4 句左右，1 句=1 标点） |
| info | ANSWER_SENTENCE_COUNT | topics-interview.json / interview-filter-interceptor | topics-interview.json items[9]: 「一句话答案」句数 1（规范 2–4 句左右，1 句=1 标点） |

## 人工抽查计划（40%，每块≥3 篇）

- conventions / conventions-dependency — 依赖与版本管理规范：用 BOM 管版本，用 starter 收敛
- conventions / conventions-dto-validation — DTO 与参数校验规范：边界校验、业务归位
- conventions / conventions-exception — 统一异常处理规范：错误码、状态码与 RFC 9457
- conventions / conventions-logging — 日志规范：接口、级别、上下文与脱敏
- interview / interview-ioc-bean-lifecycle — IoC 和 Bean 生命周期怎么答？
- interview / interview-transaction-failure — 为什么 @Transactional 会失效？
- interview / interview-circular-dependency — Spring 循环依赖是怎么回事？
- interview / interview-bean-scope — Bean 的作用域有哪些？
- interview / interview-graceful-shutdown — 优雅停机是怎么做的？
- layers / layers-architecture — 分层架构与依赖方向：把代码摆对位置
- layers / layers-dto-conversion — DTO、Entity、VO 到底怎么转换
- layers / layers-repository — Repository 层：数据访问只暴露必要操作
- layers / layers-modularization — 从单体到模块化：包结构怎么演进
- coordinates / coordinates-test — 测试依赖与 Testcontainers
- coordinates / coordinates-ops — 监控与运维：Actuator、指标与打包插件
- coordinates / coordinates-web — Web 与参数校验依赖怎么引
