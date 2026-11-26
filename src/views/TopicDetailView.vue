<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import TocPanel from '../components/TocPanel.vue'
import { getTopic, getTopicArticle, getTopicArticles } from '../data/topics'
import { highlightElement } from '../utils/highlight'

const route = useRoute()

const topic = computed(() => getTopic(String(route.params.topic || '')))
const article = computed(() =>
  topic.value ? getTopicArticle(topic.value.id, String(route.params.id || '')) : null,
)
const articles = computed(() => (topic.value ? getTopicArticles(topic.value.id) : []))
const index = computed(() => (article.value ? articles.value.findIndex((a) => a.id === article.value.id) : -1))
const prev = computed(() => (index.value > 0 ? articles.value[index.value - 1] : null))
const next = computed(() =>
  index.value >= 0 && index.value < articles.value.length - 1 ? articles.value[index.value + 1] : null,
)

const html = ref('')
const toc = ref([])
const activeId = ref('')
const bodyRef = ref(null)

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

function coordVersion(c) {
  return c.managed ? 'Boot BOM 管理' : c.version
}
</script>

<template>
  <div v-if="article && topic" class="main-inner main-inner--wide">
    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink to="/topics">实战专题</RouterLink>
      <span class="sep">/</span>
      <RouterLink :to="`/topics/${topic.id}`">{{ topic.label }}</RouterLink>
      <span class="sep">/</span>
      <span class="current">{{ article.title }}</span>
    </nav>

    <div class="doc-layout">
      <article class="doc-body">
        <header class="doc-head">
          <div class="doc-kicker">
            <span class="cat-dot" :style="{ background: topic.color }"></span>
            {{ topic.label }} · {{ article.readingMinutes }} 分钟读完 · {{ article.level }}
          </div>
          <h1 class="doc-title">{{ article.title }}</h1>
          <p class="doc-summary">{{ article.summary }}</p>
          <div class="doc-tags">
            <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </header>

        <div ref="bodyRef" class="prose doc-prose" v-html="html"></div>

        <section v-if="article.coordinates.length" class="coord-section">
          <h2>坐标速查</h2>
          <p class="coord-note">
            下表与正文一一对应。标「Boot BOM 管理」的不需要写版本；其余版本号在 Maven Central 上真实存在。
          </p>
          <div class="table-wrap">
            <table class="attr-table coord-table">
              <thead>
                <tr>
                  <th>依赖（groupId:artifactId）</th>
                  <th>版本</th>
                  <th>用途</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in article.coordinates" :key="`${c.groupId}:${c.artifactId}`">
                  <td><code>{{ c.groupId }}:{{ c.artifactId }}</code></td>
                  <td>{{ coordVersion(c) }}</td>
                  <td>{{ c.usage }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="article.sources.length" class="doc-sources">
          <h2>参考来源</h2>
          <ul>
            <li v-for="src in article.sources" :key="src.url">
              <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
            </li>
          </ul>
          <p class="source-note">
            内容按官方文档与 Maven Central 实际发布版本整理；代码示例只演示关键写法，省略了 import、getter/setter 等样板代码。
          </p>
        </section>

        <nav class="detail-nav" aria-label="上下篇">
          <RouterLink v-if="prev" class="detail-nav__item" :to="`/topics/${topic.id}/${prev.id}`">
            <span>← 上一篇</span>
            <strong>{{ prev.title }}</strong>
          </RouterLink>
          <span v-else class="detail-nav__item is-empty"></span>
          <RouterLink
            v-if="next"
            class="detail-nav__item detail-nav__item--next"
            :to="`/topics/${topic.id}/${next.id}`"
          >
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
      <h3>没有找到这篇专题内容</h3>
      <p>链接可能拼错了，或者这一块还在写。</p>
      <RouterLink class="btn btn-sm" to="/topics">返回实战专题</RouterLink>
    </div>
  </div>
</template>