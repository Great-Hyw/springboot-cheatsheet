#!/usr/bin/env node
/**
 * 四个实战专题（conventions / interview / layers / coordinates）独立审计。
 *
 * 用法：
 *   node tools/topics-audit/audit.mjs                      # 离线结构与内容审计
 *   node tools/topics-audit/audit.mjs --check-links        # 额外逐条检查 sources URL（串行 + 缓存）
 *   node tools/topics-audit/audit.mjs --check-coords       # 额外检查 Maven Central 坐标与版本（串行 + 缓存）
 *   node tools/topics-audit/audit.mjs --check-links --check-coords --refresh-cache
 *   node tools/topics-audit/audit.mjs --data-dir tools/topics-audit/fixtures --relaxed   # 自测
 *
 * 退出码：0=无错误，1=有错误，2=运行失败。
 * 报告：tools/topics-audit/report.json（+ report.md）。
 */
import fs from 'node:fs'
import path from 'node:path'

// ---------- CLI ----------
function parseArgs(argv) {
  const out = {
    dataDir: 'src/data',
    json: 'tools/topics-audit/report.json',
    md: 'tools/topics-audit/report.md',
    checkLinks: false,
    checkCoords: false,
    refreshCache: false,
    relaxed: false,
    allowMissing: false,
    verbose: false,
    timeout: 20000,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = (name) => {
      if (i + 1 >= argv.length) failHard(`参数 ${name} 缺少值`)
      return argv[++i]
    }
    if (a === '--data-dir') out.dataDir = val(a)
    else if (a === '--json') out.json = val(a)
    else if (a === '--md') out.md = val(a)
    else if (a === '--check-links') out.checkLinks = true
    else if (a === '--check-coords') out.checkCoords = true
    else if (a === '--refresh-cache') out.refreshCache = true
    else if (a === '--relaxed') out.relaxed = true
    else if (a === '--allow-missing') out.allowMissing = true
    else if (a === '--verbose') out.verbose = true
    else if (a === '--timeout') out.timeout = Number(val(a))
    else if (a === '--help' || a === '-h') {
      console.log('用法见文件头注释')
      process.exit(0)
    } else failHard(`未知参数：${a}`)
  }
  return out
}
function failHard(msg) {
  console.error(`[topics-audit] ${msg}`)
  process.exit(2)
}

const args = parseArgs(process.argv.slice(2))
const ROOT = process.cwd()
const DATA_DIR = path.resolve(ROOT, args.dataDir)
const OUT_JSON = path.resolve(ROOT, args.json)
const OUT_MD = path.resolve(ROOT, args.md)
const CACHE_DIR = path.resolve(ROOT, 'tools/topics-audit/.cache')
const CACHE_TTL = 7 * 24 * 3600 * 1000
const UA = 'Mozilla/5.0 (compatible; topics-audit/1.0; +local)'

// ---------- 规范（docs/TOPIC-SPEC.md） ----------
const SOURCE_DOMAINS = [
  'docs.spring.io', 'spring.io', 'github.com', 'jakarta.ee', 'hibernate.org',
  'mybatis.org', 'maven.apache.org', 'repo1.maven.org', 'micrometer.io',
  'testcontainers.com', 'projectlombok.org', 'mapstruct.org', 'flywaydb.org',
  'liquibase.org', 'redis.io', 'martinfowler.com', '12factor.net',
]
const GITHUB_ORG_ALLOWED = ['spring-projects'] // github.com 只允许 spring-projects 组织
const BAD_DOMAINS = ['csdn.net', 'juejin.cn', 'cnblogs.com', 'zhihu.com', 'segmentfault.com', 'jianshu.com', '51cto.com', 'oschina.net', 'infoq.cn']

const TOPICS = {
  conventions: {
    file: 'topics-conventions.json',
    label: 'Spring Boot 开发规范',
    author: 'content-boot',
    count: 10,
    cjk: [600, 1400],
    headings: ['推荐做法', '为什么', '落地检查清单'],
    extras: ['checklist'],
    ids: [
      'conventions-project-structure', 'conventions-constructor-injection', 'conventions-configuration',
      'conventions-rest-api', 'conventions-dto-validation', 'conventions-exception',
      'conventions-transaction', 'conventions-logging', 'conventions-testing', 'conventions-dependency',
    ],
  },
  interview: {
    file: 'topics-interview.json',
    label: '面试高频题（面经）',
    author: 'knowledge-a',
    count: 12,
    cjk: [600, 1400],
    headings: ['一句话答案', '展开讲', '追问与加分点', '别踩的坑'],
    extras: ['interview'],
    ids: [
      'interview-auto-configuration', 'interview-ioc-bean-lifecycle', 'interview-circular-dependency',
      'interview-aop-proxy', 'interview-transaction-failure', 'interview-mvc-request-flow',
      'interview-starter-principle', 'interview-config-priority', 'interview-bean-scope',
      'interview-filter-interceptor', 'interview-async-threadpool', 'interview-graceful-shutdown',
    ],
  },
  layers: {
    file: 'topics-layers.json',
    label: '现代企业分层写法',
    author: 'knowledge-b',
    count: 9,
    cjk: [600, 1400],
    headings: ['这一层负责什么', '怎么写', '边界与常见错误'],
    extras: [],
    ids: [
      'layers-architecture', 'layers-controller', 'layers-service', 'layers-repository',
      'layers-dto-conversion', 'layers-exception-errorcode', 'layers-transaction-boundary',
      'layers-common-module', 'layers-modularization',
    ],
  },
  coordinates: {
    file: 'topics-coordinates.json',
    label: '常用 Maven 坐标用法',
    author: 'content-data',
    count: 6,
    cjk: [350, 1400],
    headings: ['什么时候用', '坐标清单', '配置与坑'],
    extras: ['table', 'coordinates'],
    ids: [
      'coordinates-web', 'coordinates-data', 'coordinates-security',
      'coordinates-test', 'coordinates-ops', 'coordinates-utils',
    ],
  },
}

