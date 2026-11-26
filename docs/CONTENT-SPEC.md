# Spring Boot 注解速查站 — 内容生产规范 v1.0

> 本文件是内容作者的唯一事实契约。写任何一条内容前先读完。
> 目标：不做「网上抄来的一坨名词解释」，而是**准确、细致、说人话、可溯源**的速查卡。

---

## 0. 项目定位

- 面向：刚学 Spring Boot 的 Java 开发者、需要查注解的老手。
- 语言：简体中文。**先说人话，再给专业术语**；术语第一次出现必须顺手解释。
- 版本主线：**Spring Boot 3.5.x / Spring Framework 6.2.x**（jakarta.* 命名空间）。
- 允许并鼓励在 `versionNote` 里注明 Spring Boot 4.x 的变化，但**必须来自官方文档**，不许猜。
- 每一条注解必须给出 1–2 个官方文档链接（见 §5 白名单）。

## 1. 反瞎写铁律（最重要）

1. **属性只能写真实存在的**。`attributes` 里的每个 name 必须能在官方 Javadoc 或 `tools/annotation-audit/index/*.txt`（由 Lead 生成，含 javap 结果）里查到。查不到 → 删掉，不要「大概应该有个」。
2. **包名必须精确**。`package` 字段写全限定名；不确定就去 Javadoc 页面标题或 jar 索引里核对。
3. **不要在示例里发明 API**。`JpaRepository` 的派生查询方法名要符合命名规则；`MockMvc`、`RestTemplate`、`SecurityFilterChain` 等 API 必须真实存在于 6.2 / 3.5 版本。拿不准就写最小示例，不写花活。
4. **`since` 只在有把握时写**。不确定就省略该字段（它是可选的）。不要编「Spring 5.3 新增」这种年份/版本。
5. **效果描述必须有出处**。例如「@Transactional 默认只对 RuntimeException 回滚」这类结论，必须能在官方文档找到依据。
6. **禁止复制营销话术**。不要「业界最强」「必须掌握」这种空话；写清楚「解决什么问题、什么时候用、什么时候别用」。
7. **版本差异必须核实**。例如 `@MockBean` 在 Boot 3.4 标记废弃、Boot 4.0 移除（以官方迁移文档为准）；jakarta 命名空间自 Boot 3.0 起。写进 `versionNote` 前先查。

## 2. 交付物与文件归属（严格只写自己那份）

| 角色 | 只允许写 | 内容 |
|---|---|---|
| content-core | `src/data/annotations-core.json` | core（IoC/DI/Bean/事件/资源）+ aop 分类，约 32 条 |
| content-web | `src/data/annotations-web.json` | web + validation 分类，约 34 条 |
| content-data | `src/data/annotations-data.json` | data + async 分类，约 32 条 |
| content-boot | `src/data/annotations-boot.json` | boot + test + security 分类，约 34 条 |
| knowledge-a | `src/data/knowledge-a.json` | 9 篇知识文章（核心原理 / Web / 数据） |
| knowledge-b | `src/data/knowledge-b.json` | 9 篇知识文章（Boot / 测试 / 工程实践 / 版本升级） |
| verifier | `docs/QA-REPORT.md`、`tools/**` | 核查报告与审计脚本（不改内容文件） |

**不要**改 `src/components/**`、`src/views/**`、`package.json`、路由等前端代码；不要写 README。数据文件不存在就新建（JSON 数组即可？不——见 §3 的对象结构）。

## 3. 注解条目 JSON 结构（`annotations-*.json`）

文件顶层是一个对象：

```json
{
  "generatedBy": "content-core",
  "items": [ /* 条目数组，见下 */ ]
}
```

单条注解（字段除 `since` / `versionNote` 外均必填）：

