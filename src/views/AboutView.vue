<script setup>
import { computed } from 'vue'
import { auditSummary, stats } from '../data'

const s = computed(() => auditSummary || {})

const rows = computed(() => [
  { label: '收录注解', value: s.value.annotationCount ?? stats.annotations, unit: '条' },
  { label: '知识文章', value: s.value.knowledgeCount ?? stats.knowledge, unit: '篇' },
  { label: '反射扫描的 Jar', value: s.value.jarsScanned ?? 115, unit: '个' },
  { label: '索引到的注解类', value: s.value.indexAnnotations ?? 1109, unit: '个' },
  { label: '官方文档链接', value: s.value.docsLinks ?? '—', unit: '条' },
  { label: '核查后修正的问题', value: s.value.fixedIssues ?? '—', unit: '条' },
])
</script>

<template>
  <div class="main-inner">
    <div class="page-head">
      <span class="eyebrow">About</span>
      <h1 class="page-title">关于本站与「不瞎写」</h1>
      <p class="page-desc">
        这是一个 Spring Boot 注解速查站：面向刚上手 Spring Boot 的同学，把常用注解和背后的原理讲清楚。比起“背名词”，更希望你看完知道「什么时候该用它」。
      </p>
    </div>

    <div class="about-grid">
      <section class="about-card">
        <h2>这个站是什么</h2>
        <ul class="point-list">
          <li><strong>注解卡片</strong>：每条包含大白话解释、关键点、真实属性表、可读的代码示例、容易踩的坑和官方文档链接。</li>
          <li><strong>知识库</strong>：把 IoC、AOP、事务、自动配置这些“绕不开的原理”，连同工程实践与版本升级，串成 20 篇短文，每篇 2–8 分钟。</li>
          <li><strong>搜索与收藏</strong>：⌘K / Ctrl+K 全局搜索；收藏存在浏览器本地，不需要登录。</li>
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
        自动校验脚本在项目的 <code>scripts/validate-data.mjs</code>，任何人都可以在本地复跑；真实注解索引在 <code>tools/annotation-audit/index/annotations.txt</code>。
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