const FORBIDDEN_PHRASES = ['某公司真题', '大厂原题', '内部面经', '必考题', '全网最全', '我面过', '面试真题', '包过', '100% 通过']
const HYPE_PHRASES = ['最强', '神器', '保姆级', '一文学会', '秒懂', '天花板', 'yyds', '史上最']
const COMMAND_WORDS = [/\bgit\s+(?:clone|commit|push|reset|rebase|stash|fetch|pull)\b/, /\b(?:chmod|chown|systemctl|sudo|rm\s+-rf|tar\s+-)/]
const INTERVIEW_WORDS = ['面试官', '面试中', '面试时', '面试题']
const CN_NUM = /[\u3400-\u4dbf\u4e00-\u9fff]/g

// ---------- 结果 ----------
const issues = []
const add = (severity, code, ctx, message) => {
  issues.push({ severity, code, topic: ctx.topic || null, file: ctx.file || null, id: ctx.id || null, message })
}
const fail = (code, ctx, msg) => add('error', code, ctx, msg)
const warn = (code, ctx, msg) => add('warning', code, ctx, msg)
const info = (code, ctx, msg) => add('info', code, ctx, msg)

// ---------- 工具 ----------
const isStr = (v) => typeof v === 'string'
const cjkCount = (s) => ((s || '').match(CN_NUM) || []).length
const visibleLen = (s) => (s || '').replace(/\s/g, '').length
const sectionTitles = (content) => {
  const out = []
  const re = /^##\s+(.+?)\s*$/gm
  let m
  while ((m = re.exec(content))) out.push(m[1].trim())
  return out
}
const fnv1a = (str) => {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}
const stripCode = (content) => (content || '').replace(/```[\s\S]*?```/g, '')
const normalizeText = (s) => (s || '').toLowerCase().replace(/```[\s\S]*?```/g, '').replace(/[^\u4e00-\u9fff\w]+/g, '')
const shingleSet = (s, n = 6) => {
  const t = normalizeText(s)
  const set = new Set()
  if (t.length < n) return set
  for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n))
  return set
}
const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

// ---------- 缓存 ----------
function loadCache(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, name), 'utf8'))
  } catch {
    return {}
  }
}
function saveCache(name, obj) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(path.join(CACHE_DIR, name), JSON.stringify(obj, null, 1))
}

// ---------- 读已有数据（全局 id 冲突 / 搬运检查） ----------
function loadExistingData() {
  const ids = new Map()
  const docs = []
  if (!fs.existsSync(DATA_DIR)) return { ids, docs }
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (!f.endsWith('.json')) continue
    if (f.startsWith('topics-')) continue
    if (f === 'audit-summary.json') continue
    try {
      const doc = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
      if (Array.isArray(doc.items)) {
        docs.push({ file: f, items: doc.items })
        for (const it of doc.items) if (it && isStr(it.id)) ids.set(it.id, f)
      }
    } catch {
      /* 其他文件解析失败不归本脚本管 */
    }
  }
  return { ids, docs }
}

// ---------- 链接 / 坐标待查集合 ----------
const linksToCheck = new Map() // url -> ctx
const coordsToCheck = new Map() // groupId:artifactId -> {ctx, versions:Set}

// ---------- 单篇校验 ----------
const seenGlobalIds = new Map() // id -> file

