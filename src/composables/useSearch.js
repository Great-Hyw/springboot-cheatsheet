import { computed, ref } from 'vue'
import Fuse from 'fuse.js'
import { annotations, knowledge, getAnnotation } from '../data'
import { commands, featuredCommands, COMMAND_TOOLS } from '../data/commands'
import { topics } from '../data/topics'

const open = ref(false)
const query = ref('')

const annIndex = annotations.map((a) => ({
  type: 'annotation',
  id: a.id,
  title: a.name,
  subtitle: a.tagline,
  tags: a.tags,
  text: [a.plain, ...a.keyPoints, a.package, a.subcategory].join(' '),
}))

const knIndex = knowledge.map((k) => ({
  type: 'knowledge',
  id: k.id,
  title: k.title,
  subtitle: k.summary,
  tags: k.tags,
  text: k.content,
}))

const toolLabel = Object.fromEntries(COMMAND_TOOLS.map((t) => [t.id, t.short]))
const cmdIndex = commands.map((c) => ({
  type: 'command',
  tool: c.tool,
  toolLabel: toolLabel[c.tool] || c.tool,
  id: c.id,
  title: c.name,
  subtitle: c.tagline,
  tags: c.tags,
  text: [c.plain, ...c.keyPoints, c.syntax, ...c.options.map((o) => o.flag)].join(' '),
}))

const topicIndex = topics.map((t) => ({
  type: 'topic',
  topic: t.topic,
  topicLabel: t.topicShort,
  id: t.id,
  title: t.title,
  subtitle: t.summary,
  tags: t.tags,
  text: [t.summary, ...t.tags, t.content].join(' '),
}))

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
let cmdFuse = null
let topicFuse = null
function ensureFuse() {
  if (!annFuse) annFuse = new Fuse(annIndex, fuseOptions)
  if (!knFuse) knFuse = new Fuse(knIndex, fuseOptions)
  if (!cmdFuse) cmdFuse = new Fuse(cmdIndex, fuseOptions)
  if (!topicFuse) topicFuse = new Fuse(topicIndex, fuseOptions)
}

const DEFAULT_ANN = ['springboot-application', 'rest-controller', 'autowired', 'transactional', 'configuration-properties', 'request-mapping']
  .map(getAnnotation)
  .filter(Boolean)

const findCmd = (id) => cmdIndex.find((d) => d.id === id)

function fallback() {
  return {
    annotations: DEFAULT_ANN.slice(0, 5).map((a) => ({ item: annIndex.find((d) => d.id === a.id) })).filter((r) => r.item),
    knowledge: knowledge.slice(0, 3).map((k) => ({ item: knIndex.find((d) => d.id === k.id) })),
    topics: topics.slice(0, 3).map((t) => ({ item: topicIndex.find((d) => d.id === t.id) })).filter((r) => r.item),
    linux: featuredCommands.linux.slice(0, 3).map((c) => ({ item: findCmd(c.id) })).filter((r) => r.item),
    git: featuredCommands.git.slice(0, 3).map((c) => ({ item: findCmd(c.id) })).filter((r) => r.item),
  }
}

const results = computed(() => {
  const q = query.value.trim()
  if (!q) return fallback()
  ensureFuse()
  const cmdHits = cmdFuse.search(q, { limit: 10 })
  return {
    annotations: annFuse.search(q, { limit: 8 }),
    knowledge: knFuse.search(q, { limit: 5 }),
    topics: topicFuse.search(q, { limit: 6 }),
    linux: cmdHits.filter((r) => r.item.tool === 'linux').slice(0, 5),
    git: cmdHits.filter((r) => r.item.tool === 'git').slice(0, 5),
  }
})

const flatResults = computed(() => [
  ...results.value.annotations.map((r) => r.item),
  ...results.value.knowledge.map((r) => r.item),
  ...results.value.topics.map((r) => r.item),
  ...results.value.linux.map((r) => r.item),
  ...results.value.git.map((r) => r.item),
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