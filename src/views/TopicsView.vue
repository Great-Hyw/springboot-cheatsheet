<script setup>
import { TOPICS, getTopicArticles, topicStats, topics } from '../data/topics'
</script>

<template>
  <div class="main-inner main-inner--wide">
    <section class="topic-hero">
      <span class="eyebrow">企业实战专题 · 四块分开看</span>
      <h1>从「能跑」到「能上线」</h1>
      <p class="hero-sub">
        注解教你「这个 API 怎么用」，这里四个分块回答更实际的问题：团队怎么约定、面试怎么答、每一层代码怎么写、依赖坐标从哪来。
        四块分别独立收录、独立检索，不混在一起。
      </p>
      <div class="topic-hero__stats">
        <span><strong>{{ TOPICS.length }}</strong> 个分块</span>
        <span><strong>{{ topicStats.total }}</strong> 篇内容</span>
        <span><strong>0</strong> 条编造坐标</span>
      </div>
    </section>

    <section class="section">
      <div class="topic-grid">
        <RouterLink v-for="t in TOPICS" :key="t.id" class="topic-card" :to="`/topics/${t.id}`">
          <div class="topic-card__head">
            <span class="topic-card__icon" :style="{ background: t.color }">{{ t.icon }}</span>
            <div>
              <h2>{{ t.label }}</h2>
              <p class="topic-card__count">{{ topicStats.byTopic[t.id] || 0 }} 篇</p>
            </div>
            <span class="topic-card__arrow">→</span>
          </div>
          <p class="topic-card__desc">{{ t.desc }}</p>
          <div class="topic-card__foot">
            <span class="tag">{{ t.entry }}</span>
            <span v-for="a in getTopicArticles(t.id).slice(0, 2)" :key="a.id" class="tag tag--muted">{{ a.title }}</span>
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">四块怎么分 <small>别把内容搞混</small></h2>
      </div>
      <div class="topic-boundary">
        <div v-for="t in TOPICS" :key="t.id" class="topic-boundary__item">
          <strong>{{ t.label }}</strong>
          <p>{{ t.desc }}</p>
        </div>
      </div>
      <p class="cmd-home-note">
        规范回答「怎么约定」，面经回答「怎么答」，分层回答「每层代码怎么写」，坐标回答「依赖怎么引、版本谁管」。
        同一篇内容只归属一个分块，不重复搬运。
      </p>
    </section>

    <section v-if="topics.length" class="section" style="margin-bottom: 0">
      <div class="section-head">
        <h2 class="section-title">最近更新 <small>按分块顺序</small></h2>
      </div>
      <div class="kn-grid">
        <RouterLink
          v-for="a in topics.slice(-4).reverse()"
          :key="a.id"
          class="kn-card"
          :to="`/topics/${a.topic}/${a.id}`"
        >
          <div class="kn-card__meta">
            <span class="cat-dot" :style="{ background: a.color }"></span>
            {{ a.topicLabel }}
            <span>·</span>
            <span>{{ a.readingMinutes }} 分钟</span>
          </div>
          <h3>{{ a.title }}</h3>
          <p>{{ a.summary }}</p>
          <div class="kn-card__foot">
            <span class="tag">{{ a.level }}</span>
            <span v-for="tag in a.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>