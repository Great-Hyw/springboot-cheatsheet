# 实战专题内容规范（TOPIC-SPEC）

> 本文件是四个新增专题分块（规范 / 面经 / 分层 / 坐标）的**唯一内容契约**。写之前先读完；与本站原有 `CONTENT-SPEC.md`、`COMMAND-SPEC.md` 同级，互不覆盖。
> 目标：四个分块各自独立、互不混淆；每条内容都能溯源到官方文档或 Maven Central；不允许编造 API、坐标、版本和「面试真题」。

## 1. 四个分块（严格分开）

| 分块 | topic id | 数据文件 | 负责 teammate | 篇数 | 入口 |
| --- | --- | --- | --- | --- | --- |
| Spring Boot 开发规范 | `conventions` | `src/data/topics-conventions.json` | content-boot | 10 | `/topics/conventions` |
| 面试高频题（面经） | `interview` | `src/data/topics-interview.json` | knowledge-a | 12 | `/topics/interview` |
| 现代企业分层写法 | `layers` | `src/data/topics-layers.json` | knowledge-b | 9 | `/topics/layers` |
| 常用 Maven 包坐标用法 | `coordinates` | `src/data/topics-coordinates.json` | content-data | 6 | `/topics/coordinates` |

红线：
- **只能写自己负责的那一个 JSON 文件**，不要动别人的文件、不要动前端代码、不要动 `src/data/*.json` 里已有的注解/知识/命令数据。
- 四个分块内容不得互相混：规范里讲「怎么约定」，面经里讲「面试怎么答」，分层里讲「每层代码怎么写」，坐标里只讲「依赖怎么引、版本谁管、配置怎么写」。不要把坐标表塞进分层文章，也不要把面试答案塞进规范。
- 文件顶层必须写 `"topic": "<topic id>"`，`"generatedBy": "<你的名字>"`。

## 2. JSON 结构

```json
{
  "generatedBy": "content-boot",
  "topic": "conventions",
  "items": [ { ... } ]
}
```

### 2.1 通用字段（四个分块都必填）

