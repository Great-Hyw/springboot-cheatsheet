# Spring Boot 注解、命令与实战专题速查

一个用 Vue 3 写的静态速查站：Spring Boot 注解与原理用尽量说人话的方式讲清楚；Linux 与 Git 命令分成两个独立模块；开发规范、面试高频题、企业分层写法、Maven 坐标四个实战专题各占一块，互不混排。所有注解的包名、属性、默认值都对照真实依赖（Spring Boot 3.5.16 / Spring Framework 6.2.19）反射提取的索引核对过；命令的选项与示例对照官方 man / git 文档；Maven 坐标逐个在 Maven Central 验证过，不是凭印象写的。

## 本地运行

```bash
npm install
npm run dev        # 开发模式，默认 http://127.0.0.1:5173
```

```bash
npm run build      # 产物输出到 dist/
npx vite preview --port 4173 --host 127.0.0.1   # 预览构建结果
```

`dist/` 是纯静态文件（`base: './'` + hash 路由），直接双击 `dist/index.html` 也能打开；部署到任意静态托管（Nginx、GitHub Pages、对象存储、子路径）都不需要额外配置 rewrite。

## 内容规模

- 注解卡片：核心容器、AOP、Web/REST、参数校验、数据访问、异步定时、Spring Boot、测试、安全共 9 个分类
- 知识文章：IoC/Bean 生命周期/AOP/循环依赖、MVC 请求流程/全局异常、事务/JPA vs MyBatis、自动配置/启动流程/配置优先级、异步线程池/定时任务/打包部署/日志、Actuator、版本升级等
- 每张卡片包含：一句话讲清、关键点、可用属性表（真实属性 + 默认值）、可运行示例、易错提示、相关注解、官方文档链接
- 命令速查：Linux（文件/文本/权限/进程/网络/磁盘 6 组）与 Git（配置/基础/分支/远程/撤销/历史 6 组）两个独立入口，互不混排
- 每条命令包含：一句话用途、语法、真实选项、可直接敲的示例、容易踩的坑、相关命令、官方文档链接
- 实战专题（四个独立分块，入口 `/topics/:topic`）：
  - 开发规范（10 篇）：包结构、构造器注入、配置、REST、DTO 校验、异常、事务、日志、测试、依赖管理
  - 面试高频题（12 篇）：自动配置、Bean 生命周期、循环依赖、AOP、事务失效、MVC 流程、starter、配置优先级、作用域、过滤器/拦截器、异步线程池、优雅停机
  - 现代企业分层（9 篇）：Controller / Service / Repository / DTO 转换 / 异常与错误码 / 事务边界 / common 模块 / 模块化
  - 常用 Maven 坐标（6 篇）：Web、数据访问、安全、测试、监控运维、Lombok/MapStruct，附 BOM 管理与非 BOM 版本说明
- 当前版本：**144 条注解 + 20 篇知识文章 + 79 条命令 + 37 篇实战专题**；核查结论均为「可发布」：注解模块自动审计 0 错误 / 0 存疑、人工抽查 45.1%（74/164）、215 个官方链接全部 HTTP 200；命令模块自动审计 0 错误、79/79 通读 + 58 条深度核对、4 条事实错误已修、80 个官方链接 78 个 HTTP 200（2 个 gnu.org 页面本机网络不可达，非链接错误）；专题模块自动审计 0 错误、66/66 来源链接 HTTP 200、30/30 Maven 坐标实测存在、人工抽查 43.2%（16/37，四块全覆盖）。详见 `docs/QA-REPORT.md`、`docs/COMMAND-QA-REPORT.md` 与 `docs/TOPIC-QA-REPORT.md`
- 当前版本：**144 条注解 + 20 篇知识文章 + 79 条命令**；核查结论均为「可发布」：注解模块自动审计 0 错误 / 0 存疑、人工抽查 45.1%（74/164）、215 个官方链接全部 HTTP 200；命令模块自动审计 0 错误、79/79 通读 + 58 条深度核对、4 条事实错误已修、80 个官方链接 78 个 HTTP 200（2 个 gnu.org 页面本机网络不可达，非链接错误）。详见 `docs/QA-REPORT.md` 与 `docs/COMMAND-QA-REPORT.md`

