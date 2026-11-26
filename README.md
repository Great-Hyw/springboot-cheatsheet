# Spring Boot 注解与知识速查

一个用 Vue 3 写的静态速查站：把 Spring Boot 常用注解、容易踩的坑和背后原理，用尽量说人话的方式讲清楚。所有注解的包名、属性、默认值都对照真实依赖（Spring Boot 3.5.16 / Spring Framework 6.2.19）反射提取的索引核对过，不是凭印象写的。

## 本地运行

```bash
npm install
npm run dev        # 开发模式，默认 http://127.0.0.1:5173
```

```bash
npm run build      # 产物输出到 dist/
npx vite preview --port 4173 --host 127.0.0.1   # 预览构建结果
```

`dist/` 是纯静态文件，且使用 hash 路由，直接双击 `dist/index.html` 也能打开；部署到任意静态托管（Nginx、GitHub Pages、对象存储）都不需要额外配置 rewrite。

## 内容规模

- 注解卡片：核心容器、AOP、Web/REST、参数校验、数据访问、异步定时、Spring Boot、测试、安全共 9 个分类
- 知识文章：IoC/Bean 生命周期/AOP/循环依赖、MVC 请求流程/全局异常、事务/JPA vs MyBatis、自动配置/启动流程/配置优先级、异步线程池/定时任务/打包部署/日志、Actuator、版本升级等
- 每张卡片包含：一句话讲清、关键点、可用属性表（真实属性 + 默认值）、可运行示例、易错提示、相关注解、官方文档链接
- 当前版本：**144 条注解 + 20 篇知识文章**；核查结论为「可发布」：自动审计 0 错误 / 0 存疑，人工抽查 45.1%（74/164），215 个官方页面链接全部 HTTP 200。详见 `docs/QA-REPORT.md`

## 数据从哪来、怎么保证不瞎写

```
tools/annotation-audit/     # 反射提取真实注解索引
├── pom.xml                 # 拉取 Boot 3.5.16 的真实依赖 jar
├── AnnotationIndex.java    # 扫描 jar 里所有注解，输出 target/retention/属性/默认值
├── lib/                    # 115 个依赖 jar
└── index/annotations.txt   # 1109 条真实注解，数据编写的唯一事实来源
```

约束写在 `docs/CONTENT-SPEC.md`：属性必须真实存在、包名必须可查、示例不发明 API、版本差异必须有官方依据、来源只允许官方文档域名。

三道校验：

```bash
npm run validate              # 结构 + 包名/属性/默认值对照真实索引 + 长度/来源白名单
node tools/audit.mjs          # 独立审计：示例里的注解、@Target 用法、链接、重复条目
npm run render-check          # 无头 Chrome 打开构建产物，查控制台错误和手机横向溢出
node scripts/render-check.mjs --all   # 额外把所有详情页扫一遍
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
└── views/          # 首页、注解列表/详情、知识列表/文章、收藏、关于、404
docs/
├── CONTENT-SPEC.md # 内容规范（作者契约）
└── QA-REPORT.md    # 独立核查报告（问题清单 + 人工抽查记录）
scripts/
├── validate-data.mjs       # 数据校验
├── render-check.mjs        # 页面渲染检查
└── build-audit-summary.mjs # 核查数据汇总
```

## 技术栈

Vue 3 + Vite + Vue Router（hash 模式）+ marked + DOMPurify + highlight.js + Fuse.js，无后端、无数据库，全部内容随构建产物打包。

## 版本口径

正文以 **Spring Boot 3.5.x / Spring Framework 6.2.x** 为准（`jakarta.*` 命名空间，对应主流生产版本）。与 Boot 4.x 相关的差异只写官方文档能证实的部分，并在对应条目的 `versionNote` 中标注。