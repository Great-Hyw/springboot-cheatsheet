#!/usr/bin/env node
/**
 * tools/topics-audit/audit.mjs 的自测（离线，不联网）。
 * 生成 clean / bad 两套夹具，验证审计器能报出预期问题、干净数据 0 错误。
 * 用法：node tools/topics-audit/selftest.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const BASE = path.join(ROOT, 'tools', 'topics-audit', 'fixtures')
const AUDIT = path.join(ROOT, 'tools', 'topics-audit', 'audit.mjs')
const OUT = path.join(ROOT, 'tools', 'topics-audit', '.selftest-report.json')

const SPEC = {
  conventions: {
    author: 'content-boot',
    headings: ['推荐做法', '为什么', '落地检查清单'],
    ids: [
      'conventions-project-structure', 'conventions-constructor-injection', 'conventions-configuration',
      'conventions-rest-api', 'conventions-dto-validation', 'conventions-exception',
      'conventions-transaction', 'conventions-logging', 'conventions-testing', 'conventions-dependency',
    ],
  },
  interview: {
    author: 'knowledge-a',
    headings: ['一句话答案', '展开讲', '追问与加分点', '别踩的坑'],
    ids: [
      'interview-auto-configuration', 'interview-ioc-bean-lifecycle', 'interview-circular-dependency',
      'interview-aop-proxy', 'interview-transaction-failure', 'interview-mvc-request-flow',
      'interview-starter-principle', 'interview-config-priority', 'interview-bean-scope',
      'interview-filter-interceptor', 'interview-async-threadpool', 'interview-graceful-shutdown',
    ],
  },
  layers: {
    author: 'knowledge-b',
    headings: ['这一层负责什么', '怎么写', '边界与常见错误'],
    ids: [
      'layers-architecture', 'layers-controller', 'layers-service', 'layers-repository',
      'layers-dto-conversion', 'layers-exception-errorcode', 'layers-transaction-boundary',
      'layers-common-module', 'layers-modularization',
    ],
  },
  coordinates: {
    author: 'content-data',
    headings: ['什么时候用', '坐标清单', '配置与坑'],
    ids: ['coordinates-web', 'coordinates-data', 'coordinates-security', 'coordinates-test', 'coordinates-ops', 'coordinates-utils'],
  },
}

const VALID_SOURCES = [
  { label: 'Spring Boot 参考文档', url: 'https://docs.spring.io/spring-boot/3.5/reference/index.html' },
  { label: 'Spring Framework 参考文档', url: 'https://docs.spring.io/spring-framework/reference/core/beans.html' },
]

function body(topic, opts = {}) {
  const h = SPEC[topic].headings
  const code = '```java\nclass A {}\n```'
  if (topic === 'conventions') {
    return [
      `## ${h[0]}`, '推荐做法正文，用构造器注入。', code,
      `## ${h[1]}`, '为什么正文，官方文档有说明。',
      `## ${h[2]}`, '- [ ] 检查项一', '- [ ] 检查项二', '- [ ] 检查项三',
    ].join('\n')
  }
  if (topic === 'interview') {
    return [
      `## ${h[0]}`, '先给结论。第二句补充。',
      `## ${h[1]}`, '展开讲正文，机制说明。', code,
      `## ${h[2]}`, '1. 追问一', '2. 追问二',
      `## ${h[3]}`, '1. 坑一', '2. 坑二',
    ].join('\n')
  }
  if (topic === 'layers') {
    return [
      `## ${h[0]}`, '这一层负责什么正文。',
      `## ${h[1]}`, '怎么写正文。', code,
      `## ${h[2]}`, '1. 错误一', '2. 错误二', '3. 错误三',
    ].join('\n')
  }
  // coordinates
  return [
    `## ${h[0]}`, '什么时候用正文。',
    `## ${h[1]}`, '', '| 依赖 | 用途 | 版本 |', '| --- | --- | --- |',
    '| `spring-boot-starter-web` | Web | BOM |', '| `spring-boot-starter-validation` | 校验 | BOM |',
    '| `springdoc-openapi-starter-webmvc-ui` | 文档 | 2.8.6 |', '| `spring-boot-devtools` | 热重载 | BOM |',
    `## ${h[2]}`, '配置与坑正文。', code,
  ].join('\n')
}

function coords(valid = true) {
  if (!valid) {
    return [
      { groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-web', version: '1.0.0', managed: true, scope: null, usage: 'Web' },
      { groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-validation', version: null, managed: false, scope: null, usage: '校验' },
      { groupId: 'org.springdoc', artifactId: 'springdoc-openapi-starter-webmvc-ui', version: 'abc', managed: false, scope: null, usage: 'OpenAPI' },
      { groupId: 'org.springframework.boot', artifactId: 'spring-boot-devtools', version: null, managed: true, scope: null, usage: '热重载' },
    ]
  }
  return [
    { groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-web', version: null, managed: true, scope: null, usage: 'Web' },
    { groupId: 'org.springframework.boot', artifactId: 'spring-boot-starter-validation', version: null, managed: true, scope: null, usage: '校验' },
    { groupId: 'org.springdoc', artifactId: 'springdoc-openapi-starter-webmvc-ui', version: '2.8.6', managed: false, scope: null, usage: 'OpenAPI' },
    { groupId: 'org.springframework.boot', artifactId: 'spring-boot-devtools', version: null, managed: true, scope: null, usage: '热重载' },
  ]
}

function makeItems(topic, bad) {
  return SPEC[topic].ids.map((id, i) => {
    const item = {
      id,
      title: `示例标题第${i + 1}篇`,
      level: i % 2 ? '进阶' : '入门',
      readingMinutes: 4,
      summary: '这是一句话摘要，说明这篇文章解决什么问题。',
      tags: ['示例', '测试'],
      content: body(topic, { bad }),
      sources: VALID_SOURCES.map((s) => ({ ...s })),
    }
    if (topic === 'coordinates') item.coordinates = coords(!bad)
    if (!bad) return item

    // ---- 注入缺陷 ----
    if (topic === 'conventions' && i === 0) {
      item.content += '\n必考题，神器。groupId/artifactId/version 坐标。面试官会问，面试中常见。git commit -m x\n| 依赖 | 用途 | 版本 |\n| --- | --- | --- |\n| a | b | c |'
    }
    if (topic === 'conventions' && i === 1) {
      item.content = item.content.replace(/- \[ \][^\n]*\n?/g, '') // 触发 CHECKLIST_MISSING
    }
    if (topic === 'conventions' && i === 2) {
      item.summary = '太'.repeat(70)
      item.tags = ['a', 'b', 'c', 'd', 'e', 'f']
    }
    if (topic === 'coordinates' && i === 0) {
      item.content = item.content.replace(/\|.*\|\n?/g, '') // 触发表格缺失
    }
    if (topic === 'layers' && i === 0) {
      item.sources = [{ label: 'CSDN', url: 'https://blog.csdn.net/x/article/details/1' }]
    }
    if (topic === 'layers' && i === 1) {
      item.sources = [{ label: 'HTTP', url: 'http://docs.spring.io/spring-boot/3.5/reference/index.html' }]
    }
    if (topic === 'layers' && i === 2) {
      item.sources = [{ label: '首页', url: 'https://docs.spring.io/' }]
    }
    if (topic === 'layers' && i === 3) {
      item.sources = [{ label: 'GitHub', url: 'https://github.com/foo/bar' }]
    }
    if (topic === 'layers' && i === 4) {
      item.id = 'conventions-project-structure' // 跨文件重复 id
    }
    if (topic === 'interview' && i === 0) {
      item.content = item.content.replace('## 展开讲\n展开讲正文，机制说明。', '## 展开讲\n短')
    }
    return item
  })
}

function writeFixture(dir, bad) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  for (const [topic, spec] of Object.entries(SPEC)) {
    const doc = { generatedBy: spec.author, topic, items: makeItems(topic, bad) }
    fs.writeFileSync(path.join(dir, `topics-${topic}.json`), JSON.stringify(doc, null, 2))
  }
  if (bad) fs.writeFileSync(path.join(dir, 'topics-extra.json'), JSON.stringify({ topic: 'extra', items: [] }))
}

function runAudit(dir, extra = []) {
  const out = path.join(BASE, '.report-selftest.json')
  let code = 0
  try {
    execFileSync(process.execPath, [AUDIT, '--data-dir', dir, '--json', out, '--md', path.join(BASE, '.report-selftest.md'), ...extra], { cwd: ROOT, stdio: 'pipe' })
  } catch (e) {
    code = e.status || 1
  }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'))
  return { code, report }
}

const checks = []
const check = (name, cond, detail = '') => checks.push({ name, ok: !!cond, detail })

// 1. clean fixture（relaxed：跳过长文/小节严格检查）
writeFixture(path.join(BASE, 'clean'), false)
const clean = runAudit(path.join(BASE, 'clean'), ['--relaxed'])
check('clean: 0 错误', clean.report.summary.errors === 0, JSON.stringify(clean.report.summary.byCode))
check('clean: 退出码 0', clean.code === 0, `exit=${clean.code}`)
check('clean: 4 文件 37 条', clean.report.summary.files === 4 && clean.report.summary.items === 37, `${clean.report.summary.files}/${clean.report.summary.items}`)
check('clean: 抽样 16（4+5+4+3）', clean.report.summary.sampleSize === 16, String(clean.report.summary.sampleSize))

// 2. bad fixture（relaxed）：预期 code 必须命中
writeFixture(path.join(BASE, 'bad'), true)
const bad = runAudit(path.join(BASE, 'bad'), ['--relaxed'])
check('bad: 有错误且退出码 1', bad.report.summary.errors > 0 && bad.code === 1, `exit=${bad.code} errors=${bad.report.summary.errors}`)
const expectedCodes = [
  'FORBIDDEN_PHRASE', 'HYPE_PHRASE', 'CONTAMINATION_COORDINATES', 'CONTAMINATION_INTERVIEW', 'CONTAMINATION_COMMAND',
  'CHECKLIST_MISSING', 'SUMMARY_TOO_LONG', 'TAGS_COUNT', 'TABLE_MISSING',
  'COORD_VERSION_SHOULD_BE_NULL', 'COORD_VERSION_MISSING', 'COORD_VERSION_FORMAT',
  'SOURCE_BAD_DOMAIN', 'SOURCE_NOT_HTTPS', 'SOURCE_HOMEPAGE', 'SOURCE_GITHUB_ORG',
  'DUPLICATE_ID', 'UNKNOWN_TOPIC_FILE',
]
const got = new Set(bad.report.issues.map((i) => i.code))
for (const c of expectedCodes) check(`bad: 命中 ${c}`, got.has(c), '')

// 3. bad fixture（严格）：长文/结构类错误也必须命中
const badStrict = runAudit(path.join(BASE, 'bad'))
const gotStrict = new Set(badStrict.report.issues.map((i) => i.code))
check('bad-strict: 命中 CJK_OUT_OF_RANGE', gotStrict.has('CJK_OUT_OF_RANGE'))
check('bad-strict: 命中 EXPAND_TOO_SHORT', gotStrict.has('EXPAND_TOO_SHORT'))

// 4. 空目录 / 部分落盘
const emptyDir = path.join(BASE, 'empty')
fs.rmSync(emptyDir, { recursive: true, force: true })
fs.mkdirSync(emptyDir, { recursive: true })
const missing = runAudit(emptyDir, ['--allow-missing'])
check('empty: --allow-missing 不报错误（info）', missing.report.summary.errors === 0 && missing.report.summary.infos >= 4, JSON.stringify(missing.report.summary.byCode))
const missingHard = runAudit(emptyDir)
check('empty: 严格模式报 FILE_MISSING×4', missingHard.report.summary.byCode.FILE_MISSING === 4 && missingHard.code === 1, JSON.stringify(missingHard.report.summary.byCode))

// 5. 报告包含四块与 sources 链接集合（离线不检查链接，但已收集）
check('report: 有 sample 且四块均覆盖', new Set(clean.report.sample.map((s) => s.topic)).size === 4, JSON.stringify([...new Set(clean.report.sample.map((s) => s.topic))]))

let failedCount = 0
for (const c of checks) {
  if (!c.ok) failedCount++
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail && !c.ok ? ' — ' + c.detail : ''}`)
}
console.log(`\n自测结果：${checks.length - failedCount}/${checks.length} 通过`)
if (failedCount) {
  fs.rmSync(OUT, { force: true })
  process.exit(1)
}
fs.rmSync(OUT, { force: true })
console.log('✅ topics-audit 自测全部通过')