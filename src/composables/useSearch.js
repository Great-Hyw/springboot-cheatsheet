import { computed, ref } from 'vue'
import Fuse from 'fuse.js'
import { annotations, knowledge, getAnnotation } from '../data'

const open = ref(false)
const query = ref('')

const annIndex = shallowDocs(
  annotations.map((a) => ({
    type: 'annotation',
    id: a.id,
    title: a.name,
    subtitle: a.tagline,
    tags: a.tags,
    text: [a.plain, ...a.keyPoints, a.package, a.subcategory].join(' '),
  })),
)
const knIndex = shallowDocs(
  knowledge.map((k) => ({
    type: 'knowledge',
    id: k.id,
    title: k.title,
    subtitle: k.summary,
    tags: k.tags,
    text: k.content,
  })),
)

function shallowDocs(docs) {
  return docs
}

const fuseOptions = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.34,
  minMatchCharLength: 1,
  keys: [
    { name: 'title', weight: 3 },
    { name: 'subtitle', weight: 2 },
    { name: 'tags', weight: 2 },
    { name: 'text', weight: 1 },
  ],
}

let annFuse = null
let knFuse = null
function ensureFuse() {
  if (!annFuse) annFuse = new Fuse(annIndex, fuseOptions)
  if (!knFuse) knFuse = new Fuse(knIndex, fuseOptions)
}

const DEFAULT_ANN = ['springboot-application', 'rest-controller', 'autowired', 'transactional', 'configuration-properties', 'request-mapping']
  .map(getAnnotation)
  .filter(Boolean)

function fallback() {
  return {
    annotations: DEFAULT_ANN.slice(0, 5).map((a) => ({ item: annIndex.find((d) => d.id === a.id) })).filter((r) => r.item),
    knowledge: knowledge.slice(0, 3).map((k) => ({ item: knIndex.find((d) => d.id === k.id) })),
  }
}

const results = computed(() => {
  const q = query.value.trim()
  if (!q) return fallback()
  ensureFuse()
  return {
    annotations: annFuse.search(q, { limit: 8 }),
    knowledge: knFuse.search(q, { limit: 5 }),
  }
})

const flatResults = computed(() => [
  ...results.value.annotations.map((r) => r.item),
  ...results.value.knowledge.map((r) => r.item),
])

function openSearch() {
  open.value = true
}
function closeSearch() {
  open.value = false
  query.value = ''
}

export function useSearch() {
  return { open, query, results, flatResults, openSearch, closeSearch }
}