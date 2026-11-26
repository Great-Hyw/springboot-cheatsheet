<script setup>
import { computed } from 'vue'
import AnnotationCard from '../components/AnnotationCard.vue'
import {
  ANNOTATION_CATEGORIES,
  annotationCounts,
  featuredAnnotations,
  knowledge,
  knowledgeCategory,
  stats,
} from '../data'
import { COMMAND_TOOLS, commandStats, getToolModules } from '../data/commands'
import { TOPICS, getTopicArticles, topicStats } from '../data/topics'

const picks = computed(() =>
  ['ioc-and-di', 'mvc-request-flow', 'transaction-failure', 'auto-configuration']
    .map((id) => knowledge.find((k) => k.id === id))
    .filter(Boolean),
)

const pathSteps = [
  {
    step: 1,
    title: '先搞懂容器',
    desc: 'Bean 是什么、为什么不用自己 new、注入到底解决了什么问题。',
    to: '/knowledge/ioc-and-di',
    link: 'IoC 与 DI 到底是什么意思',
  },
  {
    step: 2,
    title: '再写第一个接口',
    desc: '一个请求从进 DispatcherServlet 到返回 JSON，中间都发生了什么。',
    to: '/knowledge/mvc-request-flow',
    link: '一个请求的完整旅程',
  },
  {
    step: 3,
    title: '然后把数据存起来',
    desc: '事务为什么没生效？JPA 和 MyBatis 到底怎么选？',
    to: '/knowledge/transaction-failure',
    link: '事务失效的常见场景',
  },
]
</script>

<template>
  <div class="main-inner main-inner--wide">
    <section class="hero">
      <span class="eyebrow">Spring Boot 3.5 · 说人话的速查手册</span>
      <h1>把 Spring Boot 的注解，<br />讲成<em>人话</em>。</h1>
      <p class="hero-sub">
        不堆名词、不抄段子。每条注解都写清楚「解决什么问题、什么时候用、容易踩什么坑」，并附上官方文档出处；知识文章负责把散落的点串成线；Linux / Git 命令单独成册，不跟注解混在一起。放在手边，随时查。
      </p>
      <div class="hero-actions">
        <RouterLink class="btn btn-primary" to="/annotations">开始查注解 →</RouterLink>
        <RouterLink class="btn" to="/knowledge">读知识库</RouterLink>
        <RouterLink class="btn" to="/topics">看企业实战专题</RouterLink>
        <RouterLink class="btn" to="/commands">查 Linux / Git 命令</RouterLink>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <strong>{{ stats.annotations }}</strong>
          <span>条注解卡片</span>
        </div>
        <div class="hero-stat">
          <strong>{{ stats.knowledge }}</strong>
          <span>篇知识文章</span>
        </div>
        <div class="hero-stat">
          <strong>{{ commandStats.total }}</strong>
          <span>条 Linux / Git 命令</span>
        </div>
        <div class="hero-stat">
          <strong>{{ topicStats.total }}</strong>
          <span>篇企业实战专题</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">按场景找注解 <small>从「我要做什么」出发</small></h2>
        <RouterLink class="section-more" to="/annotations">全部注解 →</RouterLink>
      </div>
      <div class="cat-grid">
        <RouterLink
          v-for="c in ANNOTATION_CATEGORIES"
          :key="c.id"
          class="cat-card"
          :to="{ path: '/annotations', query: { category: c.id } }"
        >
          <div class="cat-card__top">
            <span class="cat-dot" :style="{ background: c.color }"></span>
            {{ c.label }}
            <span class="cat-card__count">{{ annotationCounts.get(c.id) || 0 }}</span>
          </div>
          <p>{{ c.desc }}</p>
        </RouterLink>
      </div>
    </section>

    <section v-if="featuredAnnotations.length" class="section">
      <div class="section-head">
        <h2 class="section-title">最常被搜的几条 <small>新手先把这些用明白</small></h2>
        <RouterLink class="section-more" to="/annotations">查看全部 →</RouterLink>
      </div>
      <div class="featured-grid">
        <AnnotationCard v-for="item in featuredAnnotations" :key="item.id" :item="item" />
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">知识库精选 <small>把注解背后的原理讲清楚</small></h2>
        <RouterLink class="section-more" to="/knowledge">全部文章 →</RouterLink>
      </div>
      <div class="kn-grid">
        <RouterLink v-for="k in picks" :key="k.id" class="kn-card" :to="`/knowledge/${k.id}`">
          <div class="kn-card__meta">
            <span class="cat-dot" :style="{ background: knowledgeCategory(k.category).color }"></span>
            {{ knowledgeCategory(k.category).label }}
            <span>·</span>
            <span>{{ k.readingMinutes }} 分钟</span>
          </div>
          <h3>{{ k.title }}</h3>
          <p>{{ k.summary }}</p>
          <div class="kn-card__foot">
            <span class="tag">{{ k.level }}</span>
            <span v-for="tag in k.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">顺手查命令 <small>Linux 和 Git 分成两本小抄</small></h2>
        <RouterLink class="section-more" to="/commands">命令速查首页 →</RouterLink>
      </div>
      <div class="cmd-home-grid">
        <RouterLink v-for="t in COMMAND_TOOLS" :key="t.id" class="cmd-home-card" :to="`/commands/${t.id}`">
          <span class="cmd-tool-badge" :style="{ background: t.color }">{{ t.icon }}</span>
          <div class="cmd-home-card__body">
            <h3>
              {{ t.label }}
              <small>{{ commandStats.byTool[t.id] || 0 }} 条</small>
            </h3>
            <p>{{ t.desc }}</p>
            <div class="cmd-home-tags">
              <span v-for="m in getToolModules(t.id)" :key="m.id" class="tag">{{ m.label }}</span>
            </div>
          </div>
          <span class="cmd-home-card__arrow">→</span>
        </RouterLink>
      </div>
      <p class="cmd-home-note">
        两个模块各自收录、各自检索：Linux 系统命令不会混进 Git 模块，Git 命令也不会混进 Linux 模块。
      </p>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">企业实战专题 <small>规范 / 面经 / 分层 / 坐标，四块分开</small></h2>
        <RouterLink class="section-more" to="/topics">全部专题 →</RouterLink>
      </div>
      <div class="topic-grid">
        <RouterLink v-for="t in TOPICS" :key="t.id" class="topic-card" :to="`/topics/${t.id}`">
          <div class="topic-card__head">
            <span class="topic-card__icon" :style="{ background: t.color }">{{ t.icon }}</span>
            <div>
              <h3>{{ t.label }}</h3>
              <p class="topic-card__count">{{ topicStats.byTopic[t.id] || 0 }} 篇</p>
            </div>
            <span class="topic-card__arrow">→</span>
          </div>
          <p class="topic-card__desc">{{ t.desc }}</p>
          <div class="topic-card__foot">
            <span class="tag">{{ t.entry }}</span>
          </div>
        </RouterLink>
      </div>
      <p class="cmd-home-note">
        规范管「怎么约定」，面经管「怎么答」，分层管「每层代码怎么写」，坐标管「依赖怎么引、版本谁管」——四块内容不互相搬运。
      </p>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">不知道从哪开始？<small>三步走</small></h2>
      </div>
      <div class="path-grid">
        <RouterLink v-for="s in pathSteps" :key="s.step" class="path-card" :to="s.to">
          <span class="path-step">{{ s.step }}</span>
          <strong>{{ s.title }}</strong>
          <p>{{ s.desc }}</p>
          <span class="path-link">{{ s.link }} →</span>
        </RouterLink>
      </div>
    </section>

    <section class="section" style="margin-bottom: 0">
      <div class="trust-banner">
        <strong>不瞎写，是本站的第一原则</strong>
        <p>
          包名、属性、默认值都用 Spring Boot 3.5.16 真实依赖反射核对；每条观点附官方文档链接；成稿后再由独立核查员全量审计 + 人工抽查。
        </p>
        <RouterLink to="/about">看核查方法 →</RouterLink>
      </div>
    </section>
  </div>
</template>