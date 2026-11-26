#!/usr/bin/env node
/**
 * 命令速查（Linux / Git）独立事实审计
 * 与 scripts/validate-commands.mjs 互补：
 *  - 结构/字段/长度按 docs/COMMAND-SPEC.md 再校验一遍（独立实现）
 *  - 官方文档链接：域名白名单 + HTTP 200（可缓存），并把页面正文落盘作人工证据
 *  - options[].flag 真实性：在对应官方文档正文里必须能找到该 flag（自动事实核查）
 *  - 跨模块隔离：Linux 条目不得出现 git 概念；Git 条目不得出现 Linux 命令调用
 *  - 破坏性操作 pitfalls 覆盖、重复/近重复、40% 人工抽查清单
 *
 * 用法：
 *   node tools/commands-audit/audit.mjs
 *   node tools/commands-audit/audit.mjs --skip-links      # 只做离线检查
 *   node tools/commands-audit/audit.mjs --refresh-links   # 忽略缓存重新抓
 *   node tools/commands-audit/audit.mjs --json <path> --md <path> --verbose
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import http from 'node:http'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const dataDir = resolve(root, 'src/data')
const outDir = resolve(root, 'tools/commands-audit')
const cacheDir = resolve(outDir, '.cache')
const pagesDir = resolve(cacheDir, 'pages')

const argv = process.argv.slice(2)
const opt = (name, def) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def
}
const has = name => argv.includes(name)

const options = {
  skipLinks: has('--skip-links'),
  refreshLinks: has('--refresh-links'),
  verbose: has('--verbose'),
  json: opt('--json', resolve(outDir, 'report.json')),
  md: opt('--md', resolve(outDir, 'report.md')),
  timeout: Number(opt('--timeout', '20000')),
  concurrency: Number(opt('--concurrency', '6')),
  sampleRatio: Number(opt('--sample-ratio', '0.42')),
  cacheTtlMs: 7 * 24 * 3600 * 1000
}

/* ---------------------------------------------------------------- 规范数据 */
const FILES = {
  'commands-linux-a.json': {
    tool: 'linux',
    generatedBy: 'content-linux-a',
    modules: [
      ['linux-file', '文件与目录', ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'find', 'ln']],
      ['linux-text', '查看与文本处理', ['cat', 'less', 'head', 'tail', 'grep', 'wc', 'sort', 'cut', 'sed', 'awk']],
      ['linux-perm', '权限与用户', ['chmod', 'chown', 'umask', 'sudo', 'su', 'useradd']]
    ]
  },
  'commands-linux-b.json': {
    tool: 'linux',
    generatedBy: 'content-linux-b',
    modules: [
      ['linux-process', '进程与系统', ['ps', 'top', 'kill', 'pkill', 'jobs', 'nohup', 'systemctl', 'free', 'uptime']],
      ['linux-network', '网络与远程', ['ip', 'ping', 'curl', 'wget', 'ss', 'ssh', 'scp', 'rsync']],
      ['linux-disk', '磁盘与压缩', ['df', 'du', 'tar', 'gzip', 'zip', 'unzip']]
    ]
  },
  'commands-git.json': {
    tool: 'git',
    generatedBy: 'content-git',
    modules: [
      ['git-setup', '配置与仓库', ['git config', 'git init', 'git clone', 'git help']],
      ['git-basic', '提交与查看', ['git status', 'git add', 'git commit', 'git diff', 'git log', 'git show']],
      ['git-branch', '分支与合并', ['git branch', 'git switch', 'git merge', 'git rebase', 'git cherry-pick']],
      ['git-remote', '远程协作', ['git remote', 'git fetch', 'git pull', 'git push']],
      ['git-undo', '撤销与回退', ['git restore', 'git reset', 'git revert', 'git stash', 'git clean', 'git rm']],
      ['git-history', '历史与排查', ['git blame', 'git bisect', 'git reflog', 'git tag', 'git worktree']]
    ]
  }
}

const LINUX_ONLY_MIN_OPTIONS = new Map([['linux-nohup', 2], ['linux-umask', 2]])

const DOC_RULES = {
  linux: {
    hosts: ['man7.org', 'www.gnu.org', 'gnu.org', 'man.openbsd.org', 'curl.se', 'rsync.samba.org', 'www.freedesktop.org', 'freedesktop.org', 'www.kernel.org', 'kernel.org', 'infozip.sourceforge.net'],
    firstHosts: []
  },
  git: {
    hosts: ['git-scm.com'],
    firstHosts: ['git-scm.com']
  }
}

// 破坏性/高风险命令：pitfalls 必须写清后果
const DESTRUCTIVE = new Set(['linux-rm', 'linux-chmod', 'linux-chown', 'linux-sudo', 'linux-kill', 'linux-pkill',
  'git-reset', 'git-clean', 'git-push', 'git-rebase', 'git-rm', 'git-stash', 'git-restore', 'git-revert'])
const DESTRUCTIVE_HINTS = ['不', '丢', '覆盖', '删', '不可', '强制', '历史', '无法', '谨慎', '风险', '破坏', '清空', '改写', '丢失', '危险', '消失', '恢复', '清理', '锁', '残留', '等于', '可能', '导致', '误', '泄露', '暴露', '永久', '后门', '安全', '只删']

// Git 条目中禁止出现的 Linux 命令调用（按词边界，允许出现在 "git xxx" 之后）
const LINUX_CMD_WORDS = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'find', 'ln', 'cat', 'less',
  'head', 'tail', 'grep', 'wc', 'sort', 'cut', 'sed', 'awk', 'chmod', 'chown', 'umask', 'sudo', 'su', 'useradd',
  'ps', 'top', 'kill', 'pkill', 'jobs', 'nohup', 'systemctl', 'free', 'uptime', 'ip', 'ping', 'curl', 'wget',
  'ss', 'ssh', 'scp', 'rsync', 'df', 'du', 'tar', 'gzip', 'zip', 'unzip']

const BANNED_PHRASES = ['非常简单', '一文学会', '必学', '神器', '秒懂', '保姆级', '最强', '全网最']

/* ------------------------------------------------------------------ utils */
const issues = []
const add = (severity, code, file, id, message, extra = {}) => issues.push({ severity, code, file, id, message, ...extra })
const isStr = v => typeof v === 'string'
const visibleLen = s => String(s ?? '').replace(/\s/g, '').length
const cjkLen = s => (String(s ?? '').match(/[\u4e00-\u9fff]/g) || []).length
const strList = v => Array.isArray(v) ? v.filter(isStr) : []

function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}
function ngrams(text, n = 3) {
  const s = String(text || '').replace(/\s+/g, '')
  const set = new Set()
  for (let i = 0; i + n <= s.length; i++) set.add(s.slice(i, i + n))
  return set
}
function jaccard(a, b) {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter || 1)
}

/* -------------------------------------------------------------- link utils */
const linkChecks = []
let linkCache = {}
if (!options.skipLinks && existsSync(join(cacheDir, 'links.json'))) {
  try { linkCache = JSON.parse(readFileSync(join(cacheDir, 'links.json'), 'utf8')) } catch { linkCache = {} }
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

function requestUrl(url, redirects = 0) {
  return new Promise((resolveP) => {
    let parsed
    try { parsed = new URL(url) } catch { resolveP({ status: 0, error: 'invalid url' }); return }
    const mod = parsed.protocol === 'http:' ? http : https
    const req = mod.get(parsed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (command-audit/1.0; independent QA)',
        Accept: 'text/html,text/plain,*/*',
        'Accept-Encoding': 'identity'
      }
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
        const next = new URL(res.headers.location, url).href
        res.resume()
        resolveP(requestUrl(next, redirects + 1))
        return
      }
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c => { data += c })
      res.on('end', () => resolveP({ status: res.statusCode, body: data }))
    })
    req.setTimeout(options.timeout, () => { req.destroy(); resolveP({ status: 0, error: 'timeout' }) })
    req.on('error', e => resolveP({ status: 0, error: e.message }))
  })
}

function stripHtml(html) {
  let t = String(html || '')
  t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  t = t.replace(/<br\s*\/?>/gi, '\n')
  t = t.replace(/<\/(p|div|li|dt|dd|h\d|pre|tr)>/gi, '\n')
  t = t.replace(/<[^>]+>/g, ' ')
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  t = t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
  t = t.replace(/&#8217;/g, "'").replace(/&#8211;/g, '-').replace(/&#8212;/g, '--').replace(/&#160;/g, ' ')
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  return t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
}

function pageTextPath(url) {
  return join(pagesDir, fnv1a(url).toString(16) + '.txt')
}

function loadCachedPage(url) {
  const entry = linkCache[url]
  if (!entry) return null
  if (options.refreshLinks) return null
  if (Date.now() - (entry.fetchedAt || 0) > options.cacheTtlMs) return null
  const p = pageTextPath(url)
  if (!existsSync(p)) return null
  return { status: entry.status, text: readFileSync(p, 'utf8'), fetchedAt: entry.fetchedAt }
}

async function fetchPage(url) {
  const cached = loadCachedPage(url)
  if (cached) { linkChecks.push({ url, status: cached.status, cached: true }); return cached }
  const r = await requestUrl(url)
  const text = stripHtml(r.body || '')
  if (!options.skipLinks) {
    mkdirSync(pagesDir, { recursive: true })
    writeFileSync(pageTextPath(url), `SOURCE: ${url}\nSTATUS: ${r.status}${r.error ? '\nERROR: ' + r.error : ''}\n\n` + text)
    linkCache[url] = { status: r.status, fetchedAt: Date.now(), error: r.error || null }
    writeFileSync(join(cacheDir, 'links.json'), JSON.stringify(linkCache, null, 1))
  }
  linkChecks.push({ url, status: r.status, cached: false, error: r.error || null })
  return { status: r.status, text, error: r.error }
}

/* ------------------------------------------------------- flag 真实性检查 */
function flagTokens(text) {
  const set = new Set()
  const re = /(^|[\s,;:([{|])(-{1,2}[A-Za-z][A-Za-z0-9-]*)/g
  let m
  while ((m = re.exec(text))) set.add(m[2])
  return set
}
function flagBase(flag) {
  const m = String(flag || '').trim().match(/^(-{1,2}[A-Za-z][A-Za-z0-9-]*)/)
  return m ? m[1] : null
}

/* ---------------------------------------------------------------- 主流程 */
const docsToFetch = new Set()
const parsedFiles = {}
const expectedRef = new Map() // id -> {tool, file, module, name, order}

for (const [file, spec] of Object.entries(FILES)) {
  const path = resolve(dataDir, file)
  if (!existsSync(path)) {
    add('info', 'FILE_NOT_READY', file, '', '数据文件尚未落盘（等待作者）')
    continue
  }
  let json
  try { json = JSON.parse(readFileSync(path, 'utf8')) } catch (e) {
    add('error', 'JSON_PARSE', file, '', `JSON 解析失败：${e.message}`)
    continue
  }
  parsedFiles[file] = json
  const specModules = spec.modules.map(([id, label, cmds]) => ({ id, label, cmds }))
  const expected = specModules.flatMap(m => m.cmds.map((name, i) => ({ name, id: `${spec.tool}-${name.split(' ').pop()}`, module: m.id })))
  expected.forEach((e, i) => expectedRef.set(e.id, { tool: spec.tool, file, module: e.module, name: e.name, order: i }))

  if (json.tool !== spec.tool) add('error', 'FILE_TOOL', file, '', `文件 tool 应为 ${spec.tool}，实际 ${json.tool}`)
  if (json.generatedBy !== spec.generatedBy) add('error', 'GENERATED_BY', file, '', `generatedBy 应为 ${spec.generatedBy}，实际 ${json.generatedBy}`)
  if (!Array.isArray(json.modules)) add('error', 'MODULES_MISSING', file, '', 'modules 不是数组')
  if (!Array.isArray(json.items)) { add('error', 'ITEMS_MISSING', file, '', 'items 不是数组'); continue }

  // modules
  const modIds = new Set((json.modules || []).map(m => m && m.id))
  if (Array.isArray(json.modules)) {
    if (json.modules.length !== specModules.length) add('error', 'MODULE_COUNT', file, '', `模块数应为 ${specModules.length}，实际 ${json.modules.length}`)
    json.modules.forEach((m, i) => {
      const sm = specModules[i]
      if (!sm) return
      if (m.id !== sm.id) add('error', 'MODULE_ID', file, m.id, `第 ${i + 1} 个模块 id 应为 ${sm.id}，实际 ${m.id}`)
      if (m.label !== sm.label) add('error', 'MODULE_LABEL', file, m.id, `模块 ${sm.id} label 应为「${sm.label}」，实际「${m.label}」`)
      if (!isStr(m.desc) || cjkLen(m.desc) < 8 || cjkLen(m.desc) > 40) add('error', 'MODULE_DESC', file, m.id, 'module.desc 需 8–40 个汉字')
    })
  }

  // items 基础
  const seenInFile = new Set()
  json.items.forEach((it, idx) => {
    if (!it || typeof it !== 'object') { add('error', 'ITEM_NOT_OBJECT', file, `items[${idx}]`, '条目不是对象'); return }
    const id = it.id || `items[${idx}]`
    const ref = expectedRef.get(it.id)
    if (!isStr(it.id)) add('error', 'ID_MISSING', file, id, 'id 缺失')
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(it.id)) add('error', 'ID_FORMAT', file, id, 'id 必须是 kebab-case')
    else if (!it.id.startsWith(spec.tool + '-')) add('error', 'ID_PREFIX', file, id, `id 必须以 ${spec.tool}- 开头`)
    if (seenInFile.has(it.id)) add('error', 'DUPLICATE_ID_FILE', file, id, '文件内 id 重复')
    seenInFile.add(it.id)
    if (!ref) add('error', 'ID_NOT_IN_SPEC', file, id, 'id 不在规范 §2 命令清单里')
    if (it.tool !== spec.tool) add('error', 'ITEM_TOOL', file, id, `条目 tool 应为 ${spec.tool}，实际 ${it.tool}`)
    if (!modIds.has(it.module)) add('error', 'ITEM_MODULE', file, id, `module ${it.module} 不是本文件声明的模块`)
    if (ref && it.name !== ref.name) add('error', 'ITEM_NAME', file, id, `name 应为「${ref.name}」，实际「${it.name}」`)
    if (it.level !== '入门' && it.level !== '进阶') add('error', 'LEVEL', file, id, 'level 必须是 入门 或 进阶')

    // 文案长度
    if (!isStr(it.tagline) || !it.tagline.trim()) add('error', 'TAGLINE_MISSING', file, id, 'tagline 缺失')
    else if (cjkLen(it.tagline) > 22) add('error', 'TAGLINE_LONG', file, id, `tagline ${cjkLen(it.tagline)} 个汉字，需 ≤22`)
    if (/(最强|最佳|最好|超级|神器|必学|秒懂|保姆级|一文学会|非常简单|全网最|无敌|终极)/.test(it.tagline || '')) add('warn', 'TAGLINE_HYPE', file, id, 'tagline 疑似营销/夸大用语')
    const pl = visibleLen(it.plain)
    if (!isStr(it.plain) || pl < 60 || pl > 180) add('error', 'PLAIN_LENGTH', file, id, `plain 可见字符 ${pl}，需 60–180`)
    for (const p of BANNED_PHRASES) if (String(it.plain || '').includes(p)) add('warn', 'BANNED_PHRASE', file, id, `出现营销话术「${p}」`)

    // syntax
    if (!isStr(it.syntax)) add('error', 'SYNTAX_MISSING', file, id, 'syntax 缺失')
    else {
      if (it.syntax.length < 5 || it.syntax.length > 80) add('error', 'SYNTAX_LENGTH', file, id, `syntax 长度 ${it.syntax.length}，需 5–80`)
      if (it.syntax !== it.name && !it.syntax.startsWith(it.name + ' ')) add('error', 'SYNTAX_NAME', file, id, `syntax 必须以 name「${it.name}」开头`)
    }

    // keyPoints
    const kp = strList(it.keyPoints)
    if (kp.length < 3 || kp.length > 5) add('error', 'KEYPOINTS_COUNT', file, id, `keyPoints 需 3–5 条，实际 ${kp.length}`)
    kp.forEach((s, i) => { if (s.length < 8 || s.length > 80) add('error', 'KEYPOINT_LENGTH', file, id, `keyPoints[${i}] 长度 ${s.length}，需 8–80`) })

    // options + flag 真实性
    const ops = Array.isArray(it.options) ? it.options : []
    const minOpt = LINUX_ONLY_MIN_OPTIONS.get(it.id) ?? 3
    if (ops.length < minOpt || ops.length > 8) add('error', 'OPTIONS_COUNT', file, id, `options 需 ${minOpt}–8 条，实际 ${ops.length}`)
    ops.forEach((o, i) => {
      if (!o || !isStr(o.flag) || !/^(?:-{2}[A-Za-z][A-Za-z0-9-]*|-[A-Za-z0-9][A-Za-z0-9-]*)(?:\s+\S+)?$/.test(o.flag.trim())) add('error', 'FLAG_FORMAT', file, id, `options[${i}].flag 形态非法：「${o && o.flag}」（需 -x / --long / -n 10 / -9）`)
      if (!isStr(o.desc) || o.desc.length < 6 || o.desc.length > 60) add('warn', 'OPTION_DESC_LENGTH', file, id, `options[${i}]「${o && o.flag}」desc 需 6–60 字`)
    })
    const flagBaseNames = ops.map(o => flagBase(o && o.flag)).filter(Boolean)
    const dupeFlags = flagBaseNames.filter((f, i) => flagBaseNames.indexOf(f) !== i)
    if (dupeFlags.length) add('warn', 'DUPLICATE_FLAG', file, id, `options 内重复 flag：${[...new Set(dupeFlags)].join(', ')}`)

    // examples
    const ex = Array.isArray(it.examples) ? it.examples : []
    if (ex.length < 2 || ex.length > 4) add('error', 'EXAMPLES_COUNT', file, id, `examples 需 2–4 条，实际 ${ex.length}`)
    ex.forEach((e, i) => {
      if (!isStr(e.code) || !e.code.trim()) { add('error', 'EXAMPLE_EMPTY', file, id, `examples[${i}].code 为空`); return }
      if (/\$\s*$/.test(e.desc || '')) add('warn', 'EXAMPLE_DESC_DOLLAR', file, id, `examples[${i}].desc 带 $`)
      if (/^\s*\$\s/m.test(e.code)) add('error', 'EXAMPLE_PROMPT', file, id, `examples[${i}].code 不要带 $ 提示符`)
      if (e.code.length > 160) add('warn', 'EXAMPLE_LONG', file, id, `examples[${i}].code 过长（${e.code.length}）`)
      if (!isStr(e.desc) || e.desc.length < 3 || e.desc.length > 40) add('error', 'EXAMPLE_DESC', file, id, `examples[${i}].desc 需 3–40 字`)
      // 示例是否演示命令本身（允许管道/组合中出现，如 grep ... | wc -l）
      const nameFirst = it.name.split(' ')[0]
      const codeTrim = e.code.trim()
      const escaped = nameFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const demoName = new RegExp('(^|[\\s|;&()\'"])' + escaped + '([\\s|;&()\'"]|$)', 'i')
      if (!demoName.test(codeTrim)) {
        add('info', 'EXAMPLE_NOT_DEMONSTRATING_NAME', file, id, `examples[${i}].code 未直接演示「${nameFirst}」本身：「${codeTrim.slice(0, 40)}」`)
      }
    })

    // pitfalls（+ 破坏性操作后果）
    const pf = strList(it.pitfalls)
    if (pf.length < 1 || pf.length > 3) add('error', 'PITFALLS_COUNT', file, id, `pitfalls 需 1–3 条，实际 ${pf.length}`)
    pf.forEach((s, i) => { if (s.length < 10 || s.length > 90) add('error', 'PITFALL_LENGTH', file, id, `pitfalls[${i}] 长度 ${s.length}，需 10–90`) })
    if (DESTRUCTIVE.has(it.id)) {
      const hasHint = pf.some(p => DESTRUCTIVE_HINTS.some(h => p.includes(h)))
      if (!hasHint) add('warn', 'DESTRUCTIVE_WARNING_MISSING', file, id, '破坏性/高风险命令的 pitfalls 未写清后果（不可恢复/丢失/覆盖/改写历史）')
    }

    // related
    const rel = strList(it.related)
    if (rel.length < 2 || rel.length > 4) add('error', 'RELATED_COUNT', file, id, `related 需 2–4 条，实际 ${rel.length}`)
    rel.forEach(r => {
      if (!r.startsWith(spec.tool + '-')) add('error', 'RELATED_CROSS_TOOL', file, id, `related「${r}」必须同 tool 前缀 ${spec.tool}-`)
      if (r === it.id) add('error', 'RELATED_SELF', file, id, 'related 不能引用自己')
      if (!expectedRef.has(r)) add('error', 'RELATED_UNKNOWN', file, id, `related「${r}」不在本 tool 命令清单里`)
    })

    // docs
    const docs = Array.isArray(it.docs) ? it.docs : []
    const rule = DOC_RULES[spec.tool]
    if (docs.length < 1 || docs.length > 2) add('error', 'DOCS_COUNT', file, id, `docs 需 1–2 条，实际 ${docs.length}`)
    docs.forEach((d, i) => {
      if (!d || !isStr(d.label) || !d.label.trim()) add('error', 'DOC_LABEL', file, id, `docs[${i}].label 为空`)
      let u
      try { u = new URL(d.url) } catch { add('error', 'DOC_URL', file, id, `docs[${i}].url 非法：${d.url}`); return }
      if (u.protocol !== 'https:') add('error', 'DOC_HTTPS', file, id, `docs[${i}] 必须 https`)
      if (!rule.hosts.includes(u.hostname)) add('error', 'DOC_DOMAIN', file, id, `docs[${i}] 域名 ${u.hostname} 不在白名单`)
      if (u.pathname === '/' || u.pathname === '') add('error', 'DOC_HOMEPAGE', file, id, `docs[${i}] 不能只给首页`)
      if (rule.firstHosts.length && i === 0 && !rule.firstHosts.includes(u.hostname)) add('error', 'DOC_FIRST_HOST', file, id, `docs 第一条必须来自 ${rule.firstHosts.join('/')}`)
      if (spec.tool === 'git' && !/^https:\/\/git-scm\.com\/(docs(\/|$)|book\/zh\/v2)/.test(d.url)) add('warn', 'DOC_GIT_PATH', file, id, `Git 来源建议 git-scm.com/docs/... 或 /book/zh/v2（当前 ${d.url}）`)
      docsToFetch.add(d.url)
    })

    // tags
    const tags = strList(it.tags)
    if (tags.length < 2 || tags.length > 5) add('error', 'TAGS_COUNT', file, id, `tags 需 2–5 个，实际 ${tags.length}`)
    tags.forEach((t, i) => { if (t.length > 8) add('error', 'TAG_LENGTH', file, id, `tags[${i}]「${t}」超过 8 字`) })

    // 跨模块隔离（正文扫描）
    const scanText = [it.name, it.plain, it.syntax, ...kp, ...ops.flatMap(o => [o && o.flag, o && o.desc]),
      ...ex.flatMap(e => [e.desc, e.code]), ...pf, ...tags].filter(isStr).join('\n')
    if (spec.tool === 'linux') {
      if (/\bgit\b/i.test(scanText)) add('error', 'CROSS_MODULE_GIT_IN_LINUX', file, id, 'Linux 条目出现 Git 概念（禁止跨模块混写）')
    } else {
      const stripped = scanText.replace(/\bgit\s+[a-z-]+/gi, ' ')
      const GIT_SUBCOMMANDS = new Set(['rm', 'restore', 'reset', 'revert', 'stash', 'clean', 'branch', 'remote', 'tag', 'worktree', 'blame', 'bisect', 'reflog'])
      for (const w of LINUX_CMD_WORDS) {
        if (GIT_SUBCOMMANDS.has(w)) continue
        const re = new RegExp(`(^|[\\s;|&()"'])${w}(?=\\s|$)`)
        if (re.test(stripped)) {
          const m = stripped.match(new RegExp(`.{0,25}${w}.{0,25}`, 'i'))
          add('warn', 'CROSS_MODULE_LINUX_IN_GIT', file, id, `Git 条目疑似出现 Linux 命令「${w}」：…${(m && m[0]) || ''}…`)
          break
        }
      }
    }
  })
}

// 跨文件唯一性 / 重复检测
if (!options.skipLinks || true) {
  const allItems = []
  for (const [file, json] of Object.entries(parsedFiles)) allItems.push(...json.items.map(it => ({ file, it })))
  const seenId = new Map()
  const seenName = new Map()
  const plMap = new Map()
  for (const { file, it } of allItems) {
    if (seenId.has(it.id)) add('error', 'DUPLICATE_ID', file, it.id, `id 与 ${seenId.get(it.id)} 重复`)
    else seenId.set(it.id, file)
    const key = `${it.tool}|${it.name}`
    if (seenName.has(key)) add('error', 'DUPLICATE_NAME', file, it.id, `同 tool 内 name「${it.name}」重复（与 ${seenName.get(key)}）`)
    else seenName.set(key, it.id)
    const pl = String(it.plain || '').replace(/\s+/g, '')
    if (plMap.has(pl)) add('error', 'DUPLICATE_PLAIN', file, it.id, `plain 与 ${plMap.get(pl)} 完全相同`)
    else plMap.set(pl, it.id)
  }
  // 近重复（同名 tool 内）
  const grams = allItems.map(({ file, it }) => ({ file, id: it.id, tool: it.tool, set: ngrams(it.plain) }))
  for (let i = 0; i < grams.length; i++) {
    for (let j = i + 1; j < grams.length; j++) {
      if (grams[i].tool !== grams[j].tool) continue
      const sim = jaccard(grams[i].set, grams[j].set)
      if (sim >= 0.85) add('info', 'NEAR_DUPLICATE_PLAIN', grams[j].file, grams[j].id, `plain 与 ${grams[i].id} 高度相似（${(sim * 100).toFixed(0)}%）`)
    }
  }
  // 模块内进阶数量
  for (const [file, spec] of Object.entries(FILES)) {
    const json = parsedFiles[file]
    if (!json) continue
    for (const [mid] of spec.modules) {
      const items = json.items.filter(it => it.module === mid)
      const adv = items.filter(it => it.level === '进阶').length
      if (items.length && adv < 2) add('warn', 'MODULE_ADVANCED_MIN', file, mid, `模块 ${mid} 进阶条目仅 ${adv} 条（规范要求每模块 ≥2）`)
    }
  }
}

/* ------------------------------------------------------ 链接 + flag 真实性 */
function extractPageFlags(text) {
  const set = new Set()
  // man7 的 top(1) 等页面把短选项渲染成 " - b , --batch"（连字符与字母间有空格），先归一化
  const compact = String(text).replace(/(^|[\s,(|])(-)\s+([A-Za-z0-9])(?=[\s,;:)\]|])/g, '$1$2$3')
  // 选项通常写作 "-a, --all" 或 "-a --all"
  const re = /(^|[\s,;:([{|])(-{1,2}[A-Za-z][A-Za-z0-9-]*)/g
  let m
  while ((m = re.exec(compact))) set.add(m[2])
  return set
}

async function runLinks() {
  if (options.skipLinks) {
    add('info', 'LINKS_SKIPPED', '', '', '已按 --skip-links 跳过链接与 flag 真实性检查')
    return
  }
  const urls = [...docsToFetch]
  const queue = urls.slice()
  const pages = new Map()
  async function worker() {
    while (queue.length) {
      const url = queue.shift()
      const r = await fetchPage(url)
      pages.set(url, r)
      if (r.status === 0) add('warn', 'LINK_UNVERIFIABLE', '', '', `官方链接本环境不可达（${r.error || '网络错误'}），无法自动验证：${url}`)
      else if (r.status !== 200) add('error', 'LINK_BROKEN', '', '', `官方链接 HTTP ${r.status}：${url}`)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency) }, worker))
  // flag 真实性：把每个条目的 docs 页面合并后检查 options
  for (const [file, json] of Object.entries(parsedFiles)) {
    for (const it of json.items) {
      const docUrls = (it.docs || []).map(d => d.url)
      // 规范允许 git help 指向 git-scm.com/docs 索引页；索引页不含选项表，跳过自动核查
      if (docUrls.some(u => /^https:\/\/git-scm\.com\/docs\/?$/.test(u))) continue
      const pageList = docUrls.map(u => pages.get(u) || { status: 0, text: '' })
      const unreachable = pageList.filter(p => p.status === 0)
      const texts = pageList.map(p => p.text || '').join('\n')
      if (unreachable.length) {
        add('info', 'FLAG_SKIP_PAGE_UNREACHABLE', file, it.id, `官方页面本环境不可达，跳过 flag 自动核查（${unreachable.length} 页）`)
        continue
      }
      if (!texts.trim()) continue
      if (docUrls.some(u => /infozip\.sourceforge\.net/.test(u))) {
        add('info', 'FLAG_DOC_NO_OPTIONS', file, it.id, '所选官方来源为介绍页、不含完整选项表；options 真实性需按 zip(1)/unzip(1) man page 人工核对')
        continue
      }
      const tokens = extractPageFlags(texts)
      for (const o of it.options || []) {
        const base = flagBase(o && o.flag)
        if (!base) continue
        if (!tokens.has(base)) add('warn', 'FLAG_NOT_IN_DOCS', file, it.id, `options「${o.flag}」在官方文档页面未找到（可能未文档化/写法不同，需人工确认）`)
      }
    }
  }
}

/* --------------------------------------------------------------- 抽样清单 */
function buildSample() {
  const list = []
  for (const [file, json] of Object.entries(parsedFiles)) {
    const tool = json.tool
    const items = [...json.items].sort((a, b) => fnv1a(file + '|' + a.id) - fnv1a(file + '|' + b.id))
    const n = Math.max(2, Math.round(json.items.length * options.sampleRatio))
    for (const it of items.slice(0, n)) list.push({ file, id: it.id, name: it.name, module: it.module, tool })
  }
  return list
}

/* ------------------------------------------------------------------ 主入口 */
await runLinks()

const sample = buildSample()
const report = {
  schemaVersion: 1,
  tool: 'commands-audit',
  generatedAt: new Date().toISOString(),
  options: { skipLinks: options.skipLinks, sampleRatio: options.sampleRatio, concurrency: options.concurrency },
  summary: {},
  files: Object.keys(FILES),
  perFile: {},
  byCode: {},
  linkChecks: linkChecks.filter(l => !l.cached),
  cachedLinks: linkChecks.filter(l => l.cached).length,
  manualFocus: {
    destructive: issues.filter(i => ['DESTRUCTIVE_WARNING_MISSING', 'CROSS_MODULE_GIT_IN_LINUX', 'CROSS_MODULE_LINUX_IN_GIT'].includes(i.code)),
  },
  sample,
  issues
}

const byCode = {}
const perFile = {}
for (const f of Object.keys(FILES)) perFile[f] = { errors: 0, warnings: 0, infos: 0 }
for (const it of issues) {
  byCode[it.code] = (byCode[it.code] || 0) + 1
  const file = it.file || 'general'
  perFile[file] = perFile[file] || { errors: 0, warnings: 0, infos: 0 }
  perFile[file][it.severity === 'error' ? 'errors' : it.severity === 'warn' ? 'warnings' : 'infos']++
}
const errors = issues.filter(i => i.severity === 'error').length
const warnings = issues.filter(i => i.severity === 'warn').length
const infos = issues.filter(i => i.severity === 'info').length
const linkFailed = linkChecks.filter(l => !l.cached && l.status !== 200).length
const totalItems = Object.values(parsedFiles).reduce((n, j) => n + (j.items ? j.items.length : 0), 0)
report.summary = {
  files: Object.keys(parsedFiles).length,
  items: totalItems,
  errors, warnings, infos,
  verdict: errors ? 'needs-fix' : warnings ? 'review-warnings' : 'pass',
  byCode, linkFailed,
  linkTotal: docsToFetch.size,
  sample: `${sample.length}/${totalItems}`
}
report.perFile = perFile
report.byCode = byCode

mkdirSync(outDir, { recursive: true })
writeFileSync(options.json, JSON.stringify(report, null, 2))

const sev = { error: '错误', warn: '存疑', info: '建议' }
const lines = []
lines.push(`# 命令速查审计报告（自动生成 ${report.generatedAt}）`)
lines.push('')
lines.push(`数据文件：${report.summary.files} 个；命令条目：${report.summary.items} 条；结论：**${report.summary.verdict}**`)
lines.push('')
lines.push(`错误 ${errors} / 存疑 ${warnings} / 建议 ${infos}；链接 ${docsToFetch.size} 个，失败 ${linkFailed}`)
lines.push('')
if (issues.length) {
  lines.push('| 级别 | 问题码 | 文件 | id | 说明 |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const it of issues) lines.push(`| ${sev[it.severity] || it.severity} | ${it.code} | ${it.file || '-'} | ${it.id || '-'} | ${String(it.message).replace(/\|/g, '\\|')} |`)
} else {
  lines.push('无问题。')
}
lines.push('')
lines.push(`抽查清单（${sample.length} 条）：`)
for (const s of sample) lines.push(`- ${s.file} / ${s.id}（${s.name}，${s.module}）`)
writeFileSync(options.md, lines.join('\n') + '\n')

console.log(`命令审计：${report.summary.files} 文件 / ${report.summary.items} 条；问题：${errors} 错误 / ${warnings} 存疑 / ${infos} 建议`)
console.log(`链接：${docsToFetch.size} 个，失败 ${linkFailed}；抽样计划：${sample.length}/${totalItems}`)
console.log(`报告：${options.json}`)
process.exit(errors > 0 ? 1 : 0)