| 字段 | 类型 | 要求 |
| --- | --- | --- |
| `id` | string | 全站唯一，必须 `topic 前缀 + kebab-case`，例如 `conventions-constructor-injection`、`interview-transaction-failure`。只能用规范里列出的 id。 |
| `title` | string | 中文标题，8–30 字，不用问号堆叠（面经可用问句）。 |
| `level` | string | `入门` 或 `进阶` |
| `readingMinutes` | number | 2–10 的整数 |
| `summary` | string | 一句话摘要，≤60 个汉字，讲清「这篇解决什么问题」 |
| `tags` | string[] | 2–5 个，短标签 |
| `content` | string | Markdown 正文，见各分块要求；用 `\n` 换行；代码块用 ``` 围栏并标注语言 |
| `sources` | object[] | 1–3 条 `{label,url}`，url 必须属于白名单域名且**你亲自打开过、HTTP 200** |

### 2.2 坐标分块额外字段（只有 `coordinates` 用）

```json
"coordinates": [
  {
    "groupId": "org.springframework.boot",
    "artifactId": "spring-boot-starter-web",
    "version": null,
    "managed": true,
    "scope": null,
    "usage": "写 REST 接口、内嵌 Tomcat、Jackson JSON"
  }
]
```

- `coordinates` 每篇 4–12 条；`groupId` / `artifactId` 必须真实存在（见第 4 节核验方法）。
- `managed: true` 表示版本由 Spring Boot BOM 管理，`version` 必须为 `null`；`managed: false` 时 `version` 必填，且必须是 Maven Central 上真实发布过的版本。
- `usage` 一句话说明这个依赖用来干什么（≤40 字）。
- 正文里仍然要有一张 Markdown 表格或清单，把上面的坐标按用途归类讲清楚，不能只丢一个 JSON 数组。

## 3. 各分块的正文要求

### 3.1 conventions（Spring Boot 开发规范）

每篇固定 3 个二级小节，标题必须完全一致，顺序一致：

```
## 推荐做法
## 为什么
## 落地检查清单
```

- `推荐做法`：先给结论，再用 1–3 段解释；至少给 1 段可复制的代码/配置示例。
- `为什么`：讲清取舍（官方推荐理由、团队协作收益、不这么做会怎样），至少 1 条官方依据。
- `落地检查清单`：3–6 条可勾选条目，用 `- [ ]` 列表。
- 正文汉字数（去空白）600–1400。

10 篇与 id（顺序即展示顺序）：

1. `conventions-project-structure` 项目与包结构规范
2. `conventions-constructor-injection` 依赖注入规范：优先构造器注入
3. `conventions-configuration` 配置管理规范
4. `conventions-rest-api` REST 接口设计规范
5. `conventions-dto-validation` DTO 与参数校验规范
6. `conventions-exception` 统一异常处理规范
7. `conventions-transaction` 事务使用规范
8. `conventions-logging` 日志规范
9. `conventions-testing` 测试规范
10. `conventions-dependency` 依赖与版本管理规范

### 3.2 interview（面试高频题）

每篇固定 4 个二级小节，标题必须完全一致，顺序一致：

```
## 一句话答案
## 展开讲
## 追问与加分点
## 别踩的坑
```

- `一句话答案`：2–4 句，先给能过面试的结论，不绕圈。
- `展开讲`：300 字以上，讲机制/流程/源码级要点（点到为止，不贴大段源码），必要时配 5–15 行代码或时序步骤。
- `追问与加分点`：2–4 条，写面试官可能追问什么、怎么答。
- `别踩的坑`：2–4 条常见错误回答或误解。
- 正文汉字数（去空白）600–1400。
- **禁止**写「某公司真题」「内部面经」「必考题」这类无法证实的表述；统一按「常见面试题」处理，答案必须能指到官方文档。

12 篇与 id：

1. `interview-auto-configuration` 自动配置是怎么生效的？
2. `interview-ioc-bean-lifecycle` Bean 生命周期与三级缓存
3. `interview-circular-dependency` 循环依赖怎么解决？什么时候解决不了？
4. `interview-aop-proxy` AOP 原理与代理失效
5. `interview-transaction-failure` @Transactional 为什么会失效？
6. `interview-mvc-request-flow` 一个请求在 Spring MVC 里经历了什么？
7. `interview-starter-principle` starter 的原理？怎么自定义 starter？
8. `interview-config-priority` 配置加载优先级
9. `interview-bean-scope` Bean 作用域与线程安全
10. `interview-filter-interceptor` Filter、Interceptor、AOP 的区别
11. `interview-async-threadpool` @Async 线程池怎么配？坑在哪？
12. `interview-graceful-shutdown` 如何优雅停机？Actuator 端点怎么用？

### 3.3 layers（现代企业分层写法）

每篇固定 3 个二级小节，标题必须完全一致，顺序一致：

```
## 这一层负责什么
## 怎么写
## 边界与常见错误
```

- `这一层负责什么`：职责边界、不该做的事。
- `怎么写`：至少 1 段真实可运行的代码骨架（Controller/Service/Repository/DTO 等按篇目），配 2–4 条要点。
- `边界与常见错误`：3–5 条，写清跨层调用、事务边界、异常转换等错误做法。
- 正文汉字数（去空白）600–1400。
- 示例代码只允许使用 Spring / Jakarta / MyBatis / JPA 真实存在的注解和类型；不要发明方法名、不要写无法编译的伪代码。

9 篇与 id：

1. `layers-architecture` 分层架构与依赖方向
2. `layers-controller` Controller 层怎么写
3. `layers-service` Service 层怎么写
4. `layers-repository` Repository/DAO 层怎么写
5. `layers-dto-conversion` DTO、Entity、VO 怎么转换
6. `layers-exception-errorcode` 统一异常与错误码设计
7. `layers-transaction-boundary` 事务边界放在哪一层
8. `layers-common-module` 公共模块与工具类的边界
9. `layers-modularization` 从单体到模块化：包结构演进

### 3.4 coordinates（常用 Maven 坐标用法）

每篇固定 3 个二级小节，标题必须完全一致，顺序一致：

```
## 什么时候用
## 坐标清单
## 配置与坑
```

- `什么时候用`：1–2 段，讲这一组依赖解决什么问题、什么项目该引。
- `坐标清单`：正文里用 Markdown 表格列 4–12 行（列：依赖 / 用途 / 版本），与 `coordinates` 字段一一对应。
- `配置与坑`：至少 1 段 YAML/Java 配置示例，2–4 条常见坑。
- 正文汉字数（去空白）350–1400；表格和代码不计入汉字数没关系，但正文不能只剩表格。

6 篇与 id：

1. `coordinates-web` Web 与参数校验
2. `coordinates-data` 数据访问
3. `coordinates-security` 安全认证
4. `coordinates-test` 测试
5. `coordinates-ops` 监控与运维
6. `coordinates-utils` 映射与工具

每组建议覆盖（按需增删，但必须真实）：

- web：spring-boot-starter-web、spring-boot-starter-validation、springdoc-openapi-starter-webmvc-ui、spring-boot-devtools
- data：spring-boot-starter-data-jpa、spring-boot-starter-jdbc、mybatis-spring-boot-starter、mysql-connector-j、spring-boot-starter-data-redis、flyway-core / liquibase-core
- security：spring-boot-starter-security、spring-boot-starter-oauth2-resource-server、spring-boot-starter-oauth2-client
- test：spring-boot-starter-test、spring-boot-testcontainers、testcontainers 的 mysql/junit-jupiter、h2
- ops：spring-boot-starter-actuator、micrometer-registry-prometheus、spring-boot-maven-plugin
- utils：lombok、mapstruct、mapstruct-processor（注意 Lombok 与 MapStruct 的注解处理器顺序）

## 4. 反瞎写规则（最重要）

1. **坐标必须真实**：写进 `coordinates` 的每一组 `groupId:artifactId`，必须能在 Maven Central 找到：
   - 检查 URL：`https://repo1.maven.org/maven2/<groupId 把 . 换成 />/<artifactId>/maven-metadata.xml`
   - 例如 `org.springframework.boot:spring-boot-starter-web` → `https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-web/maven-metadata.xml`
   - 返回 200 才算存在；404 立刻删掉或改正。版本号不确定就写 `managed: true`（Boot BOM 管理）或省略具体版本，**不要编版本号**。