## 数据从哪来、怎么保证不瞎写

```
tools/annotation-audit/     # 反射提取真实注解索引（仅用于注解模块）
├── pom.xml                 # 拉取 Boot 3.5.16 的真实依赖 jar
├── AnnotationIndex.java    # 扫描 jar 里所有注解，输出 target/retention/属性/默认值
├── lib/                    # 115 个依赖 jar
└── index/annotations.txt   # 1109 条真实注解，数据编写的唯一事实来源
```

约束写在 `docs/CONTENT-SPEC.md`：属性必须真实存在、包名必须可查、示例不发明 API、版本差异必须有官方依据、来源只允许官方文档域名。

三道校验：

```bash
npm run validate                 # 注解：结构 + 包名/属性/默认值对照真实索引 + 长度/来源白名单
node tools/audit.mjs             # 注解独立审计：示例注解、@Target 用法、链接、重复条目
node scripts/validate-commands.mjs  # 命令：模块归属/数量、真实选项格式、示例、来源域名、两模块互不污染
node scripts/validate-topics.mjs   # 专题：四块结构/小节/字数/来源白名单/跨块污染；--check-coords 实测 Maven 坐标
npm run render-check             # 无头 Chrome 打开构建产物，查控制台错误和手机横向溢出
node scripts/render-check.mjs --all  # 额外把所有注解/文章/命令/专题详情页扫一遍
```

`npm run audit:summary` 会从真实 JSON 现场统计数量，生成 `src/data/audit-summary.json`，供「关于」页展示核查数据，避免页面出现手填的假数字。

## 目录结构

```
src/
├── components/     # 顶栏、侧栏、搜索弹层、代码块、卡片、目录
├── composables/    # 主题、收藏、搜索（Fuse.js）
├── data/           # 内容 JSON（按作者拆分）+ 分类定义 + 聚合入口
├── router/         # hash 路由
├── styles/         # 设计 token、明暗主题、全部样式
├── utils/          # highlight.js 封装
└── views/          # 首页、注解列表/详情、知识列表/文章、命令、专题、收藏、关于、404
docs/
├── CONTENT-SPEC.md      # 注解 + 知识文章的内容规范（作者契约）
├── COMMAND-SPEC.md      # Linux / Git 命令模块的内容规范（作者契约）
├── TOPIC-SPEC.md        # 四个实战专题的内容规范（作者契约）
├── QA-REPORT.md         # 注解与知识的独立核查报告
└── COMMAND-QA-REPORT.md # 命令模块的独立核查报告
└── TOPIC-QA-REPORT.md   # 实战专题的独立核查报告
scripts/
├── validate-data.mjs        # 注解与知识数据校验
├── validate-commands.mjs    # 命令数据校验（含两模块隔离检查）
├── validate-topics.mjs      # 专题数据校验（含 Maven 坐标实测）
├── render-check.mjs         # 页面渲染检查
└── build-audit-summary.mjs  # 核查数据汇总
```

## 技术栈

Vue 3 + Vite + Vue Router（hash 模式）+ marked + DOMPurify + highlight.js + Fuse.js，无后端、无数据库，全部内容随构建产物打包。

## 版本口径

注解与知识文章以 **Spring Boot 3.5.x / Spring Framework 6.2.x** 为准（`jakarta.*` 命名空间，对应主流生产版本）。与 Boot 4.x 相关的差异只写官方文档能证实的部分，并在对应条目的 `versionNote` 中标注。

命令模块以 **GNU/Linux man 页（man7.org）与 git-scm.com 官方文档**为准，选项表按 GNU 工具写；`sed -i`、`stat` 等 GNU/BSD 行为差异会在「容易踩的坑」里单独提示。

实战专题以 **Spring Boot 3.5 / Framework 6.2 / Jakarta EE / Maven Central** 为准：规范与面试题的说法能落到官方文档；Maven 坐标的 groupId:artifactId 逐个查 Central，BOM 管理的依赖不写版本，非 BOM 的版本必须真实存在。