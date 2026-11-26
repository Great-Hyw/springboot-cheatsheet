# QA 报告：Spring Boot 注解速查站

- 核查员：verifier（独立核查，只读 `src/data`，只写 `tools/**` 与本文档）
- 日期：2026-11-26（最终复跑 15:26，数据定稿 15:25）
- 范围：`src/data/` 全部 6 个数据文件 —— 144 条注解卡片（core 36 / web 36 / data 34 / boot 38）+ 20 篇知识文章（knowledge-a 10 / knowledge-b 10），以及全部官方文档链接
- 真相源：Boot 3.5.16 依赖 jar 经 `javap` 反射提取的注解索引（`tools/annotation-audit/index/annotations.txt`，1109 个注解 / 1062 个简单名）+ Spring 官方 Javadoc / Reference 原文（无二手博客）

## 0. 总体结论：**可发布（pass）**

| 指标 | 结果 |
| --- | --- |
| 自动审计错误 | **0**（修正前曾发现 5 条 404 链接、7 条属性类型/默认值错误，已由作者修复） |
| 自动审计存疑 | **0**（15 条 info 均为「建议级」，见第 6 节，不阻断发布） |
| 官方链接 | **215 / 215 全部 HTTP 200** |
| 人工抽查 | **74 / 164 条 = 45.1%**（要求 40%，超要求） |
| 抽查覆盖 | 6 位作者全部覆盖；9 个注解分类全部覆盖；全部 6 个在用的知识分类覆盖 |
| 人工发现的事实性错误 | **3 条**，均已反馈作者并修复，复跑确认 0 错误（见第 4 节） |

结论：数据已可发布。自动审计（结构、索引事实、属性/默认值/@Target、链接、重复）全部通过；人工抽查发现的 3 处「版本/语义/能力范围」类错误在定稿前已修正；剩余 15 条 info 为 id 命名风格等非阻断建议，建议后续顺手清理。

## 1. 审计工具与复跑方法

| 工具 | 作用 |
| --- | --- |
| `tools/audit.mjs` | 五类校验：schema / 索引事实（package、属性名、类型、默认值、@Target 与用法）/ 链接（白名单 + HTTP 200，带缓存与重试）/ 内容（字数、行数、小节、围栏）/ 重复（id、name、近重复文案），输出 `tools/audit-report.json` |
| `tools/audit-selftest.mjs` | 30 项工具自测（夹具中 14 个预期问题码全部命中，clean 夹具 0/0/0，索引 ≥1109，404 识别） |
| `tools/evidence/fetch-evidence.mjs` | 抓取 18 个官方页面到 `tools/evidence/cache/*.txt` 供人工核对（含 SOURCE / FETCHED 头） |
| `scripts/validate-data.mjs` | Lead 的基础校验（schema/长度/白名单/索引核对），与本审计互补 |

复跑命令（工作目录 `D:\windowsisland\springboot-cheatsheet`）：

```bash
node tools/audit-selftest.mjs --with-links                 # 工具自测，应全绿
node tools/audit.mjs --data-dir src/data --concurrency 8 --timeout 20000 \
     --out tools/audit-report.json                        # 全量审计，exit 0 = 无错误
node scripts/validate-data.mjs                             # Lead 的基础校验
```

判定标准：`tools/audit-report.json` 中 `summary.errors = 0` 且 `summary.linkChecks.failed = 0`，退出码 0。当前结果：`0 错误 / 0 存疑 / 15 建议，215 链接全 OK`。

## 2. 自动审计结果（定稿复跑）

| 文件 | 条目 | 错误 | 存疑 | 建议 |
| --- | ---: | ---: | ---: | ---: |
| annotations-core.json（core + aop） | 36 | 0 | 0 | 9 |
| annotations-web.json（web + validation） | 36 | 0 | 0 | 0 |
| annotations-data.json（data + async） | 34 | 0 | 0 | 3 |
| annotations-boot.json（boot + test + security） | 38 | 0 | 0 | 3 |
| knowledge-a.json | 10 | 0 | 0 | 0 |
| knowledge-b.json | 10 | 0 | 0 | 0 |

定稿前自动审计抓到并已修复的历史问题（记录在案）：

1. **5 条 404 链接**（annotations-web.json：`controller-advice`、`rest-controller-advice`、`exception-handler`、`response-status`、`valid` 指向不存在的 `.../ann-methods/ann-advice.html` 等）：已改为官方实际路径 `.../webmvc/mvc-controller/ann-advice.html`、`.../ann-validation.html`、`.../ann-exceptionhandler.html`，复跑 200。
2. **7 条属性类型/默认值错误**（annotations-web.json 的 7 个 `value` 属性写成 `String[]` / 默认 `{}`）：javap 索引为准应为 `String` / `""`，已全部修正。
3. **索引缺 org.mybatis 包**（`MapperScan` / `MapperScans` 未收录）：Lead 已补扫，索引从 1107 → 1109，审计器重跑通过。