function checkItem(topicKey, spec, item, index, ctxFile, existingIds, allItems) {
  const where = `${ctxFile} items[${index}]`
  const ctx = { topic: topicKey, file: ctxFile, id: item && isStr(item.id) ? item.id : null }
  if (!item || typeof item !== 'object') {
    fail('ITEM_INVALID', { topic: topicKey, file: ctxFile }, `${where}: 条目必须是对象`)
    return null
  }

  // id
  if (!isStr(item.id) || !item.id.trim()) {
    fail('ID_MISSING', ctx, `${where}: 缺少 id`)
  } else {
    const id = item.id
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail('ID_FORMAT', ctx, `${where}: id 不是 kebab-case（${id}）`)
    if (!id.startsWith(topicKey + '-')) fail('ID_PREFIX', ctx, `${where}: id 必须以 "${topicKey}-" 开头（${id}）`)
    if (!spec.ids.includes(id)) fail('ID_NOT_IN_SPEC', ctx, `${where}: id 不在规范清单内（${id}）`)
    if (seenGlobalIds.has(id)) fail('DUPLICATE_ID', ctx, `${where}: id 与 ${seenGlobalIds.get(id)} 重复（${id}）`)
    else seenGlobalIds.set(id, ctxFile)
    if (existingIds.has(id)) fail('DUPLICATE_ID_EXISTING', ctx, `${where}: id 与已有数据 ${existingIds.get(id)} 冲突（${id}）`)
  }

  // 通用字段
  if (!isStr(item.title) || !item.title.trim()) fail('TITLE_MISSING', ctx, `${where}: 缺少 title`)
  else {
    const tl = visibleLen(item.title)
    if (tl < 8 || tl > 30) warn('TITLE_LENGTH', ctx, `${where}: title 长度 ${tl}，规范要求 8–30 字（${item.title}）`)
  }
  if (!['入门', '进阶'].includes(item.level)) fail('LEVEL_INVALID', ctx, `${where}: level 必须是 入门/进阶`)
  if (!Number.isInteger(item.readingMinutes) || item.readingMinutes < 2 || item.readingMinutes > 10) {
    fail('READING_MINUTES_INVALID', ctx, `${where}: readingMinutes 必须是 2–10 的整数`)
  }
  if (!isStr(item.summary) || !item.summary.trim()) fail('SUMMARY_MISSING', ctx, `${where}: 缺少 summary`)
  else {
    const c = cjkCount(item.summary)
    if (c < 8) fail('SUMMARY_TOO_SHORT', ctx, `${where}: summary 汉字数 ${c}，过短`)
    if (c > 60) fail('SUMMARY_TOO_LONG', ctx, `${where}: summary 汉字数 ${c}，超过 60`)
  }
  if (!Array.isArray(item.tags) || item.tags.length < 2 || item.tags.length > 5) {
    fail('TAGS_COUNT', ctx, `${where}: tags 必须是 2–5 个`)
  } else {
    item.tags.forEach((t, i) => {
      if (!isStr(t) || !t.trim()) fail('TAG_EMPTY', ctx, `${where}: tags[${i}] 为空`)
      else if (visibleLen(t) > 12) info('TAG_LONG', ctx, `${where}: tags[${i}] 超过 12 字（${t}）`)
    })
    if (new Set(item.tags).size !== item.tags.length) warn('TAG_DUPLICATE', ctx, `${where}: tags 有重复`)
  }

  // 正文
  if (!isStr(item.content) || !item.content.trim()) {
    fail('CONTENT_MISSING', ctx, `${where}: 缺少 content`)
    return item
  }
  const content = item.content
  const cjk = cjkCount(content)
  if (!args.relaxed && (cjk < spec.cjk[0] || cjk > spec.cjk[1])) {
    fail('CJK_OUT_OF_RANGE', ctx, `${where}: 正文汉字数 ${cjk}，应在 ${spec.cjk[0]}–${spec.cjk[1]}`)
  }
  const headings = sectionTitles(content)
  if (!args.relaxed) {
    if (headings.length !== spec.headings.length) {
      fail('HEADINGS_COUNT', ctx, `${where}: 应有 ${spec.headings.length} 个 ## 小节，实际 ${headings.length}：${headings.join(' / ')}`)
    } else if (headings.some((h, i) => h !== spec.headings[i])) {
      fail('HEADINGS_MISMATCH', ctx, `${where}: 小节标题/顺序不符，应为 ${spec.headings.join(' / ')}，实际 ${headings.join(' / ')}`)
    }
  }
  // 代码围栏
  // 代码围栏（只检查开围栏是否标注语言）
  const fenceLines = content.match(/^```.*$/gm) || []
  if (fenceLines.length < 2) fail('CODE_FENCE_MISSING', ctx, `${where}: 缺少代码/配置示例（\`\`\` 围栏）`)
  else {
    let inFence = false
    let noLang = 0
    for (const line of fenceLines) {
      const lang = line.slice(3).trim()
      if (!inFence) { if (!lang) noLang++; inFence = true }
      else inFence = false
    }
    if (noLang > 0) warn('FENCE_NO_LANGUAGE', ctx, `${where}: ${noLang} 个代码围栏未标注语言（规范要求标注）`)
  }
  // 营销/真题话术（全分块禁止）
  for (const p of FORBIDDEN_PHRASES) {
    if (content.includes(p)) fail('FORBIDDEN_PHRASE', ctx, `${where}: 出现不可证实话术「${p}」`)
  }
  for (const p of HYPE_PHRASES) {
    if (content.includes(p)) warn('HYPE_PHRASE', ctx, `${where}: 出现营销话术「${p}」`)
  }
  // 跨块污染
  if (topicKey !== 'coordinates' && content.includes('groupId') && content.includes('artifactId') && content.includes('version')) {
    const coordTable = /依赖\s*\|\s*用途\s*\|\s*版本/.test(content)
    const hasPom = /<dependency>|<dependencies>|<parent>/.test(content)
    if (!coordTable) {
    } else {
      warn('CONTAMINATION_COORDINATES', ctx, `${where}: 非坐标分块出现成组坐标内容（疑似把坐标清单搬进其他分块）`)
    }
  }
  if (topicKey !== 'interview') {
    const hits = INTERVIEW_WORDS.filter((w) => content.includes(w)).length
    if (hits >= 2) warn('CONTAMINATION_INTERVIEW', ctx, `${where}: 非面经分块出现多处面试话术（${hits} 种）`)
  }
  for (const re of COMMAND_WORDS) {
    if (re.test(content)) warn('CONTAMINATION_COMMAND', ctx, `${where}: 出现 Git/Linux 命令（本专题不写命令，应属 /commands）`)
  }
  // 分块专属
  if (spec.extras.includes('checklist')) {
    const boxes = (content.match(/^- \[ \]/gm) || []).length
    if (boxes < 3) fail('CHECKLIST_MISSING', ctx, `${where}: 「落地检查清单」至少 3 条 - [ ] 勾选项，实际 ${boxes}`)
  }
  if (spec.extras.includes('table')) {
    const rows = (content.match(/^\|.*\|\s*$/gm) || []).length
    if (rows < 5) fail('TABLE_MISSING', ctx, `${where}: 「坐标清单」需要 Markdown 表格（含表头至少 5 行），实际 ${rows}`)
  }
  if (spec.extras.includes('coordinates')) checkCoordinates(item, ctx, where)

  if (spec.extras.includes('interview')) {
    // 一句话答案 2–4 句；展开讲 ≥300 汉字
    const sections = splitSections(content, spec.headings)
    const one = sections['一句话答案'] || ''
    const sentences = (one.match(/[。！？!?]/g) || []).length
    if (sentences < 2 || sentences > 8) info('ANSWER_SENTENCE_COUNT', ctx, `${where}: 「一句话答案」句数 ${sentences}（规范 2–4 句左右，1 句=1 标点）`)
    const expand = stripCode(sections['展开讲'] || '')
    const expVisible = visibleLen(expand)
    if (!args.relaxed && expVisible < 300) fail('EXPAND_TOO_SHORT', ctx, `${where}: 「展开讲」可见字符数 ${expVisible}（去代码），规范要求 300 字以上`)
  }

  // sources
  checkSources(item, ctx, where)
  return item
}

