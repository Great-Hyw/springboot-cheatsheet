<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import CodeBlock from '../components/CodeBlock.vue'
import { annotationCategory, annotations, getAnnotation, getAnnotationByName } from '../data'
import { useFavorites } from '../composables/useFavorites'

const route = useRoute()
const { isFav, toggleFav } = useFavorites()

const item = computed(() => getAnnotation(String(route.params.id)))
const category = computed(() => (item.value ? annotationCategory(item.value.category) : null))
const fav = computed(() => (item.value ? isFav('annotation', item.value.id) : false))
const copied = ref(false)

const siblings = computed(() =>
  item.value ? annotations.filter((a) => a.category === item.value.category) : [],
)
const index = computed(() => (item.value ? siblings.value.findIndex((a) => a.id === item.value.id) : -1))
const prev = computed(() => (index.value > 0 ? siblings.value[index.value - 1] : null))
const next = computed(() =>
  index.value >= 0 && index.value < siblings.value.length - 1 ? siblings.value[index.value + 1] : null,
)

const related = computed(() => {
  if (!item.value) return []
  return item.value.related.map((name) => ({ name, target: getAnnotationByName(name) }))
})

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

async function copyPackage() {
  if (!item.value) return
  try {
    await navigator.clipboard.writeText(item.value.package)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    copied.value = false
  }
}

function toggleFavorite() {
  if (item.value) toggleFav('annotation', item.value.id)
}
</script>

<template>
  <div v-if="item" class="main-inner">
    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink to="/annotations">注解速查</RouterLink>
      <span class="sep">/</span>
      <RouterLink :to="{ path: '/annotations', query: { category: item.category } }">{{ category.label }}</RouterLink>
      <span class="sep">/</span>
      <span class="current">{{ item.name }}</span>
    </nav>

    <header class="detail-head">
      <div class="detail-title-row">
        <h1 class="detail-title">{{ item.name }}</h1>
        <button class="fav-btn" :class="{ 'is-on': fav }" type="button" @click="toggleFavorite">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" />
          </svg>
          {{ fav ? '已收藏' : '收藏' }}
        </button>
      </div>
      <p class="detail-tagline">{{ item.tagline }}</p>
      <div class="detail-meta">
        <span class="pill" :class="item.level === '进阶' ? 'pill--advanced' : 'pill--beginner'">{{ item.level }}</span>
        <span class="meta-item">
          <span class="cat-dot" :style="{ background: category.color }"></span>
          {{ category.label }}
          <template v-if="item.subcategory"> · {{ item.subcategory }}</template>
        </span>
        <span v-if="item.since" class="meta-item">自 {{ item.since }}</span>
        <span class="meta-item meta-package">
          <code>{{ item.package }}</code>
          <button class="copy-inline" type="button" :title="copied ? '已复制' : '复制包名'" @click="copyPackage">
            {{ copied ? '✓' : '复制' }}
          </button>
        </span>
      </div>
    </header>

    <section class="detail-section">
      <h2>一句话讲清</h2>
      <div class="plain-box">{{ item.plain }}</div>
    </section>

    <section v-if="item.keyPoints.length" class="detail-section">
      <h2>关键点</h2>
      <ul class="point-list">
        <li v-for="point in item.keyPoints" :key="point">{{ point }}</li>
      </ul>
    </section>

    <section class="detail-section">
      <h2>可用属性 <small v-if="item.attributes.length">共 {{ item.attributes.length }} 个</small></h2>
      <div v-if="item.attributes.length" class="table-wrap">
        <table class="attr-table">
          <thead>
            <tr>
              <th>属性</th>
              <th>类型</th>
              <th>默认值</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="attr in item.attributes" :key="attr.name">
              <td><code>{{ attr.name }}</code></td>
              <td><code class="attr-type">{{ attr.type }}</code></td>
              <td><code class="attr-default">{{ attr.default === '' ? '（空）' : attr.default }}</code></td>
              <td>{{ attr.desc }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="page-desc">这个注解本身没有可配置属性，作用完全由它标注的位置决定。</p>
    </section>

    <section class="detail-section">
      <h2>代码示例</h2>
      <CodeBlock :code="item.example" :title="item.exampleTitle" />
      <p class="source-note" style="margin-top: 10px">示例只演示这个注解的用法，依赖的其它类（如 Service、User）是示意，不是 Spring 自带类。</p>
    </section>

    <section v-if="item.notes.length" class="detail-section">
      <h2>容易踩的坑</h2>
      <ul class="note-list">
        <li v-for="note in item.notes" :key="note">{{ note }}</li>
      </ul>
    </section>

    <section v-if="item.versionNote" class="detail-section">
      <h2>版本提示</h2>
      <div class="callout callout--warn">
        <strong>版本差异</strong>
        <p>{{ item.versionNote }}</p>
      </div>
    </section>

    <section v-if="related.length" class="detail-section">
      <h2>相关注解</h2>
      <div class="chips">
        <template v-for="r in related" :key="r.name">
          <RouterLink v-if="r.target" class="chip" :to="`/annotations/${r.target.id}`">{{ r.name }}</RouterLink>
          <span v-else class="chip chip--muted">{{ r.name }}</span>
        </template>
      </div>
    </section>

    <section class="detail-section">
      <h2>官方文档</h2>
      <div class="doc-links">
        <a v-for="doc in item.docs" :key="doc.url" class="doc-link" :href="doc.url" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M14 3h7v7m0-7L10 14" />
            <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
          </svg>
          <span>{{ doc.label }}</span>
          <small>{{ host(doc.url) }}</small>
        </a>
      </div>
      <p class="source-note">
        属性与默认值另经 Spring Boot 3.5.16 依赖索引（反射扫描）核对。若页面内容与官方文档冲突，以官方文档为准。
      </p>
    </section>

    <nav class="detail-nav" aria-label="同分类上下篇">
      <RouterLink v-if="prev" class="detail-nav__item" :to="`/annotations/${prev.id}`">
        <span>← 上一个</span>
        <strong>{{ prev.name }}</strong>
      </RouterLink>
      <span v-else class="detail-nav__item is-empty"></span>
      <RouterLink v-if="next" class="detail-nav__item detail-nav__item--next" :to="`/annotations/${next.id}`">
        <span>下一个 →</span>
        <strong>{{ next.name }}</strong>
      </RouterLink>
    </nav>
  </div>

  <div v-else class="main-inner">
    <div class="empty-state">
      <span class="empty-icon">🧭</span>
      <h3>没有找到这个注解</h3>
      <p>链接可能拼错了，或者这条注解还没收录。可以去速查页看看，或用 ⌘K 搜索。</p>
      <RouterLink class="btn btn-sm" to="/annotations">返回注解速查</RouterLink>
    </div>
  </div>
</template>