```json
{
  "id": "component",
  "name": "@Component",
  "category": "core",
  "subcategory": "Bean 注册",
  "package": "org.springframework.stereotype.Component",
  "since": "Spring 2.0",
  "level": "入门",
  "tagline": "把一个普通类交给 Spring 托管",
  "plain": "你在类上写 @Component，等于告诉 Spring：启动时扫描到这个类，就 new 一个实例放进容器，之后谁需要它，Spring 负责递过去。@Service、@Repository、@Controller 本质上都是它的「马甲」，只是语义更明确，方便人和工具识别分层。",
  "keyPoints": [
    "只能标在类上（含注解类型、接口上一般无效），扫描由 @ComponentScan 或 @SpringBootApplication 触发。",
    "默认 Bean 名是类名首字母小写；显式写 @Component(\"myBean\") 可覆盖。",
    "它只负责「注册 Bean」，不负责注入依赖；注入用 @Autowired 或构造器。",
    "被扫描的类必须能被 Spring 实例化（非 private 构造器、非抽象类）。"
  ],
  "attributes": [
    { "name": "value", "type": "String", "default": "\"\"", "desc": "Bean 名称。不写则用类名首字母小写。" }
  ],
  "exampleTitle": "最小可用示例",
  "example": "import org.springframework.stereotype.Component;\n\n@Component\npublic class EmailSender {\n    public void send(String to) {\n        System.out.println(\"send mail to \" + to);\n    }\n}\n\n// 使用方：构造器注入（推荐）\n// @Service\n// public class UserService {\n//     private final EmailSender emailSender;\n//     public UserService(EmailSender emailSender) { this.emailSender = emailSender; }\n// }",
  "notes": [
    "@Component 与 @Bean 的区别：前者让 Spring 扫描「自己的类」，后者在配置类里手动注册「第三方类」的实例。",
    "同类/同包被扫描到才会生效；启动类所在包是默认扫描根，放到子包之外不会被扫到。"
  ],
  "related": ["@Service", "@Repository", "@ComponentScan", "@Bean"],
  "versionNote": null,
  "docs": [
    { "label": "Spring 官方：Classpath Scanning and Managed Components", "url": "https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html" }
  ],
  "tags": ["Bean", "组件扫描", "IoC"]
}
```

硬性要求：

- `id`：全站唯一，小写 kebab-case，与注解名对应（如 `request-mapping`、`conditional-on-class`）。
- `name`：带 `@`，与真实注解同名。
- `category`：只能是 §4 的 id。
- `subcategory`：2–8 个字的自拟分组，同分类内保持一致。
- `package`：真实全限定名。
- `level`：`"入门"` 或 `"进阶"`。
- `tagline`：≤ 22 个汉字，一眼看懂「它是干嘛的」。
- `plain`：80–200 字，**大白话**，讲清楚「解决什么问题 / 什么时候会用到 / 不用会怎样」，可以打比方。
- `keyPoints`：3–5 条，每条 1–2 句，要有细节（默认值、生效条件、易混点），不要复读 tagline。
- `attributes`：0–8 条，只写真属性。没有属性就 `[]`。`default` 用真实默认值；无默认写 `"—"`。
- `example`：真实 Java 代码字符串（用 `\n` 换行，不要 ``` 围栏），15–40 行。能独立看懂；用到的注解建议写 import。注释中文。
- `notes`：2–4 条易错点 / 实践建议，必须有信息量。
- `related`：2–5 个真实注解名（带 @，可跨分类）。
- `versionNote`：`null` 或一句版本差异（Boot 4.x / Framework 7 的变化），必须核实。
- `docs`：1–2 条，见白名单。
- `tags`：2–5 个中文或英文检索词。

## 4. 分类（固定，不可新增）

| id | 名称 | 负责角色 |
|---|---|---|
| `core` | 核心容器 | content-core |
| `aop` | 切面编程 | content-core |
| `web` | Web 与 REST | content-web |
| `validation` | 参数校验 | content-web |
| `data` | 数据访问 | content-data |
| `async` | 异步与定时 | content-data |
| `boot` | Spring Boot | content-boot |
| `test` | 测试 | content-boot |
| `security` | 安全 | content-boot |

## 5. 官方来源白名单（`docs` 字段）

只允许下面这些域名，且用具体页面而非首页：

- `https://docs.spring.io/spring-framework/reference/...`（Spring Framework 6.2 文档）
- `https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/...`（Javadoc，推荐用来看属性）
- `https://docs.spring.io/spring-boot/3.5/reference/...` 或 `https://docs.spring.io/spring-boot/3.5/how-to/...`
- `https://docs.spring.io/spring-boot/3.5/api/java/...`（Boot Javadoc）
- `https://jakarta.ee/specifications/...`（Jakarta Validation / Persistence / Annotation）
- `https://mybatis.org/...`、`https://hibernate.org/...`、`https://docs.spring.io/spring-security/reference/...`
- `https://github.com/spring-projects/...`（仅用于 release notes / wiki 的确切说明）