function splitSections(content) {
  const map = {}
  const re = /^##\s+(.+?)\s*$/gm
  const marks = []
  let m
  while ((m = re.exec(content))) marks.push({ title: m[1].trim(), lineStart: m.index })
  for (let i = 0; i < marks.length; i++) {
    const bodyStart = content.indexOf(String.fromCharCode(10), marks[i].lineStart) + 1
    const bodyEnd = i + 1 < marks.length ? marks[i + 1].lineStart : content.length
    map[marks[i].title] = content.slice(bodyStart, bodyEnd)
  }
  return map
}

function checkSources(item, ctx, where) {
  if (!Array.isArray(item.sources) || item.sources.length < 1 || item.sources.length > 3) {
    fail('SOURCES_COUNT', ctx, `${where}: sources 必须是 1–3 条`)
    return
  }
  const urls = new Set()
  item.sources.forEach((s, i) => {
    if (!s || typeof s !== 'object') return fail('SOURCE_INVALID', ctx, `${where}: sources[${i}] 必须是对象`)
    if (!isStr(s.label) || !s.label.trim()) fail('SOURCE_LABEL_MISSING', ctx, `${where}: sources[${i}].label 缺失`)
    if (!isStr(s.url)) return fail('SOURCE_URL_MISSING', ctx, `${where}: sources[${i}].url 缺失`)
    const raw = s.url.trim()
    let u
    try {
      u = new URL(raw)
    } catch {
      return fail('SOURCE_URL_INVALID', ctx, `${where}: sources[${i}].url 非法（${raw}）`)
    }
    if (u.protocol !== 'https:') fail('SOURCE_NOT_HTTPS', ctx, `${where}: sources[${i}] 必须 https（${raw}）`)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    if (BAD_DOMAINS.some((d) => host === d || host.endsWith('.' + d))) {
      fail('SOURCE_BAD_DOMAIN', ctx, `${where}: sources[${i}] 属于禁用的二手内容站（${host}）`)
    }
    const allowed = SOURCE_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
    if (!allowed) fail('SOURCE_DOMAIN', ctx, `${where}: sources[${i}] 域名不在白名单（${host}）`)
    if (host === 'github.com') {
      const seg = u.pathname.split('/').filter(Boolean)[0] || ''
      if (!GITHUB_ORG_ALLOWED.includes(seg)) fail('SOURCE_GITHUB_ORG', ctx, `${where}: github.com 链接只允许 spring-projects 组织（${raw}）`)
    }
    if (u.pathname === '/' || u.pathname === '') fail('SOURCE_HOMEPAGE', ctx, `${where}: sources[${i}] 不能只链首页（${raw}）`)
    if (urls.has(raw)) warn('SOURCE_DUPLICATE', ctx, `${where}: sources 重复 URL（${raw}）`)
    urls.add(raw)
    linksToCheck.set(raw, { topic: ctx.topic, file: ctx.file, id: ctx.id })
  })
}

