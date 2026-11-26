<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import TocPanel from '../components/TocPanel.vue'
import { getKnowledge, knowledge, knowledgeCategory } from '../data'
import { highlightElement } from '../utils/highlight'
import { useFavorites } from '../composables/useFavorites'

const route = useRoute()
const { isFav, toggleFav } = useFavorites()

const article = computed(() => getKnowledge(String(route.params.id)))
const category = computed(() => (article.value ? knowledgeCategory(article.value.category) : null))
const fav = computed(() => (article.value ? isFav('knowledge', article.value.id) : false))

const html = ref('')
const toc = ref([])
const activeId = ref('')
const bodyRef = ref(null)

const index = computed(() => (article.value ? knowledge.findIndex((k) => k.id === article.value.id) : -1))
const prev = computed(() => (index.value > 0 ? knowledge[index.value - 1] : null))
const next = computed(() =>
  index.value >= 0 && index.value < knowledge.length - 1 ? knowledge[index.value + 1] : null,
)

watch(
  article,
  () => {
    if (!article.value) {
      html.value = ''
      toc.value = []
      return
    }
    html.value = DOMPurify.sanitize(marked.parse(article.value.content || '', { gfm: true }))
    activeId.value = ''
    nextTick(enhance)
  },
  { immediate: true },
)

function enhance() {
  const root = bodyRef.value
  if (!root) return

  const headings = [...root.querySelectorAll('h2, h3')]
  toc.value = headings.map((h, i) => {
    const id = `sec-${i + 1}`
    h.id = id
    return { id, text: h.textContent.trim(), level: Number(h.tagName.slice(1)) }
  })

  root.querySelectorAll('pre code').forEach((el) => highlightElement(el))
  root.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy')) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy'
    btn.textContent = '复制'
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.innerText || '')
        btn.textContent = '已复制 ✓'
        setTimeout(() => (btn.textContent = '复制'), 1500)
      } catch {
        btn.textContent = '复制失败'
      }
    })
    pre.appendChild(btn)
  })

  onScroll()
}

function onScroll() {
  const root = bodyRef.value
  if (!root) return
  const heads = [...root.querySelectorAll('h2, h3')]
  let current = heads[0]?.id || ''
  for (const h of heads) {
    if (h.getBoundingClientRect().top <= 110) current = h.id
    else break
  }
  activeId.value = current
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

function toggleFavorite() {
  if (article.value) toggleFav('knowledge', article.value.id)
}
</script>

<template>
  <div v-if="article" class="main-inner main-inner--wide">
    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink to="/knowledge">知识库</RouterLink>
      <span class="sep">/</span>
      <RouterLink :to="{ path: '/knowledge', query: { category: article.category } }">{{ category.label }}</RouterLink>
      <span class="sep">/</span>
      <span class="current">{{ article.title }}</span>
    </nav>

    <div class="doc-layout">
      <article class="doc-body">
        <header class="doc-head">
          <div class="doc-kicker">
            <span class="cat-dot" :style="{ background: category.color }"></span>
            {{ category.label }} · {{ article.readingMinutes }} 分钟读完 · {{ article.level }}
          </div>
          <div class="detail-title-row">
            <h1 class="doc-title">{{ article.title }}</h1>
            <button class="fav-btn" :class="{ 'is-on': fav }" type="button" @click="toggleFavorite">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" />
              </svg>
              {{ fav ? '已收藏' : '收藏' }}
            </button>
          </div>
          <p class="doc-summary">{{ article.summary }}</p>
          <div class="doc-tags">
            <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </header>

        <div ref="bodyRef" class="prose doc-prose" v-html="html"></div>

        <section v-if="article.sources.length" class="doc-sources">
          <h2>参考来源</h2>
          <ul>
            <li v-for="src in article.sources" :key="src.url">
              <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
            </li>
          </ul>
          <p class="source-note">
            本文按官方文档与源码行为整理，代码示例只演示关键用法，省略了 import、getter/setter 等样板代码。
          </p>
        </section>

        <nav class="detail-nav" aria-label="上下篇">
          <RouterLink v-if="prev" class="detail-nav__item" :to="`/knowledge/${prev.id}`">
            <span>← 上一篇</span>
            <strong>{{ prev.title }}</strong>
          </RouterLink>
          <span v-else class="detail-nav__item is-empty"></span>
          <RouterLink v-if="next" class="detail-nav__item detail-nav__item--next" :to="`/knowledge/${next.id}`">
            <span>下一篇 →</span>
            <strong>{{ next.title }}</strong>
          </RouterLink>
        </nav>
      </article>

      <TocPanel :items="toc" :active-id="activeId" />
    </div>
  </div>

  <div v-else class="main-inner">
    <div class="empty-state">
      <span class="empty-icon">📄</span>
      <h3>没有找到这篇文章</h3>
      <p>链接可能拼错了，或者文章还没写完。</p>
      <RouterLink class="btn btn-sm" to="/knowledge">返回知识库</RouterLink>
    </div>
  </div>
</template>