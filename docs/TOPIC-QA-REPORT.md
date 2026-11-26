# 实战专题模块独立核查报告（task-16）

- 核查人：verifier（独立于 content-boot / knowledge-a / knowledge-b / content-data 四位作者）
- 核查日期：2026-11-26
- 核查对象：`src/data/topics-*.json` 共 4 个分块、37 篇（conventions 10、interview 12、layers 9、coordinates 6）
- 验收要求：全量自动审计（schema / sources 链接 HTTP 200 / Maven 坐标真实存在 / 跨块污染）+ 人工抽查 ≥40%、每块 ≥3 篇；每条判定附官方依据链接
- 最终结论：**可发布（pass）** —— 自动审计 0 错误 / 0 存疑 / 2 条 info；人工抽查 16/37 = 43.2%（4 个分块全覆盖）；发现 3 处问题（2 处合规 + 1 处措辞不准确），作者均已修复并经本工具/原文复核

## 一、总体结论

| 维度 | 结果 |
| --- | --- |
| 自动审计（离线，修复后） | 4/4 文件、37 条；**0 错误、0 存疑、2 建议**；verdict = pass |
| 自动审计（联网） | sources 去重 **66/66 返回 HTTP 200**；Maven 坐标 **30/30 metadata 200**，5 个显式版本均在发布列表 |
| 人工抽查 | **16/37 = 43.2%**（conventions 4/10、interview 5/12、layers 4/9、coordinates 3/6） |
| 事实错误 | 4 个分块均未发现编造 API、错误机制或版本误标；3 处问题均为规范/措辞层面（github 白名单、title 超长、/error 默认字段表述），均已修复 |
| 跨块污染 | 未发现跨分块搬运：坐标表只出现在 coordinates；面试答案只出现在 interview；分层代码只出现在 layers |
| 结论 | **pass（可发布）** |

## 二、自动审计

工具：`tools/topics-audit/audit.mjs`（Node ESM，无额外依赖；另含 `tools/topics-audit/selftest.mjs` 28 项自测，全部通过）。

覆盖的检查项：

- 文件级：文件存在、JSON 可解析、`topic` 与文件对应、`generatedBy` 与规范作者一致、条目数、多余 `topics-*.json`；
- 条目级：id 属于规范清单且全局唯一、title 8–30 字、level、readingMinutes、summary ≤60 汉字、tags 2–5、正文汉字 600–1400（coordinates 350–1400）、固定小节标题及顺序、代码围栏语言、conventions 检查清单 ≥3 条、interview「展开讲」≥300 字（按去代码可见字符）、coordinates 表格与数组一一对应；
- sources：1–3 条、https、非首页、白名单域名、github 仅允许 `spring-projects` 组织、重复 URL；
- coordinates：groupId/artifactId 真实、managed 与 version 规则（managed=true → version=null；managed=false → version 必填且在 Maven Central 发布列表）、scope、usage、重复坐标；
- 内容安全：禁用话术（某公司真题 / 内部面经 / 必考题 等）、营销词、跨块污染、同文件/跨分块近重复、与 knowledge-a/b 的段落级复制；
- 抽样：每块 40% 且至少 3 篇（确定性 fnv1a），共 16 篇。

运行结果（2026-11-26，数据为作者修复后的 23:27 版本）：

| 项目 | 数值 |
| --- | --- |
| 文件 / 条目 | 4 / 37 |
| 错误 | 0 |
| 存疑（warning） | 0 |
| 建议（info） | 2（interview 两条「一句话答案」仅 1 句，属文风提示，不阻断） |
| 链接检查 | 66 条去重 URL，200 = 66、不可达 0、失败 0 |
| 坐标检查 | 30 组，200 = 30、缺失 0；其中 25 组 BOM 管理（version=null）、5 组显式版本全部在 `maven-metadata.xml` 版本列表内 |
| 抽样 | 16 条 |

数据规模参考：conventions 汉字 604–679、interview 601–742、layers 602–719、coordinates 350–383；interview 各篇「展开讲」去代码可见字符 346–970，均满足 300 字要求。

## 三、人工抽查覆盖（16/37 = 43.2%）