function checkCoordinates(item, ctx, where) {
  const list = item.coordinates
  if (!Array.isArray(list) || list.length < 4 || list.length > 12) {
    return fail('COORDINATES_COUNT', ctx, `${where}: coordinates 必须是 4–12 条`)
  }
  const seen = new Set()
  list.forEach((c, i) => {
    const at = `${where} coordinates[${i}]`
    if (!c || typeof c !== 'object') return fail('COORD_INVALID', ctx, `${at}: 必须是对象`)
    const groupOk = !isStr(c.groupId) ? false : /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(c.groupId)
    if (!groupOk) fail('COORD_GROUP_INVALID', ctx, `${at}: groupId 非法（${JSON.stringify(c.groupId)}）`)
    const artOk = !isStr(c.artifactId) ? false : /^[a-z0-9][a-z0-9._-]*$/.test(c.artifactId)
    if (!artOk) fail('COORD_ARTIFACT_INVALID', ctx, `${at}: artifactId 非法（${JSON.stringify(c.artifactId)}）`)
    if (!isStr(c.usage) || !c.usage.trim()) fail('COORD_USAGE_MISSING', ctx, `${at}: 缺少 usage`)
    else if (visibleLen(c.usage) > 40) warn('COORD_USAGE_LONG', ctx, `${at}: usage 超过 40 字（${visibleLen(c.usage)}）`)
    if (typeof c.managed !== 'boolean') fail('COORD_MANAGED_INVALID', ctx, `${at}: managed 必须是布尔值`)
    if (c.managed === true && c.version != null) fail('COORD_VERSION_SHOULD_BE_NULL', ctx, `${at}: BOM 管理的依赖 version 必须为 null（实际 ${JSON.stringify(c.version)}）`)
    if (c.managed === false) {
      if (!isStr(c.version) || !c.version.trim()) fail('COORD_VERSION_MISSING', ctx, `${at}: 非 BOM 管理的依赖必须写真实 version`)
      else if (!/^\d+\.\d+(\.\d+)?([.-][A-Za-z0-9]+)*$/.test(c.version)) fail('COORD_VERSION_FORMAT', ctx, `${at}: version 格式可疑（${c.version}）`)
    }
    if (c.scope != null && !['compile', 'runtime', 'provided', 'test', 'import', 'system'].includes(c.scope)) {
      warn('COORD_SCOPE_UNKNOWN', ctx, `${at}: scope 非常见值（${JSON.stringify(c.scope)}）`)
    }
    if (groupOk && artOk) {
      const key = `${c.groupId}:${c.artifactId}`
      if (seen.has(key)) fail('COORD_DUPLICATE', ctx, `${at}: 坐标重复 ${key}`)
      seen.add(key)
      const rec = coordsToCheck.get(key) || { ctxs: [], versions: new Map() }
      rec.ctxs.push({ topic: ctx.topic, file: ctx.file, id: ctx.id })
      if (isStr(c.version)) rec.versions.set(c.version, { topic: ctx.topic, file: ctx.file, id: ctx.id })
      coordsToCheck.set(key, rec)
    }
  })
  // 表格与坐标数组一致性
  const body = item.content || ''
  const tableRows = body.split('\n').filter((l) => /^\|.*\|\s*$/.test(l))
  if (tableRows.length >= 5) {
    const missing = list.map((c) => c && c.artifactId).filter((a) => a && !body.includes(a))
    if (missing.length) warn('COORD_TABLE_MISMATCH', ctx, `${where}: 表格未提到坐标数组中的：${missing.join(', ')}`)
    const tableArtifacts = tableRows.map((r) => (r.match(/`([a-z0-9][a-z0-9._-]*)`|([a-z0-9][a-z0-9._-]{3,})/g) || []).join(' '))
    if (tableRows.length - 2 !== list.length) {
      warn('COORD_TABLE_ROW_COUNT', ctx, `${where}: 表格数据行 ${tableRows.length - 2} 条，coordinates 数组 ${list.length} 条，应一一对应`)
    }
  }
}

