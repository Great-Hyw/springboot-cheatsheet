#!/usr/bin/env node
/**
 * 数据校验脚本：node scripts/validate-data.mjs
 *
 * 检查 src/data/annotations-*.json 与 src/data/knowledge-*.json 的结构、
 * 字段长度、分类、链接白名单、重复项，并在 tools/annotation-audit/index/annotations.txt
 * 存在时核对「包名 / 属性名 / 默认值」是否真实（反瞎写）。
 *
 * 退出码：0 = 没有错误（可以有警告）；1 = 有错误。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'src', 'data')
const INDEX_FILE = path.join(ROOT, 'tools', 'annotation-audit', 'index', 'annotations.txt')

const ANNOTATION_CATEGORIES = new Set(['core', 'aop', 'web', 'validation', 'data', 'async', 'boot', 'test', 'security'])
const KNOWLEDGE_CATEGORIES = new Set(['principle', 'web', 'data', 'boot', 'test', 'engineering', 'migration'])
const LEVELS = new Set(['入门', '进阶'])
const ALLOWED_HOSTS = [
  'docs.spring.io',
  'jakarta.ee',
  'mybatis.org',
  'hibernate.org',
  'github.com',
]
const errors = []
const warnings = []
const currentFile = () => (globalThis.__file || '(unknown)')

function err(file, where, msg) {
  errors.push(`${path.basename(file)} › ${where}：${msg}`)
}
function warn(file, where, msg) {
  warnings.push(`${path.basename(file)} › ${where}：${msg}`)
}
function cjkLen(s) {
  return (String(s).match(/[\u4e00-\u9fff]/g) || []).length
}
function visibleLen(s) {
  return String(s).replace(/\s+/g, '').length
}
function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}
function nonEmptyString(v, min = 1, max = Infinity) {
  return typeof v === 'string' && v.trim().length >= min && v.trim().length <= max
}
function isUrl(u) {
  try {
    const url = new URL(u)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/* ---------------- 真实注解索引（javap 提取） ---------------- */
const annotationIndex = new Map()
function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) return
  const text = fs.readFileSync(INDEX_FILE, 'utf8')
  const lines = text.split(/\r?\n/)
  let cur = null
  for (const raw of lines) {
    const line = raw.replace(/\uFFFD/g, '')
    const m = line.match(/^##\s+([\w.$]+)\s*$/)
    if (m) {
      cur = { fqcn: m[1], targets: [], retention: '', attrs: new Map() }
      annotationIndex.set(m[1], cur)
      continue
    }
    if (!cur) continue
    const t = line.match(/^target:\s*(.+)$/)
    if (t) {
      cur.targets = t[1].split(',').map((s) => s.trim()).filter(Boolean)
      continue
    }
    const r = line.match(/^retention:\s*(.+)$/)
    if (r) {
      cur.retention = r[1].trim()
      continue
    }
    // 两种行：`  - Type name() default X` 与无默认值的 `  - Type name()   // no default`
    const a = line.match(/^\s+-\s+([\w$.]+(?:\[\])?)\s+(\w+)\(\)\s+(.*)$/)
    if (a) {
      const rest = a[3].replace(/\/\/.*$/, '').trim()
      const m = rest.match(/^default\s?(.*)$/)
      cur.attrs.set(a[2], {
        type: a[1],
        default: m ? m[1].trim() : '',
        required: a[3].trim().startsWith('//'),
      })
    }
  }
}
loadIndex()

function sameDefault(given, truth) {
  const norm = (s) => s.replace(/^"|"$/g, '').replace(/'/g, '').trim()
  const g = norm(String(given))
  const t = norm(String(truth))
  if (g === t) return true
  // 类默认值：数据里写 Annotation.class，索引打印 interface java.lang.annotation.Annotation
  if (g.endsWith('.class')) {
    const gSimple = g.slice(0, -6).split('.').pop()
    const tSimple = t.replace(/^(interface|class|enum)\s+/, '').split('.').pop()
    return gSimple === tSimple
  }
  return false
}

function checkDocLink(file, where, docs, { min = 1, max = 2 } = {}) {
  if (!Array.isArray(docs) || docs.length < min || docs.length > max) {
    err(file, where, `docs 必须是 ${min}–${max} 个链接的数组`)
    return
  }
  docs.forEach((d, i) => {
    if (!isPlainObject(d) || !nonEmptyString(d.label) || !nonEmptyString(d.url)) {
      err(file, `${where}.docs[${i}]`, '需要 label 与 url')
      return
    }
    if (!isUrl(d.url)) {
      err(file, `${where}.docs[${i}]`, `不是合法 URL：${d.url}`)
      return
    }
    const u = new URL(d.url)
    const hostOk = ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))
    if (!hostOk) err(file, `${where}.docs[${i}]`, `域名不在白名单：${u.hostname}`)
    if ((u.pathname === '/' || u.pathname === '') && !u.hash) {
      warn(file, `${where}.docs[${i}]`, '建议用具体页面而不是站点首页')
    }
  })
}

