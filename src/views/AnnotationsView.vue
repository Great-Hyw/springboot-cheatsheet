<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnnotationCard from '../components/AnnotationCard.vue'
import { annotations, annotationCategory, stats } from '../data'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const level = ref('全部')

const selectedCategory = computed(() => {
  const raw = route.query.category
  const id = Array.isArray(raw) ? raw[0] : raw
  return id ? annotationCategory(String(id)) : null
})

const pageTitle = computed(() => (selectedCategory.value ? selectedCategory.value.label : '注解速查'))
const pageDesc = computed(() =>
  selectedCategory.value
    ? selectedCategory.value.desc + '。'
    : `按场景收好 ${stats.annotations} 条常用注解。每条都写清楚它解决什么问题、有哪些真实属性、以及容易踩的坑。`,
)

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const cat = selectedCategory.value?.id
  return annotations.filter((a) => {
    if (cat && a.category !== cat) return false
    if (level.value !== '全部' && a.level !== level.value) return false
    if (!q) return true
    const haystack = [a.name, a.tagline, a.plain, a.package, a.subcategory, ...(a.tags || [])]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q) || haystack.includes(q.replace(/^@/, ''))
  })
})

const hasFilter = computed(() => !!selectedCategory.value || level.value !== '全部' || keyword.value.trim() !== '')

function clearCategory() {
  router.replace({ path: '/annotations' })
}
function reset() {
  keyword.value = ''
  level.value = '全部'
  clearCategory()
}
</script>

<template>
  <div class="main-inner">
    <div class="page-head">
      <span class="eyebrow">Annotations</span>
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p class="page-desc">{{ pageDesc }}</p>
    </div>

    <div class="toolbar">
      <label class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input v-model="keyword" type="search" placeholder="搜索注解名、说明、包名…" aria-label="在当前分类中搜索注解" />
      </label>
      <div class="filter-group" role="group" aria-label="按难度筛选">
        <button
          v-for="lv in ['全部', '入门', '进阶']"
          :key="lv"
          class="filter-chip"
          :class="{ active: level === lv }"
          type="button"
          @click="level = lv"
        >
          {{ lv }}
        </button>
      </div>
      <div v-if="selectedCategory" class="filter-group">
        <span class="filter-chip active" style="display: inline-flex; align-items: center; gap: 6px">
          <span class="cat-dot" :style="{ background: selectedCategory.color }"></span>
          {{ selectedCategory.label }}
          <button class="clear-link" style="font-size: 12px" type="button" @click="clearCategory">×</button>
        </span>
      </div>
    </div>

    <div class="result-line">
      <span>共 <strong>{{ filtered.length }}</strong> 条结果</span>
      <button v-if="hasFilter" class="clear-link" type="button" @click="reset">清除全部筛选</button>
    </div>

    <div v-if="filtered.length" class="ann-grid">
      <AnnotationCard v-for="item in filtered" :key="item.id" :item="item" />
    </div>
    <div v-else class="empty-state">
      <span class="empty-icon">🔍</span>
      <h3>{{ annotations.length ? '没有匹配的注解' : '内容正在生成中' }}</h3>
      <p>
        {{
          annotations.length
            ? '换个关键词，或清空筛选条件再试。也可以直接在顶部用 ⌘K 全局搜索。'
            : '注解数据文件还未生成，请稍后刷新页面。'
        }}
      </p>
      <button v-if="hasFilter" class="btn btn-sm" type="button" @click="reset">清除筛选</button>
    </div>
  </div>
</template>