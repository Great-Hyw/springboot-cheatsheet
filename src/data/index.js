/**
 * 数据聚合层：把 src/data 下由多位作者产出的 annotations-*.json /
 * knowledge-*.json 合并成前端可直接用的数组。
 *
 * 用 import.meta.glob（而不是静态 import）的原因：数据文件可能尚未生成，
 * 缺失时不会让开发/构建直接崩掉，页面会优雅地显示「暂无数据」。
 */
import {
  ANNOTATION_CATEGORIES,
  KNOWLEDGE_CATEGORIES,
  annotationCategory,
  knowledgeCategory,
} from './categories'

const annModules = import.meta.glob('./annotations-*.json', { eager: true })
const knModules = import.meta.glob('./knowledge-*.json', { eager: true })
const summaryModules = import.meta.glob('./audit-summary.json', { eager: true })

function collectItems(modules) {
  const items = []
  for (const mod of Object.values(modules)) {
    const data = mod?.default ?? mod
    if (data && Array.isArray(data.items)) items.push(...data.items)
  }
  return items
}

const annOrder = new Map(ANNOTATION_CATEGORIES.map((c, i) => [c.id, i]))
const knOrder = new Map(KNOWLEDGE_CATEGORIES.map((c, i) => [c.id, i]))

function byCategoryThen(catOrder, getCat, getLabel) {
  return (a, b) => {
    const ca = catOrder.get(getCat(a)) ?? 99
    const cb = catOrder.get(getCat(b)) ?? 99
    if (ca !== cb) return ca - cb
    return String(getLabel(a)).localeCompare(String(getLabel(b)), 'zh-CN')
  }
}

function normalizeAnnotation(raw) {
  return {
    ...raw,
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    category: raw.category || '',
    subcategory: raw.subcategory || '',
    package: raw.package || '',
    level: raw.level === '进阶' ? '进阶' : '入门',
    tagline: raw.tagline || '',
    plain: raw.plain || '',
    keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints : [],
    attributes: Array.isArray(raw.attributes) ? raw.attributes : [],
    exampleTitle: raw.exampleTitle || '代码示例',
    example: raw.example || '',
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    related: Array.isArray(raw.related) ? raw.related : [],
    versionNote: raw.versionNote || null,
    docs: Array.isArray(raw.docs) ? raw.docs : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    since: raw.since || '',
  }
}

function normalizeKnowledge(raw) {
  return {
    ...raw,
    id: String(raw.id || ''),
    title: String(raw.title || ''),
    category: raw.category || '',
    level: raw.level === '进阶' ? '进阶' : '入门',
    readingMinutes: Number(raw.readingMinutes) || 5,
    summary: raw.summary || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    content: raw.content || '',
    sources: Array.isArray(raw.sources) ? raw.sources : [],
  }
}

const dedupe = (list, key) => {
  const seen = new Set()
  const out = []
  for (const item of list) {
    if (!item[key] || seen.has(item[key])) continue
    seen.add(item[key])
    out.push(item)
  }
  return out
}

export const annotations = dedupe(collectItems(annModules).map(normalizeAnnotation), 'id').sort(
  byCategoryThen(annOrder, (a) => a.category, (a) => a.name),
)

export const knowledge = dedupe(collectItems(knModules).map(normalizeKnowledge), 'id').sort(
  byCategoryThen(knOrder, (a) => a.category, (a) => a.title),
)

const annById = new Map(annotations.map((a) => [a.id, a]))
const annByName = new Map(annotations.map((a) => [a.name, a]))
const knById = new Map(knowledge.map((k) => [k.id, k]))

export function getAnnotation(id) {
  return annById.get(id) || null
}
export function getAnnotationByName(name) {
  return annByName.get(name) || null
}
export function getKnowledge(id) {
  return knById.get(id) || null
}

export const annotationCounts = new Map(
  ANNOTATION_CATEGORIES.map((c) => [c.id, annotations.filter((a) => a.category === c.id).length]),
)
export const knowledgeCounts = new Map(
  KNOWLEDGE_CATEGORIES.map((c) => [c.id, knowledge.filter((k) => k.category === c.id).length]),
)

export const stats = {
  annotations: annotations.length,
  knowledge: knowledge.length,
  categories: ANNOTATION_CATEGORIES.length,
  knowledgeCategories: KNOWLEDGE_CATEGORIES.length,
}

export const auditSummary = Object.values(summaryModules)[0]?.default ?? null

/** 首页推荐：挑最常用的注解，按给定顺序，缺失自动跳过 */
export const FEATURED_ANNOTATION_IDS = [
  'springboot-application',
  'rest-controller',
  'autowired',
  'request-mapping',
  'get-mapping',
  'transactional',
  'configuration',
  'configuration-properties',
  'request-body',
  'service',
]

export const featuredAnnotations = FEATURED_ANNOTATION_IDS.map(getAnnotation).filter(Boolean).slice(0, 8)

export { ANNOTATION_CATEGORIES, KNOWLEDGE_CATEGORIES, annotationCategory, knowledgeCategory }