/* ---------------- 注解条目 ---------------- */
function validateAnnotation(file, item, i) {
  const where = `items[${i}] ${item && item.id ? `(${item.id})` : ''}`
  if (!isPlainObject(item)) return err(file, where, '不是对象')

  const requiredStrings = ['id', 'name', 'category', 'subcategory', 'package', 'level', 'tagline', 'plain', 'exampleTitle', 'example']
  for (const k of requiredStrings) {
    if (!nonEmptyString(item[k])) err(file, `${where}.${k}`, '缺失或不是非空字符串')
  }
  if (item.since !== undefined && !nonEmptyString(item.since)) err(file, `${where}.since`, '可选，但写了就不能为空')
  if (item.versionNote !== undefined && item.versionNote !== null && !nonEmptyString(item.versionNote)) {
    err(file, `${where}.versionNote`, '必须是 null 或非空字符串')
  }

  if (item.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id)) err(file, `${where}.id`, '必须是 kebab-case')
  if (item.name && !item.name.startsWith('@')) err(file, `${where}.name`, '必须以 @ 开头')
  if (item.category && !ANNOTATION_CATEGORIES.has(item.category)) err(file, `${where}.category`, `未知分类 ${item.category}`)
  if (item.level && !LEVELS.has(item.level)) err(file, `${where}.level`, `必须是 入门/进阶`)
  if (item.subcategory && cjkLen(item.subcategory) < 2) warn(file, `${where}.subcategory`, '建议 2–8 个汉字')
  if (item.tagline && cjkLen(item.tagline) > 22) err(file, `${where}.tagline`, `超过 22 个汉字（当前 ${cjkLen(item.tagline)}）`)
  if (item.plain) {
    // 按规范「80–200 字」计可见字符（含标点/数字），不要求纯汉字——
    // 否则规范自带的 @Component 样例（132 可见字符 / 64 汉字）会被误判。
    const n = visibleLen(item.plain)
    if (n < 80 || n > 200) err(file, `${where}.plain`, `应为 80–200 字（当前 ${n} 个可见字符）`)
  }
  if (item.package && !/^[a-z][A-Za-z0-9_$]*(\.[A-Za-z_$][\w$]*)+$/.test(item.package)) {
    err(file, `${where}.package`, `不像全限定名：${item.package}`)
  }

  if (!Array.isArray(item.keyPoints) || item.keyPoints.length < 3 || item.keyPoints.length > 5) {
    err(file, `${where}.keyPoints`, '需要 3–5 条')
  } else {
    item.keyPoints.forEach((k, j) => {
      if (!nonEmptyString(k) || visibleLen(k) < 8) err(file, `${where}.keyPoints[${j}]`, '太短或为空')
    })
  }

  if (!Array.isArray(item.attributes)) {
    err(file, `${where}.attributes`, '必须是数组（没有属性写 []）')
  } else if (item.attributes.length > 8) {
    err(file, `${where}.attributes`, `最多 8 条（当前 ${item.attributes.length}）`)
  } else {
    item.attributes.forEach((a, j) => {
      if (!isPlainObject(a) || !nonEmptyString(a.name) || !nonEmptyString(a.type) || !nonEmptyString(a.desc)) {
        err(file, `${where}.attributes[${j}]`, '需要 name / type / default / desc')
        return
      }
      if (!/^[A-Za-z_$][\w$]*$/.test(a.name)) err(file, `${where}.attributes[${j}].name`, `属性名不合法：${a.name}`)
      if (a.default === undefined || a.default === null) err(file, `${where}.attributes[${j}].default`, '缺失（无默认值写 "—"）')
    })
  }

  if (item.example) {
    const lines = item.example.split('\n').length
    if (lines < 15 || lines > 40) warn(file, `${where}.example`, `建议 15–40 行（当前 ${lines} 行）`)
    if (item.example.includes('```')) err(file, `${where}.example`, '不要包含 ``` 围栏')
    if (item.name && !item.example.includes(item.name)) warn(file, `${where}.example`, `示例里没有用到 ${item.name}`)
  }

  if (!Array.isArray(item.notes) || item.notes.length < 2 || item.notes.length > 4) {
    err(file, `${where}.notes`, '需要 2–4 条')
  }
  if (!Array.isArray(item.related) || item.related.length < 2 || item.related.length > 5) {
    err(file, `${where}.related`, '需要 2–5 个注解名')
  } else {
    item.related.forEach((r, j) => {
      if (!nonEmptyString(r) || !r.startsWith('@')) err(file, `${where}.related[${j}]`, '必须是带 @ 的注解名')
    })
  }
  if (!Array.isArray(item.tags) || item.tags.length < 2 || item.tags.length > 5) {
    err(file, `${where}.tags`, '需要 2–5 个标签')
  }
  checkDocLink(file, where, item.docs)

  /* ---- 对照真实注解索引：包名 / 注解名 / 属性名 / 默认值 ---- */
  if (annotationIndex.size && nonEmptyString(item.package)) {
    const real = annotationIndex.get(item.package)
    if (!real) {
      err(file, `${where}.package`, `索引中找不到 ${item.package}（拼写错误或不是 Boot 3.5 依赖中的注解）`)
    } else {
      const simple = item.package.split('.').pop()
      if (item.name && item.name.replace(/^@/, '') !== simple) {
        warn(file, `${where}.name`, `@${simple} 与 package 最后一段不一致（检查是否写错包）`)
      }
      if (Array.isArray(item.attributes)) {
        for (const a of item.attributes) {
          if (!isPlainObject(a) || !nonEmptyString(a.name)) continue
          const realAttr = real.attrs.get(a.name)
          if (!realAttr) {
            err(file, `${where}.attributes`, `属性 ${a.name} 在 ${item.package} 中不存在`)
            continue
          }
          const given = String(a.default).trim()
          const truth = realAttr.default.trim()
          if (given === '—') {
            if (truth !== '') warn(file, `${where}.attributes.${a.name}.default`, `写的是 —，但真实默认值为 ${truth}`)
          } else if (truth !== '' && !sameDefault(given, truth)) {
            warn(file, `${where}.attributes.${a.name}.default`, `默认值可能与真实值不一致：写了 ${given}，索引为 ${truth}`)
          }
        }
      }
      if (real.retention && Array.isArray(item.keyPoints)) {
        // 只做弱提示，避免误报
      }
    }
  }
}