## 3. 人工抽查覆盖率（74 / 164 = 45.1%）

| 文件（作者） | 条目 | 抽查 | 比例 | 覆盖的分类 |
| --- | ---: | ---: | ---: | --- |
| annotations-core.json（content-core） | 36 | 16 | 44% | core 12、aop 4 |
| annotations-web.json（content-web） | 36 | 16 | 44% | web 13、validation 6（跨条重叠） |
| annotations-data.json（content-data） | 34 | 14 | 41% | data 13、async 2 |
| annotations-boot.json（content-boot） | 38 | 17 | 45% | boot 9、test 6、security 4 |
| knowledge-a.json（knowledge-a） | 10 | 5 | 50% | principle、web、data |
| knowledge-b.json（knowledge-b） | 10 | 6 | 60% | boot、web、engineering、migration |
| **合计** | **164** | **74** | **45.1%** | 9 个注解分类全中；知识分类 6/6（test 分类当前无文章） |

抽查方式：逐条读取卡片全部字段（tagline / plain / keyPoints / attributes / example / notes / related / versionNote / docs），官方 Javadoc 与 Reference 原文逐句核对（`tools/evidence/cache/` 本地缓存 + 必要时 `web_fetch` 实页），重点覆盖高风险说法。

## 4. 错误清单（人工抽查发现，3 条，均已修复）

### E1 `annotations-web.json` / `path-variable`（@PathVariable）——版本号错误【已修复】

- 问题：keyPoints / versionNote / 示例注释写「**Spring 6.2 起**支持 `required=false`」「可选路径变量（Spring 6.2+）」。
- 证据：官方 6.2.x Javadoc `PathVariable.required` 的 Element Detail 明确 `Since: 4.3.3 Default: true`；6.1.x Javadoc 的 Optional Element Summary 中已存在该属性。
  <https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/web/bind/annotation/PathVariable.html>
- 修复：作者已改为「Spring 4.3.3 起支持 `required=false`」，示例注释同步修改（2026-11-26 15:19）。

### E2 `annotations-data.json` / `enable-scheduling`（@EnableScheduling）——停机行为方向说反【已修复】

- 问题：notes 原写「应用关闭时**默认等任务跑完**，急停要配 `setWaitForTasksToCompleteOnShutdown`」。
- 证据：`ThreadPoolTaskScheduler` 继承 `ExecutorConfigurationSupport`，字段 `waitForTasksToCompleteOnShutdown` 默认 **false**（已用 `spring-context-6.2.19.jar` 字节码核对：构造器 `iconst_0` 写入该字段）；Javadoc `setWaitForTasksToCompleteOnShutdown`：「Set whether to wait for scheduled tasks to complete on shutdown…」→ 默认 false 即**不等待**。
  <https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/scheduling/concurrent/ExecutorConfigurationSupport.html>
- 修复：作者已改为「默认关机不会等待任务跑完（默认 false）；要优雅停机就设 `setWaitForTasksToCompleteOnShutdown(true)`，再配 `setAwaitTerminationSeconds`」（15:25）。

### E3 `annotations-boot.json` / `mockito-bean`（@MockitoBean）——支持范围写错【已修复】

- 问题：keyPoints 原写「支持字段 / **参数** / 类型级」。
- 证据：Spring Framework 6.2 Javadoc 明确 `@Target({FIELD, TYPE})`，正文只列「非 static 字段」与「类型级（含外层类/接口层级、复合注解）」两种用法，**没有参数级**。
  <https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/test/context/bean/override/mockito/MockitoBean.html>
- 修复：作者已改为「支持字段 / 类型级（含复合注解元注解），按 types 或 name 精确指定」（15:25）。

## 5. 存疑清单（已反馈作者，均已处理或说明；不阻断发布）