// ---------- 相似/搬运检查 ----------
function checkSimilarity(allItems, knowledgeDocs) {
  // 同文件内近重复
  for (const { topic, file, items } of allItems) {
    const shingles = items.map((it) => shingleSet(stripCode(it.content || '')))
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const sim = jaccard(shingles[i], shingles[j])
        if (sim >= 0.75) {
          warn('NEAR_DUPLICATE_IN_TOPIC', { topic, file, id: items[i].id }, `${file}: ${items[i].id} 与 ${items[j].id} 正文相似度 ${(sim * 100).toFixed(0)}%（疑似重复/搬运）`)
        }
      }
    }
  }
  // 跨分块近重复
  const flat = []
  for (const { topic, file, items } of allItems) {
    for (const it of items) flat.push({ topic, file, id: it.id, set: shingleSet(stripCode(it.content || '')) })
  }
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i].topic === flat[j].topic) continue
      const sim = jaccard(flat[i].set, flat[j].set)
      if (sim >= 0.35) {
        warn('CROSS_TOPIC_DUPLICATE', { topic: flat[i].topic, file: flat[i].file, id: flat[i].id }, `${flat[i].id} 与 ${flat[j].id}（${flat[j].topic}）正文相似度 ${(sim * 100).toFixed(0)}%，疑似跨块搬运`)
      }
    }
  }
  // 与已有知识库文章比对（paragraph 级）
  const kParagraphs = []
  for (const doc of knowledgeDocs) {
    for (const it of doc.items || []) {
      if (!isStr(it.content)) continue
      for (const para of it.content.split(/\n{2,}/)) {
        const plain = stripCode(para).trim()
        if (cjkCount(plain) < 80) continue
        kParagraphs.push({ file: doc.file, id: it.id, set: shingleSet(plain) })
      }
    }
  }
  if (kParagraphs.length) {
    for (const { topic, file, items } of allItems) {
      for (const it of items) {
        for (const para of (it.content || '').split(/\n{2,}/)) {
          const plain = stripCode(para).trim()
          if (cjkCount(plain) < 80) continue
          const set = shingleSet(plain)
          for (const kp of kParagraphs) {
            const sim = jaccard(set, kp.set)
            if (sim >= 0.6) {
              warn('COPIED_FROM_KNOWLEDGE', { topic, file, id: it.id }, `${file}: ${it.id} 第「${plain.slice(0, 18)}…」段与知识库 ${kp.id} 相似度 ${(sim * 100).toFixed(0)}%，疑似整段搬运（规范 §4.6 要求重写）`)
              break
            }
          }
        }
      }
    }
  }
}

// ---------- 主流程 ----------
function run() {
  const started = new Date()
  const existing = loadExistingData()
  const files = []
  const allItems = []

  for (const [topic, spec] of Object.entries(TOPICS)) {
    const filePath = path.join(DATA_DIR, spec.file)
    const rec = { topic, file: spec.file, exists: false, count: 0, expectedCount: spec.count, items: [], headings: spec.headings }
    files.push(rec)
    if (!fs.existsSync(filePath)) {
      if (args.allowMissing) info('FILE_NOT_READY', { topic, file: spec.file }, `${spec.file}: 尚未落盘（--allow-missing）`)
      else fail('FILE_MISSING', { topic, file: spec.file }, `缺少文件 ${spec.file}（${spec.label}）`)
      continue
    }
    rec.exists = true
    let doc
    try {
      doc = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (e) {
      fail('JSON_PARSE', { topic, file: spec.file }, `${spec.file}: JSON 解析失败 — ${e.message}`)
      continue
    }
    const ctxFile = spec.file
    if (doc.topic !== topic) fail('TOPIC_MISMATCH', { topic, file: ctxFile }, `${ctxFile}: topic 应为 "${topic}"，实际 ${JSON.stringify(doc.topic)}`)
    if (!isStr(doc.generatedBy) || !doc.generatedBy.trim()) fail('GENERATED_BY_MISSING', { topic, file: ctxFile }, `${ctxFile}: 缺少 generatedBy`)
    else if (doc.generatedBy !== spec.author) warn('GENERATED_BY_MISMATCH', { topic, file: ctxFile }, `${ctxFile}: generatedBy 应为 "${spec.author}"，实际 "${doc.generatedBy}"`)
    if (!Array.isArray(doc.items)) {
      fail('ITEMS_NOT_ARRAY', { topic, file: ctxFile }, `${ctxFile}: items 必须是数组`)
      continue
    }
    rec.count = doc.items.length
    if (doc.items.length !== spec.count) fail('COUNT_MISMATCH', { topic, file: ctxFile }, `${ctxFile}: 条目数应为 ${spec.count}，实际 ${doc.items.length}`)
    doc.items.forEach((it, i) => {
      const checked = checkItem(topic, spec, it, i, ctxFile, existing.ids, allItems)
      rec.items.push({ id: it && it.id, title: it && it.title, level: it && it.level })
    })
    allItems.push({ topic, file: ctxFile, items: doc.items })
    if (!args.relaxed) {
      const missing = spec.ids.filter((id) => !doc.items.some((it) => it && it.id === id))
      if (missing.length) fail('MISSING_IDS', { topic, file: ctxFile }, `${ctxFile}: 缺少条目 ${missing.join(', ')}`)
    }
  }

  // 多余文件
  if (fs.existsSync(DATA_DIR)) {
    const known = new Set(Object.values(TOPICS).map((t) => t.file))
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (f.startsWith('topics-') && f.endsWith('.json') && !known.has(f)) warn('UNKNOWN_TOPIC_FILE', { file: f }, `发现未在规范内的专题文件：${f}`)
    }
  }

  checkSimilarity(allItems, existing.docs)

  // 抽样（40%，每块至少 3 篇，确定性）
  const sample = []
  for (const [topic, spec] of Object.entries(TOPICS)) {
    const rec = files.find((f) => f.topic === topic)
    if (!rec || !rec.exists) continue
    const n = rec.count
    const take = Math.min(n, Math.max(3, Math.round(n * 0.4)))
    const pool = [...allItems.find((a) => a.topic === topic)?.items || []]
    pool.sort((a, b) => fnv1a(topic + (a.id || '')) - fnv1a(topic + (b.id || '')))
    sample.push(...pool.slice(0, take).map((it) => ({ topic, id: it.id, title: it.title })))
  }

  return { started, files, existing, sample }
}

