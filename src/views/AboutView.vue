<script setup>
import { computed } from 'vue'
import { auditSummary, stats } from '../data'
import { commandStats } from '../data/commands'
import { topicStats } from '../data/topics'

const s = computed(() => auditSummary || {})

const rows = computed(() => [
  { label: '收录注解', value: s.value.annotationCount ?? stats.annotations, unit: '条' },
  { label: '知识文章', value: s.value.knowledgeCount ?? stats.knowledge, unit: '篇' },
  { label: 'Linux / Git 命令', value: commandStats.total, unit: '条' },
  { label: '命令模块', value: commandStats.modules, unit: '组' },
  { label: '企业实战专题', value: topicStats.total, unit: '篇' },
  { label: '专题分块', value: topicStats.blocks, unit: '块' },
  { label: '反射扫描的 Jar', value: s.value.jarsScanned ?? 115, unit: '个' },
  { label: '索引到的注解类', value: s.value.indexAnnotations ?? 1109, unit: '个' },
  { label: '注解模块文档链接', value: s.value.docsLinks ?? '—', unit: '条' },
  { label: '核查后修正的问题', value: s.value.fixedIssues ?? '—', unit: '条' },
])
</script>

<template>
  <div class="main-inner">
    <div class="page-head">
      <span class="eyebrow">About</span>
      <h1 class="page-title">关于本站与「不瞎写」</h1>
      <p class="page-desc">
        这是一个「注解 + 命令 + 实战专题」速查站：Spring Boot 注解与原理面向刚上手后端的同学，讲清楚「什么时候该用」；Linux 与 Git 命令分成两个独立模块；开发规范、面试高频题、企业分层写法、Maven 坐标各占一块，四块互不混排。
      </p>
    </div>

    <div class="about-grid">
      <section class="about-card">
        <h2>这个站是什么</h2>
        <ul class="point-list">
          <li><strong>注解卡片</strong>：每条包含大白话解释、关键点、真实属性表、可读的代码示例、容易踩的坑和官方文档链接。</li>
          <li><strong>知识库</strong>：把 IoC、AOP、事务、自动配置这些“绕不开的原理”，连同工程实践与版本升级，串成 20 篇短文，每篇 2–8 分钟。</li>
          <li><strong>命令速查</strong>：Linux 与 Git 两个独立入口，每条命令有真实选项、可直接敲的示例、容易踩的坑和官方 man / git 文档。</li>
          <li><strong>企业实战专题</strong>：开发规范、面试高频题、现代企业分层写法、常用 Maven 坐标用法四个独立分块，每篇按固定小节写，题目/坐标/代码骨架各有出处。</li>
          <li><strong>搜索与收藏</strong>：⌘K / Ctrl+K 全局搜索（注解、文章、专题、命令一起搜）；收藏存在浏览器本地，不需要登录。</li>
        </ul>
      </section>

      <section class="about-card">
        <h2>版本口径</h2>
        <ul class="point-list">
          <li>内容以 <strong>Spring Boot 3.5.x / Spring Framework 6.2.x</strong> 为准，使用 <code>jakarta.*</code> 命名空间。</li>
          <li>Spring Boot 4.x 带来的一些变化，只在有官方依据时写进对应条目的「版本提示」，不凭印象补充。</li>
          <li>文档链接优先指向版本化官方文档（如 docs.spring.io/spring-boot/3.5/），避免链接随版本漂移。</li>
          <li>若页面与官方文档冲突，<strong>以官方文档为准</strong>。</li>
        </ul>
      </section>
    </div>

    <section class="about-section">
      <h2 class="section-title">「不瞎写」是怎么落实的 <small>四道工序</small></h2>
      <div class="method-grid">
        <div class="method-card">
          <span class="method-step">1</span>
          <h3>建真实索引</h3>
          <p>用 Maven 拉取 Spring Boot 3.5.16 的完整依赖（115 个 jar），再用 Java 反射扫描出 1109 个注解类的真实包名、<code>@Target</code>、<code>@Retention</code>、属性名与默认值。</p>
        </div>
        <div class="method-card">
          <span class="method-step">2</span>
          <h3>按索引写内容</h3>
          <p>属性表只允许出现索引里真实存在的属性；包名逐个比对；示例代码只用公开 API，不发明 Spring 里不存在的类和方法。</p>
        </div>
        <div class="method-card">
          <span class="method-step">3</span>
          <h3>独立核查</h3>
          <p>另一位核查员用独立脚本做全量 schema / 包名 / 属性 / 链接 / 重复检查，再人工抽查重点条目（事务、JPA、安全、异步等），产出核查报告。</p>
        </div>
        <div class="method-card">
          <span class="method-step">4</span>
          <h3>发现问题就改</h3>
          <p>核查出的错误回到内容文件逐条修正；存疑但无法证实的说法直接删掉，不用“可能是”“一般来说”糊过去。</p>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2 class="section-title">命令模块的「不瞎写」 <small>和注解分开做</small></h2>
      <div class="method-grid">
        <div class="method-card">
          <span class="method-step">1</span>
          <h3>两个模块，边界写死</h3>
          <p>Linux 与 Git 的数据、模块 id、条目 id、相关推荐各自独立，页面也分成两个入口；Linux 模块里不会出现 Git 命令，反之亦然。</p>
        </div>
        <div class="method-card">
          <span class="method-step">2</span>
          <h3>只写真实选项</h3>
          <p>选项表里的 flag 必须能在官方 man 页或 git 文档里找到；没有选项可写的命令（如 <code>nohup</code>）不硬凑参数，把用法放到关键点里。</p>
        </div>
        <div class="method-card">
          <span class="method-step">3</span>
          <h3>示例可直接敲</h3>
          <p>示例不带 <code>$</code> 提示符，路径用常见的占位写法；破坏性命令（<code>rm -rf</code>、<code>git reset --hard</code>、<code>push --force</code>）必须在坑里写清后果。</p>
        </div>
        <div class="method-card">
          <span class="method-step">4</span>
          <h3>独立复核</h3>
          <p>由另一位核查员按官方文档抽查命令语义、选项与危险提示，产出命令模块核查报告；发现错误回到数据文件修正。</p>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2 class="section-title">专题模块的「不瞎写」 <small>四块各查各的</small></h2>
      <div class="method-grid">
        <div class="method-card">
          <span class="method-step">1</span>
          <h3>四块，四种写法</h3>
          <p>规范写「推荐做法 / 为什么 / 检查清单」，面经写「一句话答案 / 展开 / 追问 / 坑」，分层写「职责 / 代码骨架 / 边界」，坐标写「什么时候用 / 坐标表 / 配置」。四种结构互不套用。</p>
        </div>
        <div class="method-card">
          <span class="method-step">2</span>
          <h3>规范与面经有官方依据</h3>
          <p>注入方式、配置优先级、自动配置、优雅停机等说法都以 Spring 官方文档为准；面试题只写能落到官方文档的机制，不编「某公司真题」。</p>
        </div>
        <div class="method-card">
          <span class="method-step">3</span>
          <h3>坐标逐个实测</h3>
          <p>每个 groupId:artifactId 都去 Maven Central 查 <code>maven-metadata.xml</code>；由 BOM 管版本的坐标不写死版本，非 BOM 的版本必须能在 Central 的版本列表里找到。</p>
        </div>
        <div class="method-card">
          <span class="method-step">4</span>
          <h3>独立复核</h3>
          <p>核查员另写审计脚本查 schema、链接、坐标与四块互相污染，再人工抽查每块至少 3 篇，产出 <code>docs/TOPIC-QA-REPORT.md</code>；有错回到数据文件修。</p>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2 class="section-title">核查数据 <small>可复跑</small></h2>
      <div class="audit-grid">
        <div v-for="r in rows" :key="r.label" class="audit-stat">
          <strong>{{ r.value }}<small>{{ r.unit }}</small></strong>
          <span>{{ r.label }}</span>
        </div>
      </div>
      <p v-if="s.generatedAt" class="source-note">核查时间：{{ s.generatedAt }}。核查方式：{{ s.verdict || '自动脚本 + 人工抽查' }}。</p>
      <p v-if="s.uniqueDocs" class="source-note">
        「官方文档链接」按条目计；去重后是 {{ s.uniqueDocs }} 个官方页面，逐个做过 HTTP 校验（{{ s.linksOk }}/{{ s.uniqueDocs }} 通过）。
      </p>
      <p v-else class="source-note">核查报告仍在生成。页面里的注解与文章数据已是核对过属性的版本。</p>
      <p class="source-note">
        自动校验脚本在项目的 <code>scripts/validate-data.mjs</code>、<code>scripts/validate-commands.mjs</code> 与 <code>scripts/validate-topics.mjs</code>（坐标加 <code>--check-coords</code>），任何人都可以在本地复跑；真实注解索引在 <code>tools/annotation-audit/index/annotations.txt</code>。
      </p>
    </section>

    <section class="about-section">
      <div class="callout">
        <strong>核查的边界，也如实说</strong>
        <p>
          示例代码为了好读，省略了 import、包声明和 getter/setter 等样板代码，不是完整可编译工程；示例里出现的 Service、User 等类是为了演示而写的示意类，不是 Spring 自带类。速查站不能替代官方文档——遇到版本、行为细节问题，请以官方文档与源码为准。
        </p>
      </div>
    </section>
  </div>
</template>