| # | 文件 / id | 存疑点 | 处理结果 |
| --- | --- | --- | --- |
| S1 | annotations-boot.json / `mockito-spy-bean` | 原 note「对 final 类和 final 方法无效，这是 Mockito 的限制」——Boot 3.5.16 依赖管理 Mockito 5.17.0（本地 `tools/annotation-audit/lib/mockito-core-5.17.0.jar`），Mockito 5 默认 inline mock maker 可 mock final 类/方法 | **已改**为「Mockito 5 默认用 inline mock maker，final 类和方法也能 spy；若项目显式切回 subclass mock maker 则不行」 |
| S2 | annotations-core.json / `component` | keyPoint「抽象类、private 构造器、非静态内部类都不会成为 Bean」——private 构造器类通常仍可被 Spring 反射实例化（抽象类、非静态内部类确实不会） | **已改**为「被扫描的类要能被实例化：抽象类、接口、非静态内部类都不会被注册成 Bean」 |
| S3 | annotations-core.json / `resource` | keyPoint「只能标在字段或方法上」——`jakarta.annotation.Resource` 的 @Target 为 TYPE/FIELD/METHOD，类级合法，只是 Spring 只对字段/方法执行注入 | **已改**为「常用于字段或 setter 方法；类级 @Target 也合法，但 Spring 只对字段和方法执行注入；不支持构造器参数」 |
| S4 | annotations-boot.json / `configuration-properties` | 原 note「构造器绑定要求类只有一个带参构造器，写多个会绑定失败」略绝对——多个构造器可用 `@ConstructorBinding` 指定 | **已改**为「默认用唯一带参构造器；有多个构造器时可用 @ConstructorBinding 指定」 |
| S5 | annotations-web.json / `post-mapping` | 原 note「GET 请求里拿不到 @RequestBody」稍绝对——GET 也能带请求体，只是浏览器/代理会丢弃 | **已改**为「GET 也能带请求体，但浏览器和多数代理会丢弃，别靠 GET 传数据」 |
| S6 | knowledge-a.json / `aop-proxy` | 原文只讲 Framework 默认「有接口 JDK 代理、无接口 CGLIB」，未提 Spring Boot 默认 `proxyTargetClass=true`（全 CGLIB） | **已补充** CGLIB / `spring.aop.proxy-target-class` 相关说明 |
| S7 | annotations-web.json / validation 系列 | 各条 `since` 统一写「Jakarta Bean Validation 3.0」，但 @Valid/@Past 等约束本身从 Bean Validation 1.0/2.0 就存在（jakarta 命名空间始于 3.0） | 作者保留现写法；**可接受**（since 字段规范允许省略/概述），建议后续区分「注解引入版本」与「Jakarta 命名空间版本」 |
| S8 | annotations-web.json / `positive` | note「float/double 的精度问题可能让极小正数判断异常」无官方依据 | 建议弱化/删除，未改；不影响正确性（语义结论「金额用 BigDecimal」正确） |

## 6. 建议级清单（15 条 info，来自自动审计，不阻断发布）

| 问题码 | 数量 | 文件 / id | 说明与建议 |
| --- | ---: | --- | --- |
| `ID_NAME_MISMATCH` | 11 | annotations-core.json：`afterreturning`、`afterthrowing`、`aliasfor`、`dependson`、`eventlistener`、`postconstruct`、`predestroy`、`transactional-eventlistener`；annotations-data.json：`param-mybatis`、`param-spring-data` | 全站其余 id 均为 kebab-case（规范要求）；这些 id 与注解名推导值不一致（如 `afterreturning` vs `after-returning`）。功能无影响，建议统一为 kebab-case，并全站同步引用 |
| `VERSION_NOTE_NO_VERSION` | 2 | annotations-boot.json：`enable-method-security`、`secured` | versionNote 写的是官方定性结论但无版本号；建议补 `Since: 5.6` / `@Secured legacy` 的版本或明确「官方文档未给具体版本」 |
| `ATTR_FORMAT` | 1 | annotations-boot.json：`with-mock-user` | 某属性 desc 过短（如「密码」）；建议补一句含义/默认值说明 |
| `SAME_NAME_OTHER_PACKAGE` | 1 | annotations-data.json：`param-mybatis` | 与 `org.springframework.data.repository.query.Param` 同名不同包，**合法**；仅提示示例 import 不要混用（已核对两者示例 import 正确） |

## 7. 高风险说法核对记录（节选，均为官方原文）