/* ---------------- 知识文章 ---------------- */
function validateKnowledge(file, item, i) {
  const where = `items[${i}] ${item && item.id ? `(${item.id})` : ''}`
  if (!isPlainObject(item)) return err(file, where, '不是对象')

  for (const k of ['id', 'title', 'category', 'level', 'summary', 'content']) {
    if (!nonEmptyString(item[k])) err(file, `${where}.${k}`, '缺失或不是非空字符串')
  }
  if (item.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id)) err(file, `${where}.id`, '必须是 kebab-case')
  if (item.category && !KNOWLEDGE_CATEGORIES.has(item.category)) err(file, `${where}.category`, `未知分类 ${item.category}`)
  if (item.level && !LEVELS.has(item.level)) err(file, `${where}.level`, '必须是 入门/进阶')
  if (item.summary && cjkLen(item.summary) > 60) err(file, `${where}.summary`, `超过 60 字（当前 ${cjkLen(item.summary)}）`)
  if (!Number.isInteger(item.readingMinutes) || item.readingMinutes < 1 || item.readingMinutes > 30) {
    err(file, `${where}.readingMinutes`, '需要 1–30 的整数')
  }
  if (!Array.isArray(item.tags) || item.tags.length < 2 || item.tags.length > 5) {
    err(file, `${where}.tags`, '需要 2–5 个标签')
  }
  if (item.content) {
    const sections = (item.content.match(/^##\s+/gm) || []).length
    if (sections < 2 || sections > 4) err(file, `${where}.content`, `需要 2–4 个 ## 小节（当前 ${sections}）`)
    const n = cjkLen(item.content)
    if (n < 550 || n > 1300) err(file, `${where}.content`, `正文应约 600–1200 字（当前 ${n} 个汉字）`)
    if (!/```|\n\|/.test(item.content)) warn(file, `${where}.content`, '建议至少含 1 段代码 / 表格 / 清单')
  }
  checkDocLink(file, where, item.sources, { min: 1, max: 3 })
}

/* ---------------- 主流程 ---------------- */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    err(file, 'JSON', `解析失败：${e.message}`)
    return null
  }
}

const annotationIds = new Map()
const annotationNames = new Map()
const annotationNameSet = new Set()
const knowledgeIds = new Map()

const files = fs.existsSync(DATA_DIR)
  ? fs
      .readdirSync(DATA_DIR)
      .filter((f) => f.endsWith('.json') && f !== 'audit-summary.json' && !f.startsWith('commands-'))
      .sort()
  : []
if (!files.length) {
  console.log('⚠️  src/data 下还没有 JSON 数据文件（作者正在生成），本次不校验。')
  process.exit(0)
}

for (const name of files) {
  const file = path.join(DATA_DIR, name)
  const data = readJson(file)
  if (!data) continue
  if (!isPlainObject(data) || !Array.isArray(data.items)) {
    err(file, '顶层', '必须是 { generatedBy, items: [...] } 结构')
    continue
  }
  if (!nonEmptyString(data.generatedBy)) warn(file, 'generatedBy', '建议写明作者角色')
  const isAnnotation = name.startsWith('annotations-')
  const isKnowledge = name.startsWith('knowledge-')
  if (!isAnnotation && !isKnowledge) {
    warn(file, '文件名', '不是 annotations-*/knowledge-*，前端不会加载')
    continue
  }
  const seen = new Set()
  data.items.forEach((item, i) => {
    if (!isPlainObject(item)) return
    if (item.id) {
      if (seen.has(item.id)) err(file, `items[${i}].id`, `文件内重复 id：${item.id}`)
      seen.add(item.id)
      const registry = isAnnotation ? annotationIds : knowledgeIds
      if (registry.has(item.id)) err(file, `items[${i}].id`, `跨文件重复 id：${item.id}（另见 ${path.basename(registry.get(item.id))}）`)
      else registry.set(item.id, file)
    }
    if (isAnnotation) {
      if (item.name) {
        // 同名不同包是合法的（例如 Spring Data 与 MyBatis 都有 @Param），
        // 因此按 name + package 去重；同一个注解被写两遍仍会报错。
        const nameKey = `${item.name}|${item.package || ''}`
        if (annotationNames.has(nameKey)) err(file, `items[${i}].name`, `重复注解：${item.name}（${item.package || '未知包'}）`)
        else annotationNames.set(nameKey, file)
        annotationNameSet.add(item.name)
      }
      validateAnnotation(file, item, i)
    } else {
      validateKnowledge(file, item, i)
    }
  })
  console.log(`✔ 已检查 ${name}（${data.items.length} 条）`)
}

/* 对照检查 related 是否指向已知注解（仅警告） */
for (const name of files.filter((f) => f.startsWith('annotations-'))) {
  const file = path.join(DATA_DIR, name)
  let data
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    continue
  }
  for (const item of data.items || []) {
    for (const rel of item.related || []) {
      if (!annotationNameSet.has(rel)) warn(file, `${item.id}.related`, `${rel} 不在本站收录范围内（确认拼写）`)
    }
  }
}

console.log('')
for (const w of warnings) console.log(`⚠️  ${w}`)
for (const e of errors) console.log(`❌ ${e}`)
console.log('')
console.log(`结果：${errors.length} 个错误，${warnings.length} 个警告；注解索引 ${annotationIndex.size} 个。`)
if (errors.length) {
  console.log('请修复错误后重跑：node scripts/validate-data.mjs')
  process.exit(1)
}
console.log('✅ 校验通过')