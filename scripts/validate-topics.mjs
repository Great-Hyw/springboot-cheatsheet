#!/usr/bin/env node
/**
 * 校验四个实战专题分块：conventions / interview / layers / coordinates。
 * 用法：
 *   node scripts/validate-topics.mjs            # 结构 + 内容校验
 *   node scripts/validate-topics.mjs --check-links   # 额外检查官方链接 HTTP 状态
 *   node scripts/validate-topics.mjs --check-coords  # 额外检查 Maven 坐标是否真实存在
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'src', 'data')

const SOURCE_DOMAINS = [
  'docs.spring.io',
  'spring.io',
  'github.com',
  'jakarta.ee',
  'hibernate.org',
  'mybatis.org',
  'maven.apache.org',
  'repo1.maven.org',
  'micrometer.io',
  'testcontainers.com',
  'projectlombok.org',
  'mapstruct.org',
  'flywaydb.org',
  'liquibase.org',
  'redis.io',
  'martinfowler.com',
  '12factor.net',
]

const TOPICS = {
  conventions: {
    file: 'topics-conventions.json',
    label: 'Spring Boot 开发规范',
    count: 10,
    minCjk: 600,
    maxCjk: 1400,
    headings: ['推荐做法', '为什么', '落地检查清单'],
    ids: [
      'conventions-project-structure',
      'conventions-constructor-injection',
      'conventions-configuration',
      'conventions-rest-api',
      'conventions-dto-validation',
      'conventions-exception',
      'conventions-transaction',
      'conventions-logging',
      'conventions-testing',
      'conventions-dependency',
    ],
  },
  interview: {
    file: 'topics-interview.json',
    label: '面试高频题',
    count: 12,
    minCjk: 600,
    maxCjk: 1400,
    headings: ['一句话答案', '展开讲', '追问与加分点', '别踩的坑'],
    ids: [
      'interview-auto-configuration',
      'interview-ioc-bean-lifecycle',
      'interview-circular-dependency',
      'interview-aop-proxy',
      'interview-transaction-failure',
      'interview-mvc-request-flow',
      'interview-starter-principle',
      'interview-config-priority',
      'interview-bean-scope',
      'interview-filter-interceptor',
      'interview-async-threadpool',
      'interview-graceful-shutdown',
    ],
  },
  layers: {
    file: 'topics-layers.json',
    label: '现代企业分层写法',
    count: 9,
    minCjk: 600,
    maxCjk: 1400,
    headings: ['这一层负责什么', '怎么写', '边界与常见错误'],
    ids: [
      'layers-architecture',
      'layers-controller',
      'layers-service',
      'layers-repository',
      'layers-dto-conversion',
      'layers-exception-errorcode',
      'layers-transaction-boundary',
      'layers-common-module',
      'layers-modularization',
    ],
  },
  coordinates: {
    file: 'topics-coordinates.json',
    label: '常用 Maven 坐标用法',
    count: 6,
    minCjk: 350,
    maxCjk: 1400,
    headings: ['什么时候用', '坐标清单', '配置与坑'],
    ids: [
      'coordinates-web',
      'coordinates-data',
      'coordinates-security',
      'coordinates-test',
      'coordinates-ops',
      'coordinates-utils',
    ],
  },
}

const errors = []
const warnings = []
const fail = (msg) => errors.push(msg)
const warn = (msg) => warnings.push(msg)

const sourcesToCheck = new Map() // url -> where
const coordsToCheck = new Map() // groupId:artifactId -> where

const cjkCount = (s) => (s.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length
const visibleLen = (s) => (s || '').replace(/\s/g, '').length
const isStr = (v) => typeof v === 'string'

function sectionTitles(content) {
  const out = []
  const re = /^##\s+(.+?)\s*$/gm
  let m
  while ((m = re.exec(content))) out.push(m[1].trim())
  return out
}

function checkUrl(raw, where) {
  let u
  try {
    u = new URL(raw)
  } catch {
    fail(`${where}: URL 不合法 ${raw}`)
    return
  }
  if (u.protocol !== 'https:') fail(`${where}: 必须用 https（${raw}）`)
  const host = u.hostname.replace(/^www\./, '')
  const okDomain = SOURCE_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
  if (!okDomain) fail(`${where}: 域名不在白名单 ${host}（${raw}）`)
  // 规范 §5：github.com 只允许官方 spring-projects 组织，不允许任意仓库
  if (host === 'github.com' && !u.pathname.startsWith('/spring-projects/')) {
    fail(`${where}: github.com 只允许 spring-projects 组织（${raw}）`)
  }
  if (u.pathname === '/' || u.pathname === '') fail(`${where}: 不要只链首页，给到具体页面（${raw}）`)
}

/** 收集全站已有条目 id，检查专题 id 与它们不重复 */
function existingIds() {
  const ids = new Map()
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (!f.endsWith('.json')) continue
    if (f.startsWith('topics-')) continue
    if (f === 'audit-summary.json') continue
    let doc
    try {
      doc = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
    } catch {
      continue
    }
    for (const it of doc.items || []) {
      if (isStr(it.id)) ids.set(it.id, f)
    }
  }
  return ids
}

const allIds = existingIds()

for (const [topic, spec] of Object.entries(TOPICS)) {
  const filePath = path.join(DATA_DIR, spec.file)
  if (!fs.existsSync(filePath)) {
    fail(`缺少文件 ${spec.file}（${spec.label}）`)
    continue
  }
  let doc
  try {
    doc = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    fail(`${spec.file}: JSON 解析失败 — ${e.message}`)
    continue
  }

  const where = spec.file
  if (doc.topic !== topic) fail(`${where}: topic 应为 "${topic}"，实际 ${JSON.stringify(doc.topic)}`)
  if (!isStr(doc.generatedBy) || !doc.generatedBy.trim()) fail(`${where}: 缺少 generatedBy`)
  if (!Array.isArray(doc.items)) {
    fail(`${where}: items 必须是数组`)
    continue
  }
  if (doc.items.length !== spec.count) {
    fail(`${where}: 条目数应为 ${spec.count}，实际 ${doc.items.length}`)
  }

  const seen = new Set()
  doc.items.forEach((it, i) => {
    const at = `${where} items[${i}]${it && it.id ? ` (${it.id})` : ''}`

    // id：必须与清单一致
    if (!isStr(it.id) || !it.id) {
      fail(`${at}: 缺少 id`)
    } else {
      if (seen.has(it.id)) fail(`${at}: id 重复`)
      seen.add(it.id)
      if (!spec.ids.includes(it.id)) fail(`${at}: id 不在清单内（拼写/前缀错？）`)
      if (!it.id.startsWith(topic + '-')) fail(`${at}: id 必须以 "${topic}-" 开头`)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(it.id)) fail(`${at}: id 必须是 kebab-case`)
      if (allIds.has(it.id)) fail(`${at}: id 与已有数据文件冲突（${allIds.get(it.id)}）`)
    }

    // 基础字段
    if (!isStr(it.title) || visibleLen(it.title) < 6) fail(`${at}: title 缺失或过短`)
    else if (visibleLen(it.title) > 34) warn(`${at}: title 超过 34 字（${visibleLen(it.title)}）`)
    if (!['入门', '进阶'].includes(it.level)) fail(`${at}: level 必须是 入门/进阶`)
    if (!Number.isInteger(it.readingMinutes) || it.readingMinutes < 2 || it.readingMinutes > 10) {
      fail(`${at}: readingMinutes 必须是 2–10 的整数`)
    }
    if (!isStr(it.summary) || cjkCount(it.summary) < 8) fail(`${at}: summary 缺失或过短`)
    else if (cjkCount(it.summary) > 60) fail(`${at}: summary 超过 60 个汉字（${cjkCount(it.summary)}）`)
    if (!Array.isArray(it.tags) || it.tags.length < 2 || it.tags.length > 5) {
      fail(`${at}: tags 必须是 2–5 个`)
    } else {
      it.tags.forEach((t, ti) => {
        if (!isStr(t) || !t.trim()) fail(`${at}: tags[${ti}] 为空`)
        else if (visibleLen(t) > 12) warn(`${at}: tags[${ti}] 超过 12 字（${t}）`)
      })
    }

    // 正文
    if (!isStr(it.content) || it.content.trim().length < 80) {
      fail(`${at}: content 缺失或过短`)
    } else {
      const cjk = cjkCount(it.content)
      if (cjk < spec.minCjk || cjk > spec.maxCjk) {
        fail(`${at}: 正文汉字数 ${cjk}，应在 ${spec.minCjk}–${spec.maxCjk}`)
      }
      const headings = sectionTitles(it.content)
      const expected = spec.headings
      if (headings.length !== expected.length) {
        fail(`${at}: 应有 ${expected.length} 个 ## 小节，实际 ${headings.length}：${headings.join(' / ')}`)
      } else if (headings.some((h, hi) => h !== expected[hi])) {
        fail(`${at}: 小节标题/顺序不符，应为 ${expected.join(' / ')}，实际 ${headings.join(' / ')}`)
      }
      const hasFence = /```[\s\S]+?```/.test(it.content)
      if (!hasFence) fail(`${at}: 至少需要 1 段代码/配置示例（三个反引号围栏）`)
      if (topic === 'conventions' && (it.content.match(/^- \[ \]/gm) || []).length < 3) {
        fail(`${at}: 「落地检查清单」至少 3 条 - [ ] 勾选项`)
      }
      if (topic === 'coordinates') {
        const tableRows = (it.content.match(/^\|.*\|\s*$/gm) || []).length
        if (tableRows < 5) fail(`${at}: 「坐标清单」需要 Markdown 表格（含表头至少 5 行）`)
      }
      if (/某公司真题|大厂原题|内部面经|必考题|全网最全/.test(it.content)) {
        fail(`${at}: 出现不可证实的营销/真题话术`)
      }
    }

    // sources
    if (!Array.isArray(it.sources) || it.sources.length < 1 || it.sources.length > 3) {
      fail(`${at}: sources 必须是 1–3 条`)
    } else {
      it.sources.forEach((s, si) => {
        if (!s || !isStr(s.label) || !s.label.trim()) fail(`${at}: sources[${si}].label 缺失`)
        if (!s || !isStr(s.url)) fail(`${at}: sources[${si}].url 缺失`)
        else {
          checkUrl(s.url, `${at} sources[${si}]`)
          if (/^https:\/\//.test(s.url)) sourcesToCheck.set(s.url, at)
        }
      })
    }

    // coordinates 专属字段
    if (topic === 'coordinates') {
      const list = it.coordinates
      if (!Array.isArray(list) || list.length < 4 || list.length > 12) {
        fail(`${at}: coordinates 必须是 4–12 条`)
      } else {
        const seenCoords = new Set()
        list.forEach((c, ci) => {
          const cat = `${at} coordinates[${ci}]`
          if (!c || !isStr(c.groupId) || !/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(c.groupId)) {
            fail(`${cat}: groupId 不合法`)
          }
          if (!c || !isStr(c.artifactId) || !/^[a-z0-9][a-z0-9._-]*$/.test(c.artifactId)) {
            fail(`${cat}: artifactId 不合法`)
          }
          if (!c || !isStr(c.usage) || c.usage.trim().length < 4) fail(`${cat}: 缺少 usage 说明`)
          if (c && typeof c.managed !== 'boolean') fail(`${cat}: managed 必须是布尔值`)
          if (c && c.managed === true && c.version != null) fail(`${cat}: BOM 管理的依赖 version 必须为 null`)
          if (c && c.managed === false && (!isStr(c.version) || !/^\d+\.\d+(\.\d+)?/.test(c.version))) {
            fail(`${cat}: 非 BOM 管理的依赖必须写真实 version`)
          }
          if (c && c.version && !/^\d+\.\d+(\.\d+)?([.-][A-Za-z0-9]+)*$/.test(c.version)) {
            fail(`${cat}: version 格式可疑（${c.version}）`)
          }
          if (c && c.groupId && c.artifactId) {
            const key = `${c.groupId}:${c.artifactId}`
            if (seenCoords.has(key)) fail(`${cat}: 坐标重复 ${key}`)
            seenCoords.add(key)
            coordsToCheck.set(key, cat)
          }
        })
      }
    } else if ('coordinates' in it) {
      fail(`${at}: 只有 coordinates 分块允许出现 coordinates 字段`)
    }
  })

  // 清单里列出但条目缺失
  for (const id of spec.ids) {
    if (!seen.has(id)) fail(`${where}: 缺少条目 ${id}`)
  }
}

// 不应存在多余的 topics-*.json
const knownFiles = new Set(Object.values(TOPICS).map((t) => t.file))
for (const f of fs.readdirSync(DATA_DIR)) {
  if (f.startsWith('topics-') && f.endsWith('.json') && !knownFiles.has(f)) {
    warn(`发现未在规范内的专题文件：${f}`)
  }
}

// 可选：联网核查（默认不跑，--check-links / --check-coords 才跑）
const args = process.argv.slice(2)
const UA = 'Mozilla/5.0 (compatible; topic-validator/1.0)'

async function httpStatus(url, method = 'HEAD') {
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(15000),
    })
    return res.status
  } catch {
    return 0
  }
}

if (args.includes('--check-links')) {
  console.log(`\n---- 链接核查（${sourcesToCheck.size} 条）----`)
  let bad = 0
  for (const [url, at] of sourcesToCheck) {
    const status = await httpStatus(url)
    if (status === 200) continue
    bad++
    const msg = `${at}: 链接返回 ${status || '网络不可达'} — ${url}`
    if (status === 0) warn('LINK_UNREACHABLE ' + msg)
    else fail('LINK_BAD ' + msg)
  }
  console.log(`链接核查完成：${sourcesToCheck.size - bad}/${sourcesToCheck.size} 为 200`)
}

if (args.includes('--check-coords')) {
  console.log(`\n---- Maven 坐标核查（${coordsToCheck.size} 组）----`)
  let bad = 0
  for (const [key, at] of coordsToCheck) {
    const [g, a] = key.split(':')
    const url = `https://repo1.maven.org/maven2/${g.replace(/\./g, '/')}/${a}/maven-metadata.xml`
    const status = await httpStatus(url)
    if (status === 200) continue
    bad++
    const msg = `${at}: 坐标 ${key} 在 Maven Central 返回 ${status || '网络不可达'}`
    if (status === 0) warn('COORD_UNREACHABLE ' + msg)
    else fail('COORD_MISSING ' + msg)
  }
  console.log(`坐标核查完成：${coordsToCheck.size - bad}/${coordsToCheck.size} 存在`)
}

// 中文提示后打印结果
console.log('==== 实战专题校验 ====')
for (const spec of Object.values(TOPICS)) {
  console.log(`- ${spec.label}：${spec.count} 篇 → ${spec.file}`)
}
if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} 个警告`)
  warnings.forEach((w) => console.log('  - ' + w))
}
if (errors.length) {
  console.log(`\n❌ ${errors.length} 个错误`)
  errors.forEach((e) => console.log('  - ' + e))
  console.log('\n结果：未通过')
  process.exit(1)
}
console.log('\n✅ 校验通过：0 个错误')