每篇均完整阅读正文、代码块、sources，并对关键机制/API 逐一对照官方文档（链接见第四节）。

| 分块 | 篇数 | 抽查 | 覆盖 | 抽查 id | 结论 |
| --- | --- | --- | --- | --- | --- |
| conventions（content-boot） | 10 | 4 | 40% | dependency、dto-validation、exception、logging | 通过（1 条建议） |
| interview（knowledge-a） | 12 | 5 | 41.7% | ioc-bean-lifecycle、transaction-failure、circular-dependency、bean-scope、graceful-shutdown | 通过 |
| layers（knowledge-b） | 9 | 4 | 44.4% | architecture、repository、dto-conversion、modularization | 通过 |
| coordinates（content-data） | 6 | 3 | 50% | web、test、ops | 通过（2 处已修复） |

逐篇要点：

- `conventions-dependency`：parent 继承 / BOM 导入 / starter 收敛 / 不写 version —— 与 Spring Boot 构建系统文档一致；示例 `3.5.0` 是真实发布版本。
- `conventions-dto-validation`：record DTO + jakarta 约束 + `@Valid` 级联 + `@Validated` 分组 + 类级 `@Validated` 触发方法级校验 —— 与 Spring Framework Bean Validation 文档一致；两类异常（MethodArgumentNotValidException / ConstraintViolationException）区分正确。
- `conventions-exception`：`@RestControllerAdvice` + `ProblemDetail`；官方文档原文确认「可以从任意 `@ExceptionHandler` 或 `@RequestMapping` 方法返回 `ProblemDetail` 或 `ErrorResponse`」并能渲染 `application/problem+json`；`ProblemDetail.forStatusAndDetail` 在 6.2 Javadoc 中真实存在（Since 6.0）。**建议级**：默认 `/error` 不含异常 message。
- `conventions-logging`：Spring Boot 内部用 Commons Logging、starter 默认 Logback；SLF4J 占位符、异常作最后参数、MDC 不跨线程、`logging.file.name` / `logging.level.*` 均正确。
- `interview-ioc-bean-lifecycle`：生命周期顺序（BPP before → `@PostConstruct` → `afterPropertiesSet` → init-method → BPP after）、销毁顺序、原型不销毁、`@PostConstruct` 内自调用事务/异步不生效 —— 与 Spring 文档一致。
- `interview-transaction-failure`：代理拦截、自调用、bean 未托管、可见性（6.0 起 class-based 代理支持 protected/包可见，interface-based 必须 public）、默认回滚规则、REQUIRES_NEW 独立事务与连接池风险、catch 后不抛/rollback-only 导致 UnexpectedRollbackException —— 与事务章节一致。
- `interview-circular-dependency`：三级缓存（singletonObjects / earlySingletonObjects / singletonFactories）、构造器注入无法解循环、Boot 2.6 起 `spring.main.allow-circular-references` 默认 false、`@Lazy` 代理延迟取真身、prototype 无解 —— 与官方文档及源码一致。
- `interview-bean-scope`：singleton/prototype/request/session/application/websocket 语义；`@RequestScope` 默认 `ScopedProxyMode.TARGET_CLASS`；单例注入 prototype 用 `ObjectProvider`/`@Lookup`/作用域代理 —— 与 Bean Scopes 文档一致。
- `interview-graceful-shutdown`：Boot 3.5 对 Jetty/Reactor Netty/Tomcat/Undertow 默认开启；Undertow 接受连接但立即 503；作为 SmartLifecycle 最早停止阶段执行；`spring.lifecycle.timeout-per-shutdown-phase`；IDE 停止不发 SIGTERM —— **官方页面逐句可证**。
- `layers-architecture`：分层职责、单向依赖、按业务能力建包、构造器注入、Entity 不出边界 —— 与 Fowler 分层文与 Boot 代码组织文档一致。
- `layers-repository`：派生查询 `findByStatusOrderByCreatedAtDesc`、`@Query` + `@Param` JPQL、MyBatis `@Mapper`/`@Select`/`@Insert`、`@Modifying` 需事务（继承的 `save` 自带事务）、`Pageable`/`Page`、`#{}` 预编译 vs `${}` 拼接、N+1 与 `@EntityGraph` —— 均与 Spring Data JPA / MyBatis-Spring 文档一致。
- `layers-dto-conversion`：Entity/DTO/VO 分离、record + 静态工厂、MapStruct `@Mapper(componentModel = "spring")`、`BeanUtils.copyProperties` 运行期静默丢值风险、响应对象不可变 —— 与 MapStruct 文档一致。
- `layers-modularization`：api/internal 包边界、跨模块只走 api、事件解耦、`ApplicationModules.of(ShopApplication.class).verify()` —— Spring Modulith 公开 API 与文档一致。
- `coordinates-web`：web/validation/devtools/webflux starter 选择；Boot 2.3 起 validation 不再随 web 传递；springdoc 2.8.x 对应 Boot 3.x；`spring.mvc.problemdetails.enabled` 真实属性。
- `coordinates-test`：starter-test 内容、`spring-boot-testcontainers` + `org.testcontainers:mysql` + `junit-jupiter`、`@ServiceConnection`（Boot 3.1+）、`@Testcontainers(disabledWithoutDocker = true)`、H2 test scope —— 均正确；「Testcontainers 版本由 Boot BOM 间接引入的 testcontainers-bom 管理」经 3.5.16 POM 证实（import testcontainers-bom）。
- `coordinates-ops`：actuator 默认只暴露 health、prometheus registry 需显式引入、`show-details`、`management.endpoints.web.base-path`、`spring-boot-maven-plugin` repackage —— 正确；Micrometer 由 Boot BOM 的 micrometer-bom 管理，经 POM 证实。