2. **规范要有官方依据**：优先引用 Spring Boot 参考文档（docs.spring.io/spring-boot/3.5/...）、Spring Framework 参考文档（docs.spring.io/spring-framework/reference/6.2/...）、Spring 官方指南/项目页；不要引用博客、公众号、CSDN、掘金、知乎。
3. **面试答案只依据官方文档**，不写「我面过」「某大厂原题」；不确定的细节宁可不写，不要编数字、编源码行为。
4. **示例代码必须能编译**：只用真实存在的注解/类/方法；如果写了 `@Transactional(propagation = Propagation.REQUIRES_NEW)`，要确认枚举常量真实存在。
5. **版本口径**：与本站一致，主线 Spring Boot 3.5.x / Spring Framework 6.2.x；提到 Boot 4 的地方必须是官方明确可证的差异，否则不要提。
6. **不要跨块搬运**：同一段话不要同时出现在规范与分层里；面经的「展开讲」也不要整段抄知识库文章（可以引用并链接，但要重写）。

## 5. 来源白名单

`docs.spring.io`、`spring.io`、`github.com/spring-projects`（只允许 spring-projects 组织，任意仓库会被校验脚本判错）、`jakarta.ee`、`hibernate.org`、`mybatis.org`、`maven.apache.org`、`repo1.maven.org`、`micrometer.io`、`testcontainers.com`、`projectlombok.org`、`mapstruct.org`、`flywaydb.org`、`liquibase.org`、`redis.io`、`martinfowler.com`、`12factor.net`。

Git 命令、Linux 命令属于另一个模块（`/commands`），本专题不写。

## 6. 完成标准（每篇都过）

- [ ] JSON 能被 `JSON.parse`，`topic` / `generatedBy` 正确，`items` 数量与篇目清单一致
- [ ] 所有 id 与清单完全一致，没有多余、没有缺失
- [ ] 正文 3–4 个 `##` 小节且标题与本文档一致
- [ ] 汉字数在区间内；summary ≤60 字；tags 2–5；sources 1–3 且域名在白名单
- [ ] `node scripts/validate-topics.mjs` 输出 0 错误（会检查 schema、id、长度、章节标题、坐标格式与跨块污染）
- [ ] 每条 source 链接自己 curl 过是 200；coordinates 每条坐标自己按第 4 节方法查过是 200
- [ ] 不写「某公司真题」「必考」「全网最全」这类话术

## 7. 汇报格式（写完发回给 Lead）

```
完成 <topic>：N 篇
id 列表：...
validate-topics：0 errors / 0 warnings
链接：M 条 curl 200
坐标：K 组均 200（仅 coordinates）
存疑/没把握的地方：...
```