| 说法 | 结论 | 官方证据 |
| --- | --- | --- |
| @Transactional 默认只对 RuntimeException / Error 回滚，checked Exception 不回滚 | ✓ | `spring-framework/reference/data-access/transaction/declarative/annotations.html`（"Any RuntimeException or Error triggers rollback, and any checked Exception does not"） |
| 自调用、非 public 方法导致事务失效；6.0 起 class-based 代理支持 protected/package-visible | ✓ | 同上（"As of 6.0, protected or package-visible methods can also be made transactional for class-based proxies…"；"only external method calls coming in through the proxy are intercepted"） |
| REQUIRES_NEW 会占用第二条连接，连接池要「比并发线程数至少多 1」 | ✓ | `.../declarative/tx-propagation.html`（"exceeding the number of concurrent threads by at least 1"） |
| @MockBean 自 Boot 3.4.0 废弃、4.0.0 移除，替代为 @MockitoBean | ✓ | Boot 3.5 API Javadoc：`@Deprecated(since = "3.4.0", forRemoval = true)`，说明 for removal in 4.0.0 in favor of @MockitoBean |
| @Async 同类内部调用不经过代理、不会被异步执行 | ✓ | `spring-framework/reference/integration/scheduling.html`（"Local calls within the same class" 不被拦截） |
| @Secured 官方已标为 legacy；@RolesAllowed 默认补 ROLE_ 前缀 | ✓ | `spring-security/reference/servlet/authorization/method-security.html`（"@Secured is a legacy option"）；`Jsr250AuthorizationManager` 的 `rolePrefix` 默认 `ROLE_`（字节码核对） |
| @WebMvcTest 自动配好 MockMvc；classpath 有 Security 时会扫描 WebSecurityConfigurer | ✓ | `spring-boot/3.5/reference/testing/spring-boot-applications.html` |
| version-migration：Boot 3.5 需 Java 17–25 / Framework 6.2.19+；Boot 4.0 需 Java 17–27 / Framework 7.0.11+；Tomcat 10.1（Servlet 6.0）→ 11.0.x（Servlet 6.1） | ✓ | <https://docs.spring.io/spring-boot/3.5/system-requirements.html>、<https://docs.spring.io/spring-boot/4.0/system-requirements.html> |
| JPA 实体要求（@Id 必须、无主键启动报错）、@Version 冲突抛 OptimisticLockException、@Modifying 需事务 | ✓ | Spring Data JPA 官方文档 / Jakarta Persistence 3.1 Javadoc，抽查条目全部一致 |

## 8. 方法与局限

- 自动审计只能验证「结构与索引事实」：字段齐全、类型/默认值/@Target 与 javap 索引一致、示例注解真实、链接可达、重复与字数。语义正确性只能靠人工逐条核对官方文档。
- 人工抽查率 45.1%，覆盖每位作者与每个在用分类；未抽查的 90 条未发现跨条目矛盾（重复/近重复检测为 0），风险较低，但报告不对其逐条语义背书。
- 本机对 GitHub raw / github.com 页面访问被网络策略阻断（curl 返回 000），涉及 Spring 源码的两处结论（`waitForTasksToCompleteOnShutdown` 默认 false、`Jsr250AuthorizationManager` 默认 ROLE_ 前缀）改用「本地依赖 jar 字节码 + 官方 Javadoc」核对；其余全部来自 docs.spring.io / spring-security 官方页面。
- Mockito mock maker 属第三方实现，不在官方白名单来源内；相关结论基于本地 Boot 3.5.16 依赖管理的 Mockito 5.17.0 版本，作者已改为带条件（inline mock maker）的稳妥措辞。

## 9. 验收清单

- [x] 审计脚本可复跑，`tools/audit-report.json` 机器可读
- [x] 6 个数据文件全部扫描（144 注解 + 20 文章）
- [x] 0 错误 / 0 存疑 / 15 建议；215/215 链接 HTTP 200
- [x] ≥60 条人工抽查（实际 74 条，45.1%），全部有官方文档依据
- [x] 发现的 3 条事实性错误已反馈作者并修复
- [x] 本报告给出明确结论：**可发布（pass）**

> 发布前建议：以最新 `src/data` 复跑第 1 节三条命令确认仍为 0 错误；如需完美，可顺手清理第 6 节的 id 命名建议。
## 8. 发布前补充说明（Lead 记录）

- 定稿后按第 6 节建议，把 `annotations-core.json` 中 8 个非 kebab-case 的 id 统一为 kebab-case：`after-returning`、`after-throwing`、`alias-for`、`depends-on`、`event-listener`、`post-construct`、`pre-destroy`、`transactional-event-listener`。只改 id，未改任何文案/属性/示例；改后 `validate-data.mjs` 与 `tools/audit.mjs` 复跑均为 0 错误。
- `param-mybatis` / `param-spring-data` 保留原名：两者是不同包里的同名注解（MyBatis vs Spring Data），有意用 id 区分，并在正文里写明包名。
- 自动审计建议数因此由 15 条降为 7 条：2 条 versionNote 无版本号、1 条属性 desc 过短、3 条 id 风格提示（均为有意命名：param-mybatis/param-spring-data 用于区分不同包的同名注解，enable-aspectj-auto-proxy 比推导出的 enable-aspect-j-auto-proxy 更可读）、1 条同名注解提示；均为非阻断 info。