// ---------- 链接检查 ----------
async function fetchStatus(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(args.timeout),
    })
    // 读完 body 以便复用连接/彻底结束请求
    try { await res.arrayBuffer() } catch {}
    return res.status
  } catch (e) {
    return 0
  }
}

async function checkLinks() {
  const cache = loadCache('links.json')
  const results = []
  let i = 0
  for (const [url, ctx] of linksToCheck) {
    i++
    const hit = cache[url]
    const fresh = hit && !args.refreshCache && Date.now() - hit.fetchedAt < CACHE_TTL
    let status
    if (fresh) status = hit.status
    else {
      status = await fetchStatus(url)
      cache[url] = { status, fetchedAt: Date.now() }
      if (status === 0) await new Promise((r) => setTimeout(r, 300)) // 退避
    }
    if (args.verbose) process.stderr.write(`[link ${i}/${linksToCheck.size}] ${status} ${url}\n`)
    results.push({ url, status, cached: fresh, ...ctx })
    const c = { topic: ctx.topic, file: ctx.file, id: ctx.id }
    if (status === 200) continue
    if (status === 0) warn('LINK_UNREACHABLE', c, `${url}: 环境不可达（超时/DNS），非内容错误，稍后重试`)
    else if (status === 404 || status === 410) fail('LINK_NOT_FOUND', c, `${url}: HTTP ${status}（链接死链，内容错误）`)
    else warn('LINK_HTTP_OTHER', c, `${url}: HTTP ${status}（非 200，需人工确认）`)
  }
  saveCache('links.json', cache)
  return results
}

// ---------- 坐标检查 ----------
async function checkCoords() {
  const cache = loadCache('coords.json')
  const results = []
  let i = 0
  for (const [key, rec] of coordsToCheck) {
    i++
    const hit = cache[key]
    const fresh = hit && !args.refreshCache && Date.now() - hit.fetchedAt < CACHE_TTL
    let status = hit ? hit.status : undefined
    let versions = hit ? hit.versions : undefined
    const url = `https://repo1.maven.org/maven2/${key.split(':')[0].replace(/\./g, '/')}/${key.split(':')[1]}/maven-metadata.xml`
    if (!fresh) {
      try {
        const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(args.timeout) })
        status = res.status
        let text = ''
        if (status === 200) {
          text = await res.text()
          versions = [...text.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1])
        } else {
          try { await res.arrayBuffer() } catch {}
        }
      } catch {
        status = 0
      }
      cache[key] = { status, versions: versions || null, fetchedAt: Date.now() }
      if (status === 0) await new Promise((r) => setTimeout(r, 300))
    }
    if (args.verbose) process.stderr.write(`[coord ${i}/${coordsToCheck.size}] ${status} ${key}\n`)
    results.push({ key, url, status, versions: rec.versions.size, cached: fresh })
    const c = rec.ctxs[0] || {}
    if (status === 200) {
      // 非 BOM 依赖核对版本是否真实发布
      for (const [v, ctx2] of rec.versions) {
        if (!Array.isArray(versions) || versions.length === 0) continue
        if (!versions.includes(v)) {
          fail('COORD_VERSION_NOT_PUBLISHED', ctx2, `${key}:${v} 在 Maven Central 的 maven-metadata.xml 中不存在（真实版本 ${versions.slice(-5).join(', ')} …）`)
        }
      }
    } else if (status === 404 || status === 410) {
      fail('COORD_MISSING', c, `${key}: Maven Central 返回 ${status}（坐标不存在）`)
    } else if (status === 0) {
      warn('COORD_UNREACHABLE', c, `${key}: 环境不可达（超时/DNS），非内容错误`)
    } else {
      warn('COORD_HTTP_OTHER', c, `${key}: Maven Central 返回 ${status}（非 200/404，需人工确认）`)
    }
  }
  saveCache('coords.json', cache)
  return results
}

// ---------- 报告 ----------
function buildReport(meta, linkResults, coordResults) {
  const byCode = {}
  const bySeverity = { error: 0, warning: 0, info: 0 }
  for (const it of issues) {
    byCode[it.code] = (byCode[it.code] || 0) + 1
    bySeverity[it.severity]++
  }
  const linkSummary = {
    enabled: args.checkLinks,
    total: linkResults.length,
    ok: linkResults.filter((r) => r.status === 200).length,
    unreachable: linkResults.filter((r) => r.status === 0).length,
    failed: linkResults.filter((r) => r.status !== 200 && r.status !== 0).length,
    cached: linkResults.filter((r) => r.cached).length,
  }
  const coordSummary = {
    enabled: args.checkCoords,
    total: coordResults.length,
    ok: coordResults.filter((r) => r.status === 200).length,
    missing: coordResults.filter((r) => r.status === 404 || r.status === 410).length,
    unreachable: coordResults.filter((r) => r.status === 0).length,
    failed: coordResults.filter((r) => r.status !== 200 && r.status !== 0 && r.status !== 404 && r.status !== 410).length,
    versions: coordResults.reduce((n, r) => n + r.versions, 0),
  }
  const verdict = bySeverity.error > 0 ? 'needs-fix' : bySeverity.warning > 0 ? 'review-warnings' : 'pass'
  return {
    schemaVersion: 1,
    tool: 'topics-audit/audit.mjs',
    generatedAt: new Date().toISOString(),
    options: args,
    dataDir: path.relative(ROOT, DATA_DIR).replace(/\\/g, '/'),
    summary: {
      files: meta.files.filter((f) => f.exists).length,
      filesExpected: meta.files.length,
      items: meta.files.reduce((n, f) => n + f.count, 0),
      errors: bySeverity.error,
      warnings: bySeverity.warning,
      infos: bySeverity.info,
      verdict,
      byCode,
      linkChecks: linkSummary,
      coordChecks: coordSummary,
      sampleSize: meta.sample.length,
    },
    perFile: meta.files.map((f) => ({
      topic: f.topic,
      file: f.file,
      exists: f.exists,
      count: f.count,
      expectedCount: f.expectedCount,
      headings: f.headings,
    })),
    sample: meta.sample,
    linkChecks: linkResults,
    coordChecks: coordResults,
    issues,
  }
}