## 四、问题清单

### 已修复（3 条，作者修复后 verifier 复核；E1/E2 由 content-data、S1 由 content-boot）

| 编号 | 文件 / id | 问题 | 证据 | 修复与复核 |
| --- | --- | --- | --- | --- |
| E1（错误·白名单） | `topics-coordinates.json` / `coordinates-web` | sources 含 `https://github.com/springdoc/springdoc-openapi`，TOPIC-SPEC §5 只允许 `github.com/spring-projects` 组织 | https://github.com/springdoc/springdoc-openapi （非 spring-projects） | 已更换为 `https://repo1.maven.org/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/`（repo1.maven.org 白名单，实测 200）；复跑 0 错误 |
| E2（存疑·长度） | `topics-coordinates.json` / `coordinates-test` | title「测试依赖：starter-test 与 Testcontainers」可见字符 32 > 规范 8–30 | TOPIC-SPEC §3 通用字段 title 8–30 字 | 已改为「测试依赖与 Testcontainers」（19 字符），复跑通过 |
| S1（建议·措辞） | `topics-conventions.json` / `conventions-exception` | 原文「机器客户端会收到包含状态和异常信息的 JSON」易被理解为默认带异常 message | Spring Boot 3.5 application-properties：`server.error.include-message` 默认 `never`、`include-exception` 默认 `false`、`include-stacktrace` 默认 `never`：https://docs.spring.io/spring-boot/3.5/appendix/application-properties/index.html | 已改为「包含状态和路径的 JSON；异常 message 与堆栈默认不返回，需要通过 server.error.include-message、server.error.include-stacktrace 显式打开」。已抽查原文确认改写到位，正文汉字 637 仍在区间；复跑自动审计仍 0 错误 |

### 信息（2 条，不处理）

| 编号 | 文件 / id | 说明 |
| --- | --- | --- |
| I1 | `topics-interview.json` / `interview-mvc-request-flow` | 「一句话答案」仅 1 句（规范建议 2–4 句，属文风提示） |
| I2 | `topics-interview.json` / `interview-filter-interceptor` | 同上 |

## 五、高风险说法核对记录

| # | 说法（抽查条目） | 判定 | 官方依据 |
| --- | --- | --- | --- |
| 1 | Boot 3.5 对 Jetty/Reactor Netty/Tomcat/Undertow 默认开启优雅停机，且是 SmartLifecycle 最早停止阶段 | ✅ 正确（原文一字不差） | https://docs.spring.io/spring-boot/3.5/reference/web/graceful-shutdown.html |
| 2 | Undertow 优雅停机时接受新连接但立即返回 503；Jetty/Netty/Tomcat 在网络层拒绝 | ✅ 正确 | 同上（"Undertow will accept new connections but respond immediately with a service unavailable (503) response"） |
| 3 | `ProblemDetail` 按 RFC 9457 渲染，可从 `@ExceptionHandler`/`@RequestMapping` 返回，含 `application/problem+json` | ✅ 正确 | https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-ann-rest-exceptions.html |
| 4 | `ProblemDetail.forStatusAndDetail(HttpStatusCode, String)` 存在 | ✅ 正确（Since 6.0） | https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/http/ProblemDetail.html |
| 5 | Boot 2.6 起循环依赖默认禁止（`spring.main.allow-circular-references=false`） | ✅ 正确 | Spring Boot 2.6 Release Notes / Common Application Properties |
| 6 | `springdoc-openapi-starter-webmvc-ui:2.8.17` 为真实发布版本，2.8.x 对应 Boot 3.x | ✅ 正确（maven-metadata 含 2.8.17，200） | https://repo1.maven.org/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/maven-metadata.xml |
| 7 | Testcontainers 各模块版本由 Boot BOM「间接引入的 testcontainers-bom」管理 | ✅ 正确 | https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-dependencies/3.5.16/spring-boot-dependencies-3.5.16.pom （`testcontainers-bom` import；`testcontainers.version` = 1.21.4） |
| 8 | Micrometer 版本由 Boot BOM 的 micrometer-bom 管理 | ✅ 正确 | 同上 POM（`micrometer-bom` import） |
| 9 | `@ServiceConnection` 是 Boot 3.1 起能力 | ✅ 正确 | https://docs.spring.io/spring-boot/3.5/reference/testing/testcontainers.html |
| 10 | Spring Modulith 用 `ApplicationModules.of(...).verify()` 校验模块边界 | ✅ 正确 | https://docs.spring.io/spring-modulith/reference/fundamentals.html |
| 11 | `@Modifying` 查询需 `@Transactional`，继承的 `save` 自带事务 | ✅ 正确 | https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html 等 |
| 12 | `@RequestScope` 默认 `proxyMode = ScopedProxyMode.TARGET_CLASS` | ✅ 正确 | Spring Framework Javadoc（RequestScope） |

未发现编造 API、不存在的坐标、错误版本号或把「官方推荐」写成事实的情况；四块之间无搬运（坐标表只在 coordinates，面试语气只在 interview，分层代码只在 layers）。

## 六、方法与局限

- 自动审计覆盖结构、白名单、链接可达性、坐标发布状态、重复与污染的**机械可判定部分**；语义正确性由人工抽查负责。
- 人工抽查 16/37（43.2%），超过 40% 要求且每块 ≥3 篇；未抽查的 21 篇经同作者、同模板与自动检查覆盖，仍存在未发现语义问题的风险。
- 链接与坐标均在 2026-11-26 实测；Maven Central / docs.spring.io 的后续变更不在本次结论范围内。
- 只读 `src/data`，未修改任何数据文件；所有问题通过消息反馈作者并由作者修改。

## 七、复跑命令与产物

```bash
# 自测（28 项断言，全绿）
node tools/topics-audit/selftest.mjs

# 全量自动审计（离线结构检查，复用链接/坐标缓存）
node tools/topics-audit/audit.mjs

# 全量自动审计（联网核 sources 200 与 Maven 坐标，强制刷新缓存）
node tools/topics-audit/audit.mjs --check-links --check-coords --refresh-cache
```

- 报告：`tools/topics-audit/report.json`（含 summary / perFile / sample / linkChecks / coordChecks / issues）
- 缓存：`tools/topics-audit/.cache/links.json`、`tools/topics-audit/.cache/coords.json`
- 人工核查材料：`tools/topics-audit/review/{conventions,interview,layers,coordinates}.review.md`
- 退出码：0 = 无错误；1 = 有错误；2 = 运行失败

## 八、结论

四个分块 37 篇在结构、来源、坐标与语义四个层面均通过核查；3 处问题（2 处合规 + 1 处措辞）已全部由作者修复并经本工具/原文复核，复跑自动审计 0 错误 / 0 存疑 / 2 条 info。**本模块可发布**。