链接要能打开（HTTP 200）且内容确实覆盖你写的点。**不允许**放 CSDN/博客园/掘金等二手来源。

## 6. 知识文章 JSON 结构（`knowledge-a.json` / `knowledge-b.json`）

顶层：

```json
{ "generatedBy": "knowledge-a", "items": [ /* 文章 */ ] }
```

文章字段：

```json
{
  "id": "ioc-and-di",
  "title": "IoC 和 DI 到底是什么意思？",
  "category": "principle",
  "level": "入门",
  "readingMinutes": 6,
  "summary": "用「外卖平台」的比方讲清控制反转与依赖注入：谁负责创建对象、谁负责把对象递过去，以及为什么这样做。",
  "tags": ["IoC", "DI", "依赖注入"],
  "content": "## 一句话结论\n\n……\n\n## 为什么需要它\n\n……\n\n## 它是怎么做到的\n\n……\n\n## 一个最小例子\n\n```java\n...\n```\n\n## 常见误区\n\n- ……",
  "sources": [
    { "label": "Spring 官方：The IoC Container", "url": "https://docs.spring.io/spring-framework/reference/core/beans.html" }
  ]
}
```

- `category` 只能是：`principle`（核心原理）、`web`、`data`、`boot`、`test`、`engineering`（工程实践）、`migration`（版本升级）。
- 正文用 Markdown，必须有 2–4 个 `##` 小节；总长 600–1200 字；至少 1 段代码或表格/清单。
- 结构建议：一句话结论 → 为什么需要 → 原理/流程 → 最小例子 → 常见坑。
- 文章主题必须与分工清单一致（见各自任务说明），不得跑题扩写。
- `sources`：1–3 条白名单链接。
- 不写「据说」「网上有人说」；不写没有依据的性能数字（如「快 10 倍」）。

## 7. 质量自检清单（提交前逐条过）

- [ ] 每条 `package` 都能在 Javadoc / jar 索引里找到。
- [ ] 每个 `attributes[].name` 都真实存在，默认值与官方一致。
- [ ] 示例代码没有不存在的类/方法/属性；import 与包名一致。
- [ ] 中文通顺、没有机翻味；专业词第一次出现有解释。
- [ ] `docs` 链接我亲自打开过，页面确实讲了这条注解。
- [ ] 没有和同分类其他条目重复（同一注解只写一次）。
- [ ] JSON 是合法的（可用 `python -m json.tool` 或 node 校验）。
- [ ] 只改了自己负责的文件。

## 8. 环境与工具

- 工作目录：`D:\windowsisland\springboot-cheatsheet`
- 官方文档可联网抓取（`web_fetch` 或 `curl`）。
- Lead 会生成 `tools/annotation-audit/index/`（javap 提取的真实注解属性清单）。文件出现后，**属性以它为准**；与文档冲突时以 Javadoc 为准并报告差异。
- 校验脚本（Lead 提供）：`node scripts/validate-data.mjs`，写完跑一遍。