function buildMarkdown(report) {
  const l = []
  l.push('# 实战专题自动审计报告')
  l.push('')
  l.push(`- 生成时间：${report.generatedAt}（${new Date(report.generatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}）`)
  l.push(`- 数据目录：\`${report.dataDir}\``)
  l.push(`- 结论：**${report.summary.verdict}**（错误 ${report.summary.errors} / 存疑 ${report.summary.warnings} / 建议 ${report.summary.infos}）`)
  l.push(`- 条目：${report.summary.items}（${report.perFile.filter((f) => f.exists).length}/${report.perFile.length} 文件已落盘）`)
  if (report.summary.linkChecks.enabled) {
    const lc = report.summary.linkChecks
    l.push(`- 链接：${lc.total} 条，200 ${lc.ok}，不可达 ${lc.unreachable}，失败 ${lc.failed}`)
  }
  if (report.summary.coordChecks.enabled) {
    const cc = report.summary.coordChecks
    l.push(`- 坐标：${cc.total} 组，200 ${cc.ok}，缺失 ${cc.missing}，不可达 ${cc.unreachable}；非 BOM 版本 ${cc.versions} 个`)
  }
  l.push('')
  l.push('## 文件')
  l.push('')
  l.push('| 分块 | 文件 | 已落盘 | 条目/期望 |')
  l.push('| --- | --- | --- | --- |')
  for (const f of report.perFile) l.push(`| ${f.topic} | ${f.file} | ${f.exists ? '是' : '否'} | ${f.count}/${f.expectedCount} |`)
  l.push('')
  if (report.issues.length) {
    l.push('## 问题清单')
    l.push('')
    l.push('| 级别 | code | 位置 | 描述 |')
    l.push('| --- | --- | --- | --- |')
    for (const it of report.issues) {
      const loc = [it.file, it.id].filter(Boolean).join(' / ')
      l.push(`| ${it.severity} | ${it.code} | ${loc} | ${it.message.replace(/\|/g, '\\|')} |`)
    }
    l.push('')
  } else {
    l.push('## 问题清单')
    l.push('')
    l.push('无。')
    l.push('')
  }
  if (report.sample.length) {
    l.push('## 人工抽查计划（40%，每块≥3 篇）')
    l.push('')
    for (const s of report.sample) l.push(`- ${s.topic} / ${s.id} — ${s.title || ''}`)
    l.push('')
  }
  return l.join('\n')
}

// ---------- 入口 ----------
async function main() {
  if (!fs.existsSync(DATA_DIR)) failHard(`数据目录不存在：${DATA_DIR}`)
  let meta
  try {
    meta = run()
  } catch (e) {
    failHard(`审计运行失败：${e.stack || e.message}`)
  }
  let linkResults = []
  let coordResults = []
  if (args.checkLinks) linkResults = await checkLinks()
  if (args.checkCoords) coordResults = await checkCoords()

  const report = buildReport(meta, linkResults, coordResults)
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2))
  fs.writeFileSync(OUT_MD, buildMarkdown(report))
  console.log(`实战专题审计：${report.summary.files}/${report.perFile.length} 文件，${report.summary.items} 条；` +
    `错误 ${report.summary.errors} / 存疑 ${report.summary.warnings} / 建议 ${report.summary.infos}；` +
    `抽样 ${report.summary.sampleSize} 条；结论 ${report.summary.verdict}`)
  if (report.summary.linkChecks.enabled) {
    const l = report.summary.linkChecks
    console.log(`链接：${l.total} 条，200 ${l.ok}，不可达 ${l.unreachable}，失败 ${l.failed}`)
  }
  if (report.summary.coordChecks.enabled) {
    const c = report.summary.coordChecks
    console.log(`坐标：${c.total} 组，200 ${c.ok}，缺失 ${c.missing}，不可达 ${c.unreachable}，非 BOM 版本 ${c.versions}`)
  }
  console.log(`报告：${OUT_JSON}`)
  process.exit(report.summary.errors > 0 ? 1 : 0)
}

main().catch((e) => failHard(e.stack || e.message))