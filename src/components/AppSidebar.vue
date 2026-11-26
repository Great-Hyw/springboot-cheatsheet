<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  ANNOTATION_CATEGORIES,
  KNOWLEDGE_CATEGORIES,
  annotationCounts,
  knowledgeCounts,
  stats,
} from '../data'
import { COMMAND_TOOLS, commandModuleCounts, commandStats, getToolModules } from '../data/commands'

defineProps({ open: { type: Boolean, default: false } })
defineEmits(['close'])

const route = useRoute()

const activeToolId = computed(() => (route.path.startsWith('/commands/') ? String(route.params.tool || '') : ''))
const activeTool = computed(() => COMMAND_TOOLS.find((t) => t.id === activeToolId.value) || null)
const activeToolModules = computed(() => (activeTool.value ? getToolModules(activeTool.value.id) : []))

const isToolActive = (id) => route.path === `/commands/${id}`
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

      <div class="side-group">
        <p class="side-label">命令速查</p>
        <RouterLink class="side-link" :class="{ active: isPlainActive('/commands') }" to="/commands">
          命令速查首页
        </RouterLink>
        <RouterLink
          v-for="t in COMMAND_TOOLS"
          :key="t.id"
          class="side-link"
          :class="{ active: isToolActive(t.id) }"
          :to="`/commands/${t.id}`"
        >
          <span class="tool-dot" :style="{ background: t.color }"></span>
          {{ t.label }}
          <span class="side-count">{{ commandStats.byTool[t.id] || 0 }}</span>
        </RouterLink>
        <RouterLink
          v-for="m in activeToolModules"
          :key="m.id"
          class="side-link side-link--sub"
          :class="{ active: route.query.module === m.id }"
          :to="{ path: `/commands/${activeTool.id}`, query: { module: m.id } }"
        >
          {{ m.label }}
          <span class="side-count">{{ commandModuleCounts.get(m.id) || 0 }}</span>
        </RouterLink>
      </div>

      <div class="side-note">
        <strong>本站怎么保证不瞎写</strong>
        <p>注解的包名与属性对照 Boot 3.5.16 真实依赖索引；Linux / Git 命令的参数与示例对照官方 man、git 文档。两者都附出处，并有独立核查。</p>
        <RouterLink to="/about" style="font-size: 12px; font-weight: 600">查看核查方法 →</RouterLink>
      </div>
    </div>
  </aside>
</template>