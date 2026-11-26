<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTopic, getTopicArticles } from '../data/topics'

const route = useRoute()
const topic = computed(() => getTopic(String(route.params.topic || '')))
const articles = computed(() => (topic.value ? getTopicArticles(topic.value.id) : []))
</script>

<template>
  <div v-if="topic" class="main-inner main-inner--wide">
    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink to="/topics">实战专题</RouterLink>
      <span class="sep">/</span>
      <span class="current">{{ topic.label }}</span>
    </nav>

    <header class="topic-list-head">
      <span class="topic-card__icon topic-card__icon--lg" :style="{ background: topic.color }">{{ topic.icon }}</span>
      <div class="topic-list-head__text">
        <h1>{{ topic.label }}</h1>
        <p>{{ topic.desc }}</p>
      </div>
      <span class="topic-list-head__count">{{ articles.length }} 篇</span>
    </header>

    <div v-if="articles.length" class="topic-list">
      <RouterLink v-for="(a, i) in articles" :key="a.id" class="topic-row" :to="`/topics/${a.topic}/${a.id}`">
        <span class="topic-row__num">{{ String(i + 1).padStart(2, '0') }}</span>
        <div class="topic-row__body">
          <h2>{{ a.title }}</h2>
          <p>{{ a.summary }}</p>
          <div class="topic-row__meta">
            <span class="tag">{{ a.level }}</span>
            <span class="tag">{{ a.readingMinutes }} 分钟</span>
            <span v-for="tag in a.tags.slice(0, 3)" :key="tag" class="tag tag--muted">{{ tag }}</span>
          </div>
        </div>
        <span class="topic-row__arrow">→</span>
      </RouterLink>
    </div>

    <div v-else class="empty-state">
      <span class="empty-icon">📝</span>
      <h3>这一块的内容正在整理</h3>
      <p>数据落盘后会自动出现在这里。</p>
      <RouterLink class="btn btn-sm" to="/topics">返回专题首页</RouterLink>
    </div>
  </div>

  <div v-else class="main-inner">
    <div class="empty-state">
      <span class="empty-icon">🧭</span>
      <h3>没有这个专题分块</h3>
      <p>四个分块分别是：规范 / 面经 / 分层 / 坐标。</p>
      <RouterLink class="btn btn-sm" to="/topics">返回专题首页</RouterLink>
    </div>
  </div>
</template>