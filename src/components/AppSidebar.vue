<script setup>
import { useRoute } from 'vue-router'
import {
  ANNOTATION_CATEGORIES,
  KNOWLEDGE_CATEGORIES,
  annotationCounts,
  knowledgeCounts,
  stats,
} from '../data'

defineProps({ open: { type: Boolean, default: false } })
defineEmits(['close'])

const route = useRoute()

function isCategoryActive(path, categoryId) {
  return route.path === path && route.query.category === categoryId
}
function isPlainActive(path) {
  return route.path === path && !route.query.category
}
</script>

<template>
  <aside class="sidebar" :class="{ open }" aria-label="侧边导航">
    <div class="sidebar-inner">
      <div class="side-group">
        <p class="side-label">开始</p>
        <RouterLink class="side-link" :class="{ active: isPlainActive('/') }" to="/">首页</RouterLink>
        <RouterLink class="side-link" :class="{ active: isPlainActive('/annotations') }" to="/annotations">
          全部注解
          <span class="side-count">{{ stats.annotations }}</span>
        </RouterLink>
        <RouterLink class="side-link" :class="{ active: isPlainActive('/knowledge') }" to="/knowledge">
          知识文章
          <span class="side-count">{{ stats.knowledge }}</span>
        </RouterLink>
        <RouterLink class="side-link" :class="{ active: isPlainActive('/favorites') }" to="/favorites">我的收藏</RouterLink>
        <RouterLink class="side-link" :class="{ active: isPlainActive('/about') }" to="/about">关于与内容核查</RouterLink>
      </div>

      <div class="side-group">
        <p class="side-label">注解分类</p>
        <RouterLink
          v-for="c in ANNOTATION_CATEGORIES"
          :key="c.id"
          class="side-link"
          :class="{ active: isCategoryActive('/annotations', c.id) }"
          :to="{ path: '/annotations', query: { category: c.id } }"
        >
          <span class="cat-dot" :style="{ background: c.color }"></span>
          {{ c.label }}
          <span class="side-count">{{ annotationCounts.get(c.id) || 0 }}</span>
        </RouterLink>
      </div>

      <div class="side-group">
        <p class="side-label">知识库</p>
        <RouterLink
          v-for="c in KNOWLEDGE_CATEGORIES"
          :key="c.id"
          class="side-link"
          :class="{ active: isCategoryActive('/knowledge', c.id) }"
          :to="{ path: '/knowledge', query: { category: c.id } }"
        >
          <span class="cat-dot" :style="{ background: c.color }"></span>
          {{ c.label }}
          <span class="side-count">{{ knowledgeCounts.get(c.id) || 0 }}</span>
        </RouterLink>
      </div>

      <div class="side-note">
        <strong>本站怎么保证不瞎写</strong>
        <p>包名与属性对照 Spring Boot 3.5.16 真实依赖索引核对，每条观点都附官方文档链接，另有独立核查报告。</p>
        <RouterLink to="/about" style="font-size: 12px; font-weight: 600">查看核查方法 →</RouterLink>
      </div>
    </div>
  </aside>
</template>