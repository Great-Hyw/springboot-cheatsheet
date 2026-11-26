<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { KNOWLEDGE_CATEGORIES, knowledge, knowledgeCategory, stats } from '../data'

const route = useRoute()
const keyword = ref('')

const selectedCategory = computed(() => {
  const raw = route.query.category
  const id = Array.isArray(raw) ? raw[0] : raw
  return id ? KNOWLEDGE_CATEGORIES.find((c) => c.id === String(id)) || null : null
})

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const cat = selectedCategory.value?.id
  return knowledge.filter((k) => {
    if (cat && k.category !== cat) return false
    if (!q) return true
    const haystack = [k.title, k.summary, ...(k.tags || []), k.content || ''].join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

const hasFilter = computed(() => !!selectedCategory.value || keyword.value.trim() !== '')
</script>

<template>
  <div class="main-inner main-inner--wide">
    <div class="page-head">
      <span class="eyebrow">Knowledge</span>
      <h1 class="page-title">知识库</h1>
      <p class="page-desc">
        注解是「点」，这里把「线」补上：每个话题用大白话讲清背景、原理和常见坑，读完再回头看注解会顺很多。共 {{ stats.knowledge }} 篇。
      </p>
    </div>

    <div class="toolbar">
      <label class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input v-model="keyword" type="search" placeholder="搜索文章标题、摘要、正文…" aria-label="搜索知识文章" />
      </label>
    </div>

    <div class="filter-group" style="margin-bottom: 18px; flex-wrap: wrap">
      <RouterLink class="filter-chip" :class="{ active: !selectedCategory }" to="/knowledge">全部</RouterLink>
      <RouterLink
        v-for="c in KNOWLEDGE_CATEGORIES"
        :key="c.id"
        class="filter-chip"
        :class="{ active: selectedCategory?.id === c.id }"
        :to="{ path: '/knowledge', query: { category: c.id } }"
      >
        {{ c.label }}
      </RouterLink>
    </div>

    <div class="result-line">
      <span>共 <strong>{{ filtered.length }}</strong> 篇文章</span>
      <RouterLink v-if="hasFilter" class="clear-link" to="/knowledge">清除筛选</RouterLink>
    </div>

    <div v-if="filtered.length" class="kn-grid">
      <RouterLink v-for="k in filtered" :key="k.id" class="kn-card" :to="`/knowledge/${k.id}`">
        <div class="kn-card__meta">
          <span class="cat-dot" :style="{ background: knowledgeCategory(k.category).color }"></span>
          {{ knowledgeCategory(k.category).label }}
          <span>·</span>
          <span>{{ k.readingMinutes }} 分钟</span>
          <span>·</span>
          <span>{{ k.level }}</span>
        </div>
        <h3>{{ k.title }}</h3>
        <p>{{ k.summary }}</p>
        <div class="kn-card__foot">
          <span v-for="tag in k.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
          <span class="kn-card__arrow">→</span>
        </div>
      </RouterLink>
    </div>
    <div v-else class="empty-state">
      <span class="empty-icon">📚</span>
      <h3>{{ knowledge.length ? '没有匹配的文章' : '内容正在生成中' }}</h3>
      <p>{{ knowledge.length ? '换个关键词或分类试试。' : '知识文章数据还未生成，请稍后刷新。' }}</p>
    </div>
  </div>
</template>