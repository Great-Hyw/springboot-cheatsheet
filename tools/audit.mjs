#!/usr/bin/env node
/**
 * 独立事实核查工具（verifier）— 比 scripts/validate-data.mjs 更严格的第二道闸门。
 *
 * 定位：validate-data.mjs 负责基础 schema / 长度 / 白名单 / 索引核对；
 * 本脚本补上它不做的部分：
 *   1. 示例代码真实性：示例里出现的注解是否真实存在、import 与 package 是否一致、
 *      @Target 与示例中的用法位置是否矛盾、是否还在用 javax.*（Boot 3 应为 jakarta.*）。
 *   2. 语义风险：versionNote 中的「废弃 / 移除 / Boot 4」类说法、高风险注解（@Transactional 等）
 *      自动打上人工核查标记。
 *   3. 链接真实可达：并发 HTTP 抓取（带缓存、重试、超时），区分 4xx / 5xx / 软 404。
 *   4. 重复 / 近重复：id、name、tagline、plain 文本相似度。
 *   5. 抽样计划：按 40% 生成确定性人工抽查清单（覆盖每个文件与分类）。
 *
 * 用法：
 *   node tools/audit.mjs                     # 全量审计（含联网链接检查）
 *   node tools/audit.mjs --skip-links        # 只做离线审计（快速、可离线复跑）
 *   node tools/audit.mjs --refresh-links     # 忽略链接缓存
 *   node tools/audit.mjs --data-dir tools/fixtures/smoke --skip-links   # 冒烟自测
 *   node tools/audit.mjs --md                # 额外输出 tools/audit-report.md
 *
 * 退出码：0 = 无错误（允许警告）；1 = 有错误；2 = 运行失败。
 * 只读 src/data，绝不修改内容文件；输出仅 tools/audit-report.json（与 tools/.link-cache.json）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */
const opts = {
  dataDir: path.join(ROOT, 'src', 'data'),
  out: path.join(ROOT, 'tools', 'audit-report.json'),
  md: null,
  skipLinks: false,
  refreshLinks: false,
  timeout: 25000,
  concurrency: 6,
  sampleRatio: 0.4,
  verbose: false,
}
{
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const value = () => (a.includes('=') ? a.split('=').slice(1).join('=') : argv[++i])
    if (a === '--data-dir' || a.startsWith('--data-dir=')) opts.dataDir = path.resolve(ROOT, value())
    else if (a === '--out' || a.startsWith('--out=')) opts.out = path.resolve(ROOT, value())
    else if (a === '--md' || a.startsWith('--md=')) opts.md = a.includes('=') ? path.resolve(ROOT, value()) : path.join(ROOT, 'tools', 'audit-report.md')
    else if (a === '--skip-links') opts.skipLinks = true
    else if (a === '--refresh-links') opts.refreshLinks = true
    else if (a === '--verbose') opts.verbose = true
    else if (a === '--timeout' || a.startsWith('--timeout=')) opts.timeout = Number(value()) || opts.timeout
    else if (a === '--concurrency' || a.startsWith('--concurrency=')) opts.concurrency = Number(value()) || opts.concurrency
    else if (a === '--sample-ratio' || a.startsWith('--sample-ratio=')) opts.sampleRatio = Number(value()) || opts.sampleRatio
    else if (a === '-h' || a === '--help') {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0])
      process.exit(0)
    } else {
      console.error(`未知参数：${a}（--help 查看用法）`)
      process.exit(2)
    }
  }
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */
const ANNOTATION_CATEGORIES = new Set(['core', 'aop', 'web', 'validation', 'data', 'async', 'boot', 'test', 'security'])
const KNOWLEDGE_CATEGORIES = new Set(['principle', 'web', 'data', 'boot', 'test', 'engineering', 'migration'])
const LEVELS = new Set(['入门', '进阶'])
const EXPECTED_FILES = {
  'annotations-core.json': 'content-core',
  'annotations-web.json': 'content-web',
  'annotations-data.json': 'content-data',
  'annotations-boot.json': 'content-boot',
  'knowledge-a.json': 'knowledge-a',
  'knowledge-b.json': 'knowledge-b',
}

/** 官方来源白名单（docs/CONTENT-SPEC.md §5）。host 不匹配 = 错误；路径不在前缀内 = 存疑。 */
const URL_ALLOWLIST = [
  {
    host: 'docs.spring.io',
    label: 'Spring 官方文档',
    prefixes: [
      '/spring-framework/reference/',
      '/spring-framework/docs/6.2.x/javadoc-api/',
      '/spring-boot/3.5/reference/',
      '/spring-boot/3.5/how-to/',
      '/spring-boot/3.5/api/java/',
      // 同属官方 Spring Boot 3.5 文档的其它章节（appendix / maven-plugin / system-requirements 等）
      '/spring-boot/3.5/',
      // version-migration 文章需要引用 Boot 4.0 的官方 system requirements 作为版本差异依据
      '/spring-boot/4.0/',
      '/spring-security/reference/',
      // Spring Data / Batch / Integration 等都在 docs.spring.io 官方域下，且 task-3 明确要求引用 Spring Data 文档
      '/spring-data/',
      '/spring-batch/',
      '/spring-integration/',
    ],
  },
  { host: 'jakarta.ee', label: 'Jakarta EE', prefixes: ['/specifications/'] },
  { host: 'mybatis.org', label: 'MyBatis', prefixes: ['/'] },
  { host: 'hibernate.org', label: 'Hibernate', prefixes: ['/'] },
  { host: 'github.com', label: 'Spring 项目仓库', prefixes: ['/spring-projects/'] },
]

/** JDK 自带注解（不必在依赖索引里） */
const JDK_ANNOTATIONS = new Set([
  'Override', 'Deprecated', 'SuppressWarnings', 'SafeVarargs', 'FunctionalInterface',
  'Documented', 'Retention', 'Target', 'Inherited', 'Repeatable', 'Native', 'interface',
])

/** 高风险语义主题：必须人工打开官方文档核对（task-7 指定） */
const HIGH_RISK_ANNOTATIONS = new Set([
  'Transactional', 'Async', 'Scheduled', 'MockBean', 'MockitoBean', 'ControllerAdvice',
  'RestControllerAdvice', 'Valid', 'Validated', 'SpringBootApplication', 'ConfigurationProperties',
  'EnableAutoConfiguration', 'ComponentScan', 'SpringBootTest', 'EventListener', 'Order',
  'Cacheable', 'Entity', 'Id', 'GeneratedValue', 'Query', 'Param', 'Mapper', 'Bean', 'Autowired',
])

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g
const cjkCount = (s) => (String(s ?? '').match(CJK) || []).length
const visible = (s) => String(s ?? '').replace(/\s+/g, '')

/* ------------------------------------------------------------------ */
/* 结果收集                                                            */
/* ------------------------------------------------------------------ */
const issues = []
const linkChecks = []
const fileStats = new Map()

function addIssue(severity, code, file, id, message, extra = {}) {
  issues.push({ severity, code, file: file ? path.basename(file) : null, id: id || null, message, ...extra })
  if (file) {
    const key = path.basename(file)
    if (!fileStats.has(key)) fileStats.set(key, { errors: 0, warnings: 0, infos: 0 })
    const st = fileStats.get(key)
    if (severity === 'error') st.errors++
    else if (severity === 'warn') st.warnings++
    else st.infos++
  }
}
const err = (code, file, id, msg, extra) => addIssue('error', code, file, id, msg, extra)
const warn = (code, file, id, msg, extra) => addIssue('warn', code, file, id, msg, extra)
const info = (code, file, id, msg, extra) => addIssue('info', code, file, id, msg, extra)

/* ------------------------------------------------------------------ */
/* 真实注解索引（javap 提取）                                          */
/* ------------------------------------------------------------------ */
const INDEX_FILE = path.join(ROOT, 'tools', 'annotation-audit', 'index', 'annotations.txt')
const index = new Map() // fqcn -> {fqcn, targets, retention, documented, attrs: Map<name,{type,default,hasDefault}>}
const indexBySimple = new Map() // simpleName -> [fqcn]

function loadIndex(file) {
  if (!fs.existsSync(file)) {
    addIssue('info', 'INDEX_MISSING', file, null, '注解索引不存在，跳过所有事实核对（先运行 tools/annotation-audit）')
    return
  }
  // javap 输出里偶尔有 \0（char 默认值）与控制字符，先清理再按行解析
  const text = fs
    .readFileSync(file, 'utf8')
    // Spring 的 ValueConstants.DEFAULT_NONE 是个特殊字符串常量，javap 会把它原样打印成多行空白 + \uE000..\uE002，
    // 直接裁剪会被误判成「空字符串默认值」。先还原成语义名，再清控制字符。
    .replace(/default \n\t\t\n\t\t\n\uE000\uE001\uE002\n\t\t\t\t\n/g, 'default ValueConstants.DEFAULT_NONE\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  const lines = text.split(/\r?\n/)
  let cur = null
  for (const raw of lines) {
    const line = raw.replace(/\uFFFD/g, '')
    const h = line.match(/^##\s+([\w.$]+)\s*$/)
    if (h) {
      cur = { fqcn: h[1], targets: [], retention: '', documented: false, attrs: new Map() }
      index.set(cur.fqcn, cur)
      const simple = h[1].split('.').pop()
      if (!indexBySimple.has(simple)) indexBySimple.set(simple, [])
      indexBySimple.get(simple).push(h[1])
      continue
    }
    if (!cur) continue
    let m = line.match(/^target:\s*(.+)$/)
    if (m) { cur.targets = m[1].split(',').map((s) => s.trim()).filter(Boolean); continue }
    m = line.match(/^retention:\s*(.+)$/)
    if (m) { cur.retention = m[1].trim(); continue }
    if (line.trim() === 'documented: true') { cur.documented = true; continue }
    m = line.match(/^  - (\S+) (\w+)\(\)\s+\/\/\s*no default\s*$/)
    if (m) { cur.attrs.set(m[2], { type: m[1], default: '', hasDefault: false }); continue }
    m = line.match(/^  - (\S+) (\w+)\(\)\s+default(?: (.*))?$/)
    if (m) { cur.attrs.set(m[2], { type: m[1], default: (m[3] ?? '').trim(), hasDefault: true }); continue }
    if (/element resolution failed/.test(line)) continue
  }
}
loadIndex(INDEX_FILE)

/* ------------------------------------------------------------------ */
/* 通用小工具                                                          */
/* ------------------------------------------------------------------ */
function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v) }
function isNonEmptyStr(v, min = 1, max = Infinity) {
  return typeof v === 'string' && v.trim().length >= min && v.trim().length <= max
}
function isUrl(u) {
  try { const x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:' } catch { return false }
}
function kebabOf(name) {
  return String(name || '')
    .replace(/^@/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}
function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h >>> 0
}
function normalizeForDup(s) {
  return String(s ?? '').toLowerCase().replace(/[^\u4e00-\u9fffa-z0-9]/g, '')
}
function ngrams(s, n = 3) {
  const set = new Set()
  for (let i = 0; i + n <= s.length; i++) set.add(s.slice(i, i + n))
  return set
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/* 去掉 Java 注释，保留字符串字面量内容（避免把 "http://x" 当注释） */
function stripJavaComments(code) {
  let out = ''
  let i = 0
  let state = 'code' // code | line | block | str | chr
  while (i < code.length) {
    const c = code[i]
    const n = code[i + 1]
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; i += 2; out += '  '; continue }
      if (c === '/' && n === '*') { state = 'block'; i += 2; out += '  '; continue }
      if (c === '"') { state = 'str'; out += c; i++; continue }
      if (c === "'") { state = 'chr'; out += c; i++; continue }
      out += c; i++; continue
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n' } else out += ' '
      i++; continue
    }
    if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; i += 2; out += '  '; continue }
      out += c === '\n' ? '\n' : ' '
      i++; continue
    }
    if (state === 'str') {
      if (c === '\\') { out += c + (n ?? ''); i += 2; continue }
      if (c === '"') state = 'code'
      out += c; i++; continue
    }
    if (state === 'chr') {
      if (c === '\\') { out += c + (n ?? ''); i += 2; continue }
      if (c === "'") state = 'code'
      out += c; i++; continue
    }
  }
  return out
}

function parseImports(code) {
  const imports = []
  const re = /^\s*import\s+(?:static\s+)?([\w.$]+)\s*;/gm
  let m
  while ((m = re.exec(code))) imports.push(m[1])
  return imports
}

/** 判断 @Target 是否允许某使用场景 */
const TARGET_SCENARIOS = {
  TYPE: ['TYPE'],
  ANNOTATION_DECL: ['ANNOTATION_TYPE', 'TYPE'],
  METHOD: ['METHOD'],
  FIELD: ['FIELD'],
  CONSTRUCTOR: ['CONSTRUCTOR'],
}
function targetsAllow(targets, scenario) {
  if (!targets.length) return true // 未声明 @Target = 所有声明处可用
  const allowed = TARGET_SCENARIOS[scenario] || []
  return targets.some((t) => allowed.includes(t))
}

/** 猜测注解后一行的声明类型 */
function nextDeclContext(lines, start) {
  for (let j = start + 1; j < Math.min(lines.length, start + 8); j++) {
    let line = lines[j].trim()
    if (!line) continue
    if (line.startsWith('@')) continue // 叠注解
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
    if (/@interface\b/.test(line)) return 'ANNOTATION_DECL'
    // 真正的类型声明：修饰符后必须紧跟 class/interface/enum/record + 名字，
    // 避免把 CreateGroup.class、Foo.class 里的 "class" 误判成类型声明。
    if (/^(?:(?:public|protected|private|static|final|abstract|sealed|non-sealed|strictfp)\s+)*(class|interface|enum|record)\s+[A-Za-z_$][\w$]*/.test(line)) return 'TYPE'
    // 构造器 / 方法
    if (/^(public|protected|private)\s+[A-Z]\w*\s*\(/.test(line)) return 'CONSTRUCTOR'
    if (/^(public|protected|private|static|final|synchronized|abstract|default|native)\b.*\([^;]*\)\s*(throws [\w.,\s]+)?\{?\s*$/.test(line) &&
        !/^(if|for|while|switch|catch|try|return|new)\b/.test(line)) return 'METHOD'
    // 字段
    if (/^(public|protected|private|static|final|volatile|transient|\s)*[\w$.<>\[\],?\s]+\s+\w+\s*(=|;)/.test(line) &&
        !/[({]\s*$/.test(line)) return 'FIELD'
    // 方法（无修饰符，如 void run()）
    if (/^[\w$.<>\[\],?\s]+\s+\w+\s*\([^;]*\)\s*\{?\s*$/.test(line) &&
        !/^(record|class|interface|enum)\b/.test(line)) return 'METHOD'
    return null
  }
  return null
}

/* ------------------------------------------------------------------ */
/* 数据加载                                                            */
/* ------------------------------------------------------------------ */
function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8')
  try { return JSON.parse(raw) } catch (e) {
    err('JSON_PARSE', file, null, `JSON 解析失败：${e.message}`)
    return null
  }
}

const files = fs.existsSync(opts.dataDir)
  ? fs.readdirSync(opts.dataDir).filter((f) => f.endsWith('.json')).sort()
  : []
const dataFiles = []
for (const name of files) {
  const file = path.join(opts.dataDir, name)
  const isAnnotation = name.startsWith('annotations-')
  const isKnowledge = name.startsWith('knowledge-')
  if (!isAnnotation && !isKnowledge) {
    // audit-summary.json 是核查数据汇总，commands-*/topics-* 由各自校验/审计脚本负责
    if (name === 'audit-summary.json' || name.startsWith('commands-') || name.startsWith('topics-')) continue
    addIssue('info', 'UNKNOWN_DATA_FILE', file, null, `不是 annotations-*/knowledge-*，前端不会加载：${name}`)
    continue
  }
  dataFiles.push({ name, file, kind: isAnnotation ? 'annotation' : 'knowledge', data: readJson(file) })
}

/* ------------------------------------------------------------------ */
/* 注解条目校验                                                        */
/* ------------------------------------------------------------------ */
const seenAnnotationIds = new Map()
const seenAnnotationNames = new Map()
const seenTaglines = new Map()
const annotationItems = [] // {file,item}
const deprecationClaims = [] // 供人工核对的 versionNote
const highRiskItems = []
const exampleFindings = []

function normDefaultValue(v, hasDefault = false) {
  let s = String(v ?? '').trim()
  if (s === '') return hasDefault ? { kind: 'value', s: '' } : { kind: 'dash', s: '' }
  if (s === '—' || s === '–' || s === '-' || s === '无' || s === 'null') return { kind: 'dash', s: '' }
  if (/^".*"$/.test(s)) s = s.slice(1, -1)
  if (/^'.*'$/.test(s)) s = s.slice(1, -1)
  s = s.replace(/^class\s+/, '').replace(/\.class$/, '').replace(/\s+/g, '').toLowerCase()
  if (s.startsWith('{') && s.endsWith('}')) s = '[' + s.slice(1, -1) + ']'
  return { kind: 'value', s }
}
function defaultEquivalent(truthRaw, truthHasDefault, given) {
  const a = normDefaultValue(truthRaw, truthHasDefault)
  // given 是作者显式写的字符串："" 表示「默认值是空字符串」，不是「无默认值」
  const b = normDefaultValue(given, given === '')
  if (a.kind === 'dash' && b.kind === 'dash') return true
  if (a.kind !== b.kind) return false
  if (a.s === b.s) return true
  const last = (s) => s.split('.').pop()
  if (last(a.s) === last(b.s) && b.s.includes('.')) return true
  if (last(b.s) === last(a.s) && a.s.includes('.')) return true
  // javap 对枚举常量会打印成「500 INTERNAL_SERVER_ERROR」，作者只写 INTERNAL_SERVER_ERROR 是等价的
  if (/^[A-Z][A-Z0-9_]*$/.test(b.s) && a.s.endsWith(` ${b.s}`)) return true
  // 数组 / 集合的松散比较：只比较首元素
  if (a.s.startsWith('[') && b.s.startsWith('[')) {
    const fa = a.s.slice(1, -1).split(',')[0] || ''
    const fb = b.s.slice(1, -1).split(',')[0] || ''
    return fa === fb
  }
  return false
}

function validateAnnotation(item, file, i, seenLocal) {
  const where = `items[${i}]`
  if (!isObj(item)) { err('ITEM_NOT_OBJECT', file, null, `${where} 不是对象`); return }
  const id = item.id || `${where}`
  const idLabel = id

  /* ---- 必填字段 ---- */
  for (const k of ['id', 'name', 'category', 'subcategory', 'package', 'level', 'tagline', 'plain', 'exampleTitle', 'example']) {
    if (!isNonEmptyStr(item[k])) err('MISSING_FIELD', file, idLabel, `${where}.${k} 缺失或不是非空字符串`)
  }
  if (item.since !== undefined && !isNonEmptyStr(item.since)) err('FIELD_TYPE', file, idLabel, `${where}.since 可选，但写了必须是非空字符串`)
  if (item.versionNote !== undefined && item.versionNote !== null && !isNonEmptyStr(item.versionNote)) {
    err('FIELD_TYPE', file, idLabel, `${where}.versionNote 必须是 null 或非空字符串`)
  }

  /* ---- id / name / category / level ---- */
  if (isNonEmptyStr(item.id)) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id)) err('ID_FORMAT', file, idLabel, `id 必须是 kebab-case：${item.id}`)
    if (seenLocal.has(item.id)) err('DUPLICATE_ID_IN_FILE', file, idLabel, `文件内重复 id：${item.id}`)
    seenLocal.add(item.id)
    if (seenAnnotationIds.has(item.id)) {
      err('DUPLICATE_ID', file, idLabel, `跨文件重复 id：${item.id}（另见 ${seenAnnotationIds.get(item.id)}）`)
    } else seenAnnotationIds.set(item.id, path.basename(file))
    const expected = kebabOf(item.name)
    if (expected && expected !== item.id) {
      info('ID_NAME_MISMATCH', file, idLabel, `id「${item.id}」与注解名推导的「${expected}」不一致（确认是否有意）`)
    }
  }
  if (isNonEmptyStr(item.name)) {
    if (!item.name.startsWith('@')) err('NAME_FORMAT', file, idLabel, `name 必须以 @ 开头：${item.name}`)
    const simple = item.name.replace(/^@/, '')
    const nameKey = `${item.name}::${item.package || ''}`
    if (seenAnnotationNames.has(nameKey)) {
      err('DUPLICATE_NAME', file, idLabel, `全站重复收录同一注解（同名同包）：${item.name}（另见 ${seenAnnotationNames.get(nameKey)}）`)
    } else {
      seenAnnotationNames.set(nameKey, path.basename(file))
      // 同名不同包：例如 Spring Data 的 @Param 与 MyBatis 的 @Param，是真实存在的两个注解，允许，仅提示
      const sameSimple = [...seenAnnotationNames.keys()].filter((k) => k.startsWith(`${item.name}::`) && k !== nameKey)
      if (sameSimple.length) info('SAME_NAME_OTHER_PACKAGE', file, idLabel, `与 ${sameSimple.join('、')} 同名但不同包（合法的不同注解，注意示例 import 不要混）`)
    }
    if (isNonEmptyStr(item.package) && item.package.split('.').pop() !== simple) {
      err('NAME_PACKAGE_MISMATCH', file, idLabel, `name ${item.name} 与 package 末段「${item.package.split('.').pop()}」不一致`)
    }
  }
  if (isNonEmptyStr(item.category) && !ANNOTATION_CATEGORIES.has(item.category)) {
    err('INVALID_CATEGORY', file, idLabel, `未知 category：${item.category}`)
  }
  if (isNonEmptyStr(item.level) && !LEVELS.has(item.level)) {
    err('INVALID_LEVEL', file, idLabel, `level 必须是 入门/进阶：${item.level}`)
  }
  if (isNonEmptyStr(item.subcategory)) {
    const n = cjkCount(item.subcategory)
    if (n < 2 || visible(item.subcategory).length > 12) warn('SUBCATEGORY_LENGTH', file, idLabel, `subcategory 建议 2–8 个汉字：${item.subcategory}`)
  }

  /* ---- 文案长度 ---- */
  if (isNonEmptyStr(item.tagline)) {
    const n = cjkCount(item.tagline)
    if (n > 22) err('TAGLINE_TOO_LONG', file, idLabel, `tagline 超过 22 个汉字（${n}）：${item.tagline}`)
    const key = visible(item.tagline)
    if (seenTaglines.has(key)) warn('DUPLICATE_TAGLINE', file, idLabel, `tagline 与 ${seenTaglines.get(key)} 完全相同`)
    else seenTaglines.set(key, idLabel)
  }
  if (isNonEmptyStr(item.plain)) {
    // 规范里的 @Component 样例本身就是 64 个汉字 / 132 个可见字符，故「字」按可见字符计（去空白）
    const n = visible(item.plain).length
    if (n < 80 || n > 200) err('PLAIN_LENGTH', file, idLabel, `plain 应为 80–200 字（当前可见字符 ${n}）`)
    if (cjkCount(item.plain) < 40) info('PLAIN_TOO_LITTLE_CHINESE', file, idLabel, `plain 汉字偏少（${cjkCount(item.plain)}），注意「说人话」`)
    for (const banned of ['据说', '听说', '网上有人说', '业界最强', '必须掌握', '吊打', '秒杀', '神器']) {
      if (item.plain.includes(banned)) warn('BANNED_PHRASE', file, idLabel, `plain 含疑似营销/无依据措辞「${banned}」`)
    }
  }

  /* ---- 数组字段 ---- */
  const arrCheck = (key, min, max, code, label) => {
    if (!Array.isArray(item[key])) { err('FIELD_TYPE', file, idLabel, `${where}.${key} 必须是数组`); return false }
    if (item[key].length < min || item[key].length > max) {
      err(code, file, idLabel, `${label} 需要 ${min}–${max} 条（当前 ${item[key].length}）`)
      return false
    }
    return true
  }
  if (arrCheck('keyPoints', 3, 5, 'KEYPOINTS_COUNT', 'keyPoints')) {
    item.keyPoints.forEach((k, j) => {
      if (!isNonEmptyStr(k) || visible(k).length < 8) err('KEYPOINT_TOO_SHORT', file, idLabel, `keyPoints[${j}] 太短或为空`)
      else if (visible(k).length > 160) info('KEYPOINT_TOO_LONG', file, idLabel, `keyPoints[${j}] 过长（${visible(k).length} 字符），建议 1–2 句`)
      if (typeof k === 'string' && /据说|听说|网上有人说/.test(k)) warn('BANNED_PHRASE', file, idLabel, `keyPoints[${j}] 含无依据措辞`)
    })
  }
  if (arrCheck('notes', 2, 4, 'NOTES_COUNT', 'notes')) {
    item.notes.forEach((k, j) => {
      if (!isNonEmptyStr(k) || visible(k).length < 6) err('NOTE_TOO_SHORT', file, idLabel, `notes[${j}] 太短或为空`)
      if (typeof k === 'string' && /据说|听说|网上有人说/.test(k)) warn('BANNED_PHRASE', file, idLabel, `notes[${j}] 含无依据措辞`)
    })
  }
  if (arrCheck('tags', 2, 5, 'TAGS_COUNT', 'tags')) {
    item.tags.forEach((t, j) => { if (!isNonEmptyStr(t)) err('FIELD_TYPE', file, idLabel, `tags[${j}] 必须是非空字符串`) })
  }
  if (arrCheck('related', 2, 5, 'RELATED_COUNT', 'related')) {
    item.related.forEach((r, j) => {
      if (!isNonEmptyStr(r) || !r.startsWith('@')) {
        err('RELATED_FORMAT', file, idLabel, `related[${j}] 必须是带 @ 的注解名：${r}`)
        return
      }
      if (index.size && !indexBySimple.has(r.replace(/^@/, ''))) {
        warn('RELATED_NOT_IN_INDEX', file, idLabel, `related[${j}] ${r} 在官方依赖索引中不存在（拼写错误？）`)
      }
    })
  }
  if (!Array.isArray(item.attributes)) {
    err('FIELD_TYPE', file, idLabel, `${where}.attributes 必须是数组（没有属性写 []）`)
  } else if (item.attributes.length > 8) {
    err('ATTRIBUTES_COUNT', file, idLabel, `attributes 最多 8 条（当前 ${item.attributes.length}）`)
  }

  /* ---- docs ---- */
  if (!Array.isArray(item.docs) || item.docs.length < 1 || item.docs.length > 2) {
    err('DOCS_COUNT', file, idLabel, `docs 需要 1–2 条（当前 ${Array.isArray(item.docs) ? item.docs.length : '非数组'}）`)
  } else {
    item.docs.forEach((d, j) => {
      if (!isObj(d) || !isNonEmptyStr(d.label) || !isNonEmptyStr(d.url)) {
        err('DOCS_FORMAT', file, idLabel, `docs[${j}] 需要非空 label 与 url`)
        return
      }
      const labelHints = ['官方', '参考', '文档', '指南', '规范', 'API', 'Javadoc', 'Reference', 'Guide', 'Spec', 'Wiki', 'Release', 'Framework', 'Boot', 'Spring', 'Jakarta', 'MyBatis', 'Hibernate']
      if (!labelHints.some((h) => d.label.includes(h))) {
        info('DOC_LABEL', file, idLabel, `docs[${j}].label 建议写明官方出处：${d.label}`)
      }
      if (!isUrl(d.url)) err('LINK_INVALID_URL', file, idLabel, `docs[${j}].url 不是合法 http(s) URL：${d.url}`)
    })
  }

  /* ---- since / versionNote ---- */
  if (isNonEmptyStr(item.since) && !/^(Spring|Spring Boot|Spring Framework|Jakarta|JPA|JUnit|MyBatis|Hibernate|Mockito|Boot)[^\d]*\d/.test(item.since)) {
    info('SINCE_FORMAT', file, idLabel, `since 格式建议「Spring 2.0」这类官方版本号：${item.since}`)
  }
  if (isNonEmptyStr(item.versionNote)) {
    if (/据说|听说|未核实|网上|大概|应该是/.test(item.versionNote)) {
      err('VERSION_NOTE_UNSOURCED', file, idLabel, `versionNote 含无依据措辞：${item.versionNote}`)
    }
    if (/废弃|移除|deprecat|removed|Boot 4|Spring Boot 4|Framework 7|不再/.test(item.versionNote)) {
      deprecationClaims.push({ file: path.basename(file), id: idLabel, note: item.versionNote })
    }
    if (!/\d/.test(item.versionNote)) info('VERSION_NOTE_NO_VERSION', file, idLabel, `versionNote 没有版本号：${item.versionNote}`)
  }

  /* ---- 示例代码 ---- */
  if (isNonEmptyStr(item.example)) {
    const ex = item.example
    if (ex.includes('```')) err('EXAMPLE_FENCE', file, idLabel, 'example 不应包含 ``` 围栏')
    const lines = ex.split('\n')
    if (lines.length < 15 || lines.length > 40) warn('EXAMPLE_LINES', file, idLabel, `example 建议 15–40 行（当前 ${lines.length} 行）`)
    const code = stripJavaComments(ex)
    const codeLines = code.split('\n')
    const imports = parseImports(code)

    // javax.* 命名空间（Boot 3 起应为 jakarta.*）
    const javaxImport = imports.find((p) => /^javax\.(persistence|validation|servlet|annotation|transaction|inject|ws)/.test(p))
    if (javaxImport) err('JAVAX_NAMESPACE', file, idLabel, `Boot 3 应使用 jakarta.* 命名空间，示例却 import ${javaxImport}`)
    if (/\bjavax\.(persistence|validation|servlet)\b/.test(code)) {
      err('JAVAX_NAMESPACE', file, idLabel, '示例代码中出现 javax.persistence / javax.validation / javax.servlet（Boot 3 已改 jakarta.*）')
    }

    // 自身注解 import 与 package 一致性
    const selfSimple = isNonEmptyStr(item.name) ? item.name.replace(/^@/, '') : null
    if (selfSimple && isNonEmptyStr(item.package)) {
      const sameSimpleImports = imports.filter((p) => p.split('.').pop() === selfSimple)
      for (const imp of sameSimpleImports) {
        if (imp !== item.package) {
          err('IMPORT_PACKAGE_MISMATCH', file, idLabel, `示例 import ${imp}，但 package 字段是 ${item.package}`)
        }
      }
      if (sameSimpleImports.length === 0 && imports.length && !code.includes(`package ${item.package}`)) {
        info('EXAMPLE_NO_SELF_IMPORT', file, idLabel, `示例没有 import ${item.package}（建议补上，便于读者直接复制）`)
      }
    }

    // 示例里用到的注解：必须真实存在（索引 / JDK / 示例内自定义）
    const customDefs = new Set([...code.matchAll(/@interface\s+(\w+)/g)].map((m) => m[1]))
    const used = new Map() // simpleName -> {qualified?: string, lines: number[]}
    for (let j = 0; j < codeLines.length; j++) {
      const line = codeLines[j].trim()
      const m = line.match(/^@([\w.]+)/)
      if (!m) continue
      const raw = m[1]
      // 排除 @interface 自身与注解参数里的 @（行首基本不会）
      const simple = raw.split('.').pop()
      if (simple === 'interface') continue
      if (!used.has(simple)) used.set(simple, { lines: [], qualified: raw.includes('.') ? raw : null })
      used.get(simple).lines.push(j)
    }
    for (const [simple, meta] of used) {
      if (customDefs.has(simple) || JDK_ANNOTATIONS.has(simple)) continue
      let fqcn = meta.qualified
      if (!fqcn) {
        const imp = imports.find((p) => p.split('.').pop() === simple)
        if (imp) fqcn = imp
      }
      if (!fqcn && indexBySimple.has(simple)) {
        const cands = indexBySimple.get(simple)
        fqcn = cands.length === 1 ? cands[0] : cands
      }
      if (!fqcn) {
        warn('EXAMPLE_ANNOTATION_UNKNOWN', file, idLabel, `示例使用了 @${simple}，但它不在官方依赖索引里（不存在 / 拼写错误 / 第三方库需注明）`)
        continue
      }
      const candidates = Array.isArray(fqcn) ? fqcn : [fqcn]
      const known = candidates.filter((c) => index.has(c))
      if (!known.length) {
        warn('EXAMPLE_ANNOTATION_UNKNOWN', file, idLabel, `示例使用了 @${simple}（${candidates.join(' / ')}），但不在官方依赖索引里（第三方库需在示例旁注明）`)
        continue
      }
      // @Target 与使用位置是否矛盾
      const scenario = nextDeclContext(codeLines, meta.lines[meta.lines.length - 1])
      if (scenario) {
        const real = known.find((c) => targetsAllow(index.get(c).targets, scenario))
        if (!real) {
          const first = index.get(known[0])
          warn('TARGET_VIOLATION', file, idLabel,
            `示例把 @${simple} 用在 ${scenario} 位置，但其 @Target 为 [${first.targets.join(', ')}]（${known[0]}）`,
            { evidence: `index:${known[0]} targets=${first.targets.join(',')}` })
        }
      }
    }

    // 高风险语义：@Transactional 示例里出现 private 方法（Spring 代理不生效）——常见错误
    if (/@Transactional/.test(code)) {
      for (const line of codeLines) {
        if (/@Transactional/.test(line)) continue
      }
      const m = code.match(/@Transactional[\s\S]{0,80}?\bprivate\s+[\w<>\[\]]+\s+(\w+)\s*\(/)
      if (m) warn('TRANSACTIONAL_PRIVATE', file, idLabel, `示例把 @Transactional 标在 private 方法（${m[1]}）上：Spring AOP 代理不会拦截 private 方法，事务不生效`)
    }
  }
  if (isNonEmptyStr(item.exampleTitle)) {
    if (visible(item.exampleTitle).length < 2) warn('EXAMPLE_TITLE', file, idLabel, 'exampleTitle 太短')
  }

  /* ---- 对照真实索引：package / 属性 / 默认值 ---- */
  if (index.size && isNonEmptyStr(item.package)) {
    const real = index.get(item.package)
    if (!real) {
      err('PACKAGE_NOT_FOUND', file, idLabel, `package 在 Boot 3.5.16 依赖索引中找不到：${item.package}（拼写错误或不属于官方依赖）`)
    } else {
      const attrs = Array.isArray(item.attributes) ? item.attributes : []
      for (const [j, a] of attrs.entries()) {
        if (!isObj(a) || !isNonEmptyStr(a.name)) { err('ATTR_FORMAT', file, idLabel, `attributes[${j}] 需要 name/type/default/desc`); continue }
        if (!isNonEmptyStr(a.type)) err('ATTR_FORMAT', file, idLabel, `attributes[${j}].type 缺失`)
        if (!isNonEmptyStr(a.desc) || visible(a.desc).length < 4) info('ATTR_FORMAT', file, idLabel, `attributes[${j}].desc 偏短（建议一句话说明含义/默认值）`)
        const realAttr = real.attrs.get(a.name)
        if (!realAttr) {
          err('ATTR_NOT_FOUND', file, idLabel, `属性「${a.name}」在 ${item.package} 中不存在（真实属性：${[...real.attrs.keys()].join(', ') || '无'}）`)
          continue
        }
        // 类型
        const stripGenerics = (s) => String(s).replace(/<[^>]*>/g, '').replace(/[\s?]/g, '').replace(/\$/g, '.')
        const nt = stripGenerics(a.type)
        const rt = stripGenerics(realAttr.type)
        const lastSeg = (s) => s.split('.').pop()
        // 数组维度必须一致（String vs String[] 是真错误）；只放宽包名前缀差异（Foo vs com.x.Foo）
        const sameType = nt === rt || lastSeg(nt) === lastSeg(rt)
        if (isNonEmptyStr(a.type) && !sameType) {
          warn('ATTR_TYPE_MISMATCH', file, idLabel, `属性「${a.name}」类型写的是 ${a.type}，索引为 ${realAttr.type}`, { evidence: `index:${item.package}#${a.name}` })
        }
        // 默认值
        const given = a.default
        if (given === undefined || given === null) {
          err('ATTR_DEFAULT_MISSING', file, idLabel, `属性「${a.name}」缺少 default（无默认值写 "—"）`)
        } else if (realAttr.hasDefault) {
          if (normDefaultValue(given, given === '').kind === 'dash') {
            warn('ATTR_DEFAULT_MISSING', file, idLabel, `属性「${a.name}」真实默认值是 ${realAttr.default === '' ? '""（空字符串）' : realAttr.default}，却写成了「${given}」`, { evidence: `index:${item.package}#${a.name}` })
          } else if (!defaultEquivalent(realAttr.default, realAttr.hasDefault, given)) {
            warn('ATTR_DEFAULT_MISMATCH', file, idLabel, `属性「${a.name}」默认值与索引不一致：写了 ${JSON.stringify(given)}，索引为 ${JSON.stringify(realAttr.default)}`, { evidence: `index:${item.package}#${a.name}` })
          }
        } else {
          if (normDefaultValue(given, false).kind !== 'dash') {
            warn('ATTR_DEFAULT_UNEXPECTED', file, idLabel, `属性「${a.name}」在索引里没有默认值（no default），却写了 ${JSON.stringify(given)}`, { evidence: `index:${item.package}#${a.name}` })
          }
        }
      }
    }
  }

  /* ---- 高风险清单 ---- */
  const simpleName = item.name ? item.name.replace(/^@/, '') : ''
  if (HIGH_RISK_ANNOTATIONS.has(simpleName)) {
    highRiskItems.push({ file: path.basename(file), id: idLabel, name: item.name, package: item.package })
  }
  annotationItems.push({ file, fileBasename: path.basename(file), item })
}

/* ------------------------------------------------------------------ */
/* 知识文章校验                                                        */
/* ------------------------------------------------------------------ */
const seenKnowledgeIds = new Map()
const seenKnowledgeTitles = new Map()
const knowledgeItems = []

function validateKnowledge(item, file, i, seenLocal) {
  const id = item && item.id ? item.id : `items[${i}]`
  if (!isObj(item)) { err('ITEM_NOT_OBJECT', file, null, `items[${i}] 不是对象`); return }
  for (const k of ['id', 'title', 'category', 'level', 'summary', 'content']) {
    if (!isNonEmptyStr(item[k])) err('MISSING_FIELD', file, id, `items[${i}].${k} 缺失或不是非空字符串`)
  }
  if (isNonEmptyStr(item.id)) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id)) err('ID_FORMAT', file, id, `id 必须是 kebab-case：${item.id}`)
    if (seenLocal.has(item.id)) err('DUPLICATE_ID_IN_FILE', file, id, `文件内重复 id：${item.id}`)
    seenLocal.add(item.id)
    if (seenKnowledgeIds.has(item.id)) err('DUPLICATE_ID', file, id, `跨文件重复 id：${item.id}（另见 ${seenKnowledgeIds.get(item.id)}）`)
    else seenKnowledgeIds.set(item.id, path.basename(file))
  }
  if (isNonEmptyStr(item.title)) {
    const key = visible(item.title)
    if (seenKnowledgeTitles.has(key)) warn('DUPLICATE_TITLE', file, id, `标题与 ${seenKnowledgeTitles.get(key)} 重复：${item.title}`)
    else seenKnowledgeTitles.set(key, id)
    if (visible(item.title).length > 40) warn('TITLE_TOO_LONG', file, id, `标题过长（${visible(item.title).length} 字符）`)
  }
  if (isNonEmptyStr(item.category) && !KNOWLEDGE_CATEGORIES.has(item.category)) {
    err('INVALID_CATEGORY', file, id, `未知知识分类：${item.category}`)
  }
  if (isNonEmptyStr(item.level) && !LEVELS.has(item.level)) err('INVALID_LEVEL', file, id, `level 必须是 入门/进阶：${item.level}`)
  if (!Number.isInteger(item.readingMinutes) || item.readingMinutes < 1 || item.readingMinutes > 30) {
    err('READING_MINUTES', file, id, `readingMinutes 需要 1–30 的整数：${item.readingMinutes}`)
  }
  if (isNonEmptyStr(item.summary)) {
    const n = cjkCount(item.summary)
    if (n < 10) info('SUMMARY_TOO_SHORT', file, id, `summary 偏短（${n} 汉字），建议一句话讲清文章结论`)
    if (n > 60) err('SUMMARY_TOO_LONG', file, id, `summary 超过 60 汉字（${n}）`)
  }
  if (!Array.isArray(item.tags) || item.tags.length < 2 || item.tags.length > 5) {
    err('TAGS_COUNT', file, id, `tags 需要 2–5 个（当前 ${Array.isArray(item.tags) ? item.tags.length : '非数组'}）`)
  }
  if (!Array.isArray(item.sources) || item.sources.length < 1 || item.sources.length > 3) {
    err('SOURCES_COUNT', file, id, `sources 需要 1–3 条`)
  } else {
    item.sources.forEach((s, j) => {
      if (!isObj(s) || !isNonEmptyStr(s.label) || !isNonEmptyStr(s.url)) err('SOURCES_FORMAT', file, id, `sources[${j}] 需要非空 label 与 url`)
      else if (!isUrl(s.url)) err('LINK_INVALID_URL', file, id, `sources[${j}].url 不是合法 URL：${s.url}`)
    })
  }
  if (isNonEmptyStr(item.content)) {
    const c = item.content
    const fences = (c.match(/```/g) || []).length
    if (fences % 2 !== 0) err('KNOWLEDGE_UNBALANCED_FENCE', file, id, `content 的 \`\`\` 代码围栏数量为奇数（${fences}），Markdown 会错乱`)
    const sections = (c.match(/^##\s+/gm) || []).length
    if (sections < 2 || sections > 4) err('KNOWLEDGE_SECTIONS', file, id, `content 需要 2–4 个 ## 小节（当前 ${sections}）`)
    const n = cjkCount(c)
    if (n < 550 || n > 1300) err('KNOWLEDGE_LENGTH', file, id, `正文应约 600–1200 汉字（当前 ${n}）`)
    else if (n < 600 || n > 1200) warn('KNOWLEDGE_LENGTH', file, id, `正文略超出 600–1200（当前 ${n} 汉字）`)
    if (!/```|\n\s*\|/.test(c) && !/\n\s*[-*]\s+/.test(c) && !/\n\s*\d+\.\s+/.test(c)) {
      err('KNOWLEDGE_NO_VISUAL', file, id, 'content 需要至少 1 段代码 / 表格 / 清单')
    }
    for (const banned of ['据说', '听说', '网上有人说', '业界最强', '快 10 倍', '性能提升 10']) {
      if (c.includes(banned)) warn('BANNED_PHRASE', file, id, `content 含疑似无依据措辞「${banned}」`)
    }
    if (/^#\s+/m.test(c)) warn('KNOWLEDGE_H1', file, id, 'content 里不应再出现 # 一级标题（页面已有 h1）')
  }
  knowledgeItems.push({ file, fileBasename: path.basename(file), item })
}

/* ------------------------------------------------------------------ */
/* 主循环：逐文件校验                                                  */
/* ------------------------------------------------------------------ */
if (!dataFiles.length) {
  info('DATA_NOT_READY', null, null, `数据目录还没有 JSON 文件：${path.relative(ROOT, opts.dataDir)}（作者仍在生成内容）`)
}

for (const { name, file, kind, data } of dataFiles) {
  if (!data) continue
  if (!isObj(data) || !Array.isArray(data.items)) {
    err('TOPLEVEL_FORMAT', file, null, '顶层必须是 { "generatedBy": "...", "items": [...] }')
    continue
  }
  if (!isNonEmptyStr(data.generatedBy)) warn('GENERATED_BY', file, null, '顶层缺少 generatedBy（写明作者角色）')
  else if (EXPECTED_FILES[name] && data.generatedBy !== EXPECTED_FILES[name]) {
    warn('GENERATED_BY_MISMATCH', file, null, `generatedBy 应为 ${EXPECTED_FILES[name]}，写的是 ${data.generatedBy}`)
  }
  const seenLocal = new Set()
  data.items.forEach((item, i) => {
    if (kind === 'annotation') validateAnnotation(item, file, i, seenLocal)
    else validateKnowledge(item, file, i, seenLocal)
  })
}

/* 缺失的预期文件（只有数据已开始落盘时才提示） */
if (dataFiles.length && opts.dataDir === path.join(ROOT, 'src', 'data')) {
  for (const name of Object.keys(EXPECTED_FILES)) {
    if (!files.includes(name)) info('MISSING_FILE', null, null, `预期数据文件未出现：${name}`)
  }
}

/* ------------------------------------------------------------------ */
/* 近重复检查（plain / keyPoints）                                     */
/* ------------------------------------------------------------------ */
for (let a = 0; a < annotationItems.length; a++) {
  for (let b = a + 1; b < annotationItems.length; b++) {
    const A = annotationItems[a].item
    const B = annotationItems[b].item
    if (!isNonEmptyStr(A.plain) || !isNonEmptyStr(B.plain)) continue
    const na = normalizeForDup(A.plain)
    const nb = normalizeForDup(B.plain)
    if (na.length < 40 || nb.length < 40) continue
    if (na === nb) {
      warn('DUPLICATE_PLAIN', annotationItems[a].file, A.id, `plain 与 ${B.id}（${annotationItems[b].fileBasename}）完全相同`)
      continue
    }
    const sim = jaccard(ngrams(na), ngrams(nb))
    if (sim >= 0.8) {
      info('NEAR_DUPLICATE_PLAIN', annotationItems[a].file, A.id, `plain 与 ${B.id}（${annotationItems[b].fileBasename}）相似度 ${(sim * 100).toFixed(0)}%`)
    }
  }
}

/* ------------------------------------------------------------------ */
/* 链接检查                                                            */
/* ------------------------------------------------------------------ */
const CACHE_FILE = path.join(ROOT, 'tools', '.link-cache.json')
let linkCache = {}
if (fs.existsSync(CACHE_FILE) && !opts.refreshLinks) {
  try { linkCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) } catch { linkCache = {} }
}
const CACHE_TTL = 7 * 24 * 3600 * 1000

// 即使 --skip-links，也做域名/路径白名单的离线校验（只是不发 HTTP 请求）
await runLinkChecks()

function classifyUrl(rawUrl) {
  const u = new URL(rawUrl)
  const host = u.hostname.toLowerCase()
  const entry = URL_ALLOWLIST.find((w) => host === w.host || host.endsWith(`.${w.host}`))
  if (!entry) return { level: 'error', code: 'LINK_DOMAIN_NOT_ALLOWED', reason: `域名不在官方来源白名单：${host}` }
  if (!entry.prefixes.some((p) => u.pathname === p || u.pathname.startsWith(p))) {
    return { level: 'warn', code: 'LINK_PATH_UNEXPECTED', reason: `${entry.label} 域名合法，但路径不在规范指定范围：${u.pathname}` }
  }
  if (u.protocol !== 'https:') return { level: 'warn', code: 'LINK_NOT_HTTPS', reason: '官方文档应使用 https' }
  if (u.pathname === '/' || u.pathname === '') return { level: 'warn', code: 'LINK_HOMEPAGE', reason: '应链接到具体页面而不是首页' }
  return { level: 'ok' }
}

function collectLinks() {
  const map = new Map() // url -> {url, owners:[{file,id}]}
  const add = (url, file, id) => {
    if (!isUrl(url)) return
    if (!map.has(url)) map.set(url, { url, owners: [] })
    map.get(url).owners.push({ file: path.basename(file), id })
  }
  for (const { file, item } of annotationItems) for (const d of item.docs || []) if (isObj(d) && d.url) add(d.url, file, item.id)
  for (const { file, item } of knowledgeItems) for (const s of item.sources || []) if (isObj(s) && s.url) add(s.url, file, item.id)
  return map
}

async function fetchStatus(url) {
  let lastErr = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; springboot-cheatsheet-verifier/1.0; fact-check)',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(opts.timeout),
      })
      const finalUrl = res.url
      try { res.body?.cancel() } catch {}
      return { status: res.status, finalUrl, ok: res.status >= 200 && res.status < 400 }
    } catch (e) {
      lastErr = e
      if (attempt === 0) await new Promise((r) => setTimeout(r, 800))
    }
  }
  return { status: 0, finalUrl: url, ok: false, error: String(lastErr?.message || lastErr) }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
      if (opts.verbose && (i + 1) % 10 === 0) process.stderr.write(`  …链接检查 ${i + 1}/${items.length}\n`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

async function runLinkChecks() {
  const map = collectLinks()
  const now = Date.now()
  const jobs = []
  for (const [url, meta] of map) {
    const cls = (() => { try { return classifyUrl(url) } catch { return { level: 'error', code: 'LINK_INVALID_URL', reason: 'URL 无法解析' } } })()
    if (cls.level === 'error' || cls.level === 'warn') {
      for (const o of meta.owners) addIssue(cls.level, cls.code, path.join(opts.dataDir, o.file), o.id, `${cls.reason}（${url}）`)
    }
    if (cls.level === 'error' || opts.skipLinks) {
      linkChecks.push({ url, status: null, ok: null, reason: cls.level === 'error' ? cls.reason : 'skip-links', owners: meta.owners.length })
      continue
    }
    const cached = linkCache[url]
    if (cached && !opts.refreshLinks && now - cached.checkedAt < CACHE_TTL) {
      // 缓存命中不在这里 push，统一由下面的 jobs 循环写入，避免同一条链接被记录两次
      jobs.push({ url, meta, result: { ...cached, checkedAt: cached.checkedAt }, cached: true })
      continue
    }
    jobs.push({ url, meta, result: null, cached: false })
  }

  const todo = jobs.filter((j) => !j.cached)
  const results = await mapLimit(todo, opts.concurrency, async (job) => {
    const r = await fetchStatus(job.url)
    return { job, r }
  })
  for (const { job, r } of results) {
    job.result = { status: r.status, ok: r.ok, finalUrl: r.finalUrl, checkedAt: Date.now(), error: r.error }
    if (r.status === 0) job.result.ok = null
  }
  for (const job of jobs) {
    const r = job.result
    if (!r) continue
    const status = r.status
    const ok = r.ok === true
    const entry = { url: job.url, status, ok, finalUrl: r.finalUrl, cached: !!job.cached, owners: job.meta.owners.length }
    linkChecks.push(entry)
    if (ok) continue
    if (status === 0) {
      for (const o of job.meta.owners) addIssue('warn', 'LINK_UNREACHABLE', path.join(opts.dataDir, o.file), o.id, `链接抓取失败（超时/DNS/TLS）：${job.url}${r.error ? ` — ${r.error}` : ''}`)
    } else if (status === 404 || status === 410) {
      for (const o of job.meta.owners) addIssue('error', 'LINK_BROKEN', path.join(opts.dataDir, o.file), o.id, `链接已失效 HTTP ${status}：${job.url}`)
    } else if (status >= 400) {
      for (const o of job.meta.owners) addIssue('warn', 'LINK_HTTP_ERROR', path.join(opts.dataDir, o.file), o.id, `链接返回 HTTP ${status}：${job.url}`)
    }
    // 重定向到首页/根路径
    try {
      if (r.finalUrl && r.finalUrl !== job.url) {
        const f = new URL(r.finalUrl)
        if (f.pathname === '/' || f.pathname === '') {
          for (const o of job.meta.owners) addIssue('warn', 'LINK_REDIRECT_HOME', path.join(opts.dataDir, o.file), o.id, `链接被重定向到首页（原链接可能已迁移）：${job.url} → ${r.finalUrl}`)
        }
      }
    } catch {}
  }

  // 无主的链接（还没被任何条目引用）不检查，保持缓存精简
  try {
    const keep = {}
    for (const [url, v] of Object.entries(linkCache)) keep[url] = v
    for (const lc of linkChecks) {
      if (lc.status !== null && lc.ok !== null) keep[lc.url] = { status: lc.status, ok: lc.ok, finalUrl: lc.finalUrl, checkedAt: Date.now() }
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(keep, null, 1))
  } catch (e) {
    info('LINK_CACHE_WRITE', null, null, `链接缓存写入失败（忽略）：${e.message}`)
  }
}

/* ------------------------------------------------------------------ */
/* 抽样计划（40%，每个文件/分类都覆盖）                                */
/* ------------------------------------------------------------------ */
function buildSample() {
  const groups = new Map() // file -> Map(category -> items[])
  for (const { fileBasename, item } of [...annotationItems, ...knowledgeItems]) {
    if (!groups.has(fileBasename)) groups.set(fileBasename, new Map())
    const catMap = groups.get(fileBasename)
    const cat = item.category || 'unknown'
    if (!catMap.has(cat)) catMap.set(cat, [])
    catMap.get(cat).push(item)
  }
  const sample = []
  for (const [file, catMap] of groups) {
    for (const [category, items] of catMap) {
      const sorted = [...items].sort((a, b) => fnv1a(String(a.id)) - fnv1a(String(b.id)))
      const take = Math.max(1, Math.ceil(items.length * opts.sampleRatio))
      for (const it of sorted.slice(0, take)) sample.push({ file, id: it.id, name: it.name || it.title, category })
    }
  }
  return sample
}
const sample = buildSample()

/* ------------------------------------------------------------------ */
/* 汇总与输出                                                          */
/* ------------------------------------------------------------------ */
const severityRank = { error: 0, warn: 1, info: 2 }
issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || String(a.file).localeCompare(String(b.file)) || String(a.id).localeCompare(String(b.id)))

const counts = {
  error: issues.filter((i) => i.severity === 'error').length,
  warn: issues.filter((i) => i.severity === 'warn').length,
  info: issues.filter((i) => i.severity === 'info').length,
}
const byCode = {}
for (const i of issues) byCode[i.code] = (byCode[i.code] || 0) + 1

const report = {
  schemaVersion: '1.0',
  tool: 'tools/audit.mjs',
  generatedAt: new Date().toISOString(),
  options: {
    dataDir: path.relative(ROOT, opts.dataDir) || '.',
    skipLinks: opts.skipLinks,
    sampleRatio: opts.sampleRatio,
    linkTimeoutMs: opts.timeout,
    concurrency: opts.concurrency,
  },
  index: {
    file: path.relative(ROOT, INDEX_FILE),
    annotations: index.size,
    simpleNames: indexBySimple.size,
  },
  coverage: {
    files: dataFiles.map((d) => ({ file: d.name, kind: d.kind, generatedBy: d.data?.generatedBy ?? null, items: Array.isArray(d.data?.items) ? d.data.items.length : 0 })),
    annotationItems: annotationItems.length,
    knowledgeItems: knowledgeItems.length,
    categories: [...new Set([...annotationItems, ...knowledgeItems].map((x) => x.item?.category).filter(Boolean))].sort(),
    filesWithErrors: [...new Set(issues.filter((i) => i.severity === 'error' && i.file).map((i) => i.file))],
  },
  summary: {
    errors: counts.error,
    warnings: counts.warn,
    infos: counts.info,
    verdict: counts.error > 0 ? 'needs-fix' : counts.warn > 0 ? 'review-warnings' : 'pass',
    byCode,
    linkChecks: {
      total: linkChecks.length,
      ok: linkChecks.filter((l) => l.ok === true).length,
      failed: linkChecks.filter((l) => l.ok === false).length,
      skipped: linkChecks.filter((l) => l.ok === null).length,
    },
    perFile: Object.fromEntries([...fileStats.entries()].sort()),
  },
  issues,
  linkChecks,
  sample: {
    ratio: opts.sampleRatio,
    total: annotationItems.length + knowledgeItems.length,
    sampled: sample.length,
    list: sample,
  },
  manualFocus: {
    highRisk: highRiskItems,
    deprecationClaims,
  },
}

fs.mkdirSync(path.dirname(opts.out), { recursive: true })
fs.writeFileSync(opts.out, JSON.stringify(report, null, 2))

if (opts.md) {
  const lines = []
  lines.push('# 自动审计摘要', '')
  lines.push(`- 生成时间：${report.generatedAt}`)
  lines.push(`- 数据目录：\`${report.options.dataDir}\`，注解 ${annotationItems.length} 条，知识文章 ${knowledgeItems.length} 篇`)
  lines.push(`- 结论：**${report.summary.verdict}**（错误 ${counts.error} / 存疑 ${counts.warn} / 建议 ${counts.info}）`)
  lines.push(`- 链接检查：${report.summary.linkChecks.total} 个，OK ${report.summary.linkChecks.ok}，失败 ${report.summary.linkChecks.failed}，跳过 ${report.summary.linkChecks.skipped}`, '')
  lines.push('## 各文件统计', '', '| 文件 | 条目 | 错误 | 存疑 | 建议 |', '|---|---|---|---|---|')
  for (const f of report.coverage.files) {
    const st = report.summary.perFile[f.file] || { errors: 0, warnings: 0, infos: 0 }
    lines.push(`| ${f.file} | ${f.items} | ${st.errors} | ${st.warnings} | ${st.infos} |`)
  }
  lines.push('', '## 问题代码分布', '', '| code | 数量 |', '|---|---|')
  for (const [code, n] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) lines.push(`| ${code} | ${n} |`)
  lines.push('', '## 错误清单（error）', '')
  for (const i of issues.filter((x) => x.severity === 'error')) lines.push(`- \`${i.file ?? '-'}\` **${i.id ?? '-'}** [${i.code}] ${i.message}`)
  lines.push('', '## 存疑清单（warn）', '')
  for (const i of issues.filter((x) => x.severity === 'warn')) lines.push(`- \`${i.file ?? '-'}\` **${i.id ?? '-'}** [${i.code}] ${i.message}`)
  fs.writeFileSync(opts.md, lines.join('\n') + '\n')
  console.log(`已写入 ${path.relative(ROOT, opts.md)}`)
}

console.log('')
console.log(`注解索引：${index.size} 个注解（${indexBySimple.size} 个简单名）`)
console.log(`扫描文件：${dataFiles.length} 个；注解 ${annotationItems.length} 条，知识文章 ${knowledgeItems.length} 篇`)
console.log(`问题：${counts.error} 错误 / ${counts.warn} 存疑 / ${counts.info} 建议`)
if (!opts.skipLinks) console.log(`链接：${report.summary.linkChecks.total} 个，OK ${report.summary.linkChecks.ok}，失败 ${report.summary.linkChecks.failed}，跳过 ${report.summary.linkChecks.skipped}`)
console.log(`抽样计划：${sample.length}/${sample.length ? report.sample.total : 0} 条（比例 ${opts.sampleRatio}）`)
console.log(`报告：${path.relative(ROOT, opts.out)}`)
if (opts.verbose) {
  for (const i of issues.filter((x) => x.severity !== 'info')) console.log(`  [${i.severity}] ${i.file} ${i.id} ${i.code}: ${i.message}`)
}
process.exit(counts.error > 0 ? 1 : 0)