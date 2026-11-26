#!/usr/bin/env node
/**
 * 命令速查数据校验（Linux / Git 严格分模块）
 * 用法: node scripts/validate-commands.mjs
 * 规范: docs/COMMAND-SPEC.md
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = resolve(root, 'src/data')

const FILES = {
  'commands-linux-a.json': {
    tool: 'linux',
    generatedBy: 'content-linux-a',
    modules: [
      { id: 'linux-file', label: '文件与目录', commands: [['ls', 'linux-ls'], ['cd', 'linux-cd'], ['pwd', 'linux-pwd'], ['mkdir', 'linux-mkdir'], ['rm', 'linux-rm'], ['cp', 'linux-cp'], ['mv', 'linux-mv'], ['touch', 'linux-touch'], ['find', 'linux-find'], ['ln', 'linux-ln']] },
      { id: 'linux-text', label: '查看与文本处理', commands: [['cat', 'linux-cat'], ['less', 'linux-less'], ['head', 'linux-head'], ['tail', 'linux-tail'], ['grep', 'linux-grep'], ['wc', 'linux-wc'], ['sort', 'linux-sort'], ['cut', 'linux-cut'], ['sed', 'linux-sed'], ['awk', 'linux-awk']] },
      { id: 'linux-perm', label: '权限与用户', commands: [['chmod', 'linux-chmod'], ['chown', 'linux-chown'], ['umask', 'linux-umask'], ['sudo', 'linux-sudo'], ['su', 'linux-su'], ['useradd', 'linux-useradd']] }
    ]
  },
  'commands-linux-b.json': {
    tool: 'linux',
    generatedBy: 'content-linux-b',
    modules: [
      { id: 'linux-process', label: '进程与系统', commands: [['ps', 'linux-ps'], ['top', 'linux-top'], ['kill', 'linux-kill'], ['pkill', 'linux-pkill'], ['jobs', 'linux-jobs'], ['nohup', 'linux-nohup'], ['systemctl', 'linux-systemctl'], ['free', 'linux-free'], ['uptime', 'linux-uptime']] },
      { id: 'linux-network', label: '网络与远程', commands: [['ip', 'linux-ip'], ['ping', 'linux-ping'], ['curl', 'linux-curl'], ['wget', 'linux-wget'], ['ss', 'linux-ss'], ['ssh', 'linux-ssh'], ['scp', 'linux-scp'], ['rsync', 'linux-rsync']] },
      { id: 'linux-disk', label: '磁盘与压缩', commands: [['df', 'linux-df'], ['du', 'linux-du'], ['tar', 'linux-tar'], ['gzip', 'linux-gzip'], ['zip', 'linux-zip'], ['unzip', 'linux-unzip']] }
    ]
  },
  'commands-git.json': {
    tool: 'git',
    generatedBy: 'content-git',
    modules: [
      { id: 'git-setup', label: '配置与仓库', commands: [['git config', 'git-config'], ['git init', 'git-init'], ['git clone', 'git-clone'], ['git help', 'git-help']] },
      { id: 'git-basic', label: '提交与查看', commands: [['git status', 'git-status'], ['git add', 'git-add'], ['git commit', 'git-commit'], ['git diff', 'git-diff'], ['git log', 'git-log'], ['git show', 'git-show']] },
      { id: 'git-branch', label: '分支与合并', commands: [['git branch', 'git-branch'], ['git switch', 'git-switch'], ['git merge', 'git-merge'], ['git rebase', 'git-rebase'], ['git cherry-pick', 'git-cherry-pick']] },
      { id: 'git-remote', label: '远程协作', commands: [['git remote', 'git-remote'], ['git fetch', 'git-fetch'], ['git pull', 'git-pull'], ['git push', 'git-push']] },
      { id: 'git-undo', label: '撤销与回退', commands: [['git restore', 'git-restore'], ['git reset', 'git-reset'], ['git revert', 'git-revert'], ['git stash', 'git-stash'], ['git clean', 'git-clean'], ['git rm', 'git-rm']] },
      { id: 'git-history', label: '历史与排查', commands: [['git blame', 'git-blame'], ['git bisect', 'git-bisect'], ['git reflog', 'git-reflog'], ['git tag', 'git-tag'], ['git worktree', 'git-worktree']] }
    ]
  }
}

const DOC_HOSTS = new Set([
  'man7.org', 'www.gnu.org', 'gnu.org', 'git-scm.com', 'man.openbsd.org',
  'curl.se', 'rsync.samba.org', 'www.freedesktop.org', 'freedesktop.org',
  'www.kernel.org', 'kernel.org', 'infozip.sourceforge.net'
])

const errors = []
const warnings = []
const err = (f, id, msg) => errors.push(`[${f}] ${id ? id + ': ' : ''}${msg}`)
const warn = (f, id, msg) => warnings.push(`[${f}] ${id ? id + ': ' : ''}${msg}`)

const visibleLen = s => String(s ?? '').replace(/\s/g, '').length
const cjkLen = s => (String(s ?? '').match(/[\u4e00-\u9fff]/g) || []).length
const isStr = v => typeof v === 'string'

const MIN_OPTIONS = new Map([['linux-nohup', 2], ['linux-umask', 2]])

const allIds = new Map() // id -> file
const allNames = new Map() // tool|name -> id
let total = 0

for (const [file, spec] of Object.entries(FILES)) {
  const path = resolve(dataDir, file)
  if (!existsSync(path)) { err(file, '', '文件不存在'); continue }
  let json
  try { json = JSON.parse(readFileSync(path, 'utf8')) } catch (e) { err(file, '', 'JSON 解析失败: ' + e.message); continue }

  if (json.tool !== spec.tool) err(file, '', `tool 应为 ${spec.tool}，实际 ${json.tool}`)
  if (json.generatedBy !== spec.generatedBy) err(file, '', `generatedBy 应为 ${spec.generatedBy}`)
  if (!Array.isArray(json.modules)) { err(file, '', 'modules 不是数组'); continue }
  if (!Array.isArray(json.items)) { err(file, '', 'items 不是数组'); continue }

  // modules：数量/顺序/id/label 完全一致
  if (json.modules.length !== spec.modules.length) err(file, '', `modules 数量应为 ${spec.modules.length}，实际 ${json.modules.length}`)
  json.modules.forEach((m, i) => {
    const sm = spec.modules[i]
    if (!sm) return
    if (m.id !== sm.id) err(file, '', `modules[${i}].id 应为 ${sm.id}，实际 ${m.id}`)
    if (m.label !== sm.label) err(file, '', `modules[${i}].label 应为 ${sm.label}，实际 ${m.label}`)
    if (!isStr(m.desc) || cjkLen(m.desc) < 8 || cjkLen(m.desc) > 40) err(file, m.id, 'module.desc 需 8–40 个汉字')
  })
  const moduleIds = new Set(spec.modules.map(m => m.id))
  for (const m of json.modules) if (!moduleIds.has(m.id)) err(file, m.id, '多余的 module')

  // 期望顺序（module 顺序 + 命令顺序）
  const expected = spec.modules.flatMap(m => m.commands.map(([name, id]) => ({ name, id, module: m.id })))
  const expectedIds = new Set(expected.map(e => e.id))
  const expectedNames = new Set(expected.map(e => e.name))

  if (json.items.length !== expected.length) err(file, '', `条目数应为 ${expected.length}，实际 ${json.items.length}`)

  const seenInFile = new Set()
  json.items.forEach((it, idx) => {
    const where = it.id || `items[${idx}]`
    if (!isStr(it.id)) { err(file, where, 'id 缺失'); return }
    if (seenInFile.has(it.id)) err(file, it.id, '文件内 id 重复')
    seenInFile.add(it.id)
    if (allIds.has(it.id)) err(file, it.id, `与 ${allIds.get(it.id)} 的 id 重复`)
    else allIds.set(it.id, file)

    if (!expectedIds.has(it.id)) err(file, it.id, '不在规范命令清单里（或 id 拼写不一致）')
    if (!isStr(it.tool) || it.tool !== spec.tool) err(file, it.id, `tool 必须为 ${spec.tool}`)
    if (!moduleIds.has(it.module)) err(file, it.id, `module ${it.module} 不是本文件声明的模块`)
    if (!isStr(it.name) || !expectedNames.has(it.name)) err(file, it.id, `name ${it.name} 不在规范清单里`)
    if (allNames.has(spec.tool + '|' + it.name)) err(file, it.id, `同 tool 内命令名重复（${it.name}）`)
    else allNames.set(spec.tool + '|' + it.name, it.id)

    // 顺序：允许错误定位
    const exp = expected[idx]
    if (exp && exp.id !== it.id) warn(file, it.id, `条目顺序与规范不一致（该位置应为 ${exp.id}）`)

    if (!['入门', '进阶'].includes(it.level)) err(file, it.id, 'level 必须是 入门 或 进阶')
    if (!isStr(it.tagline) || cjkLen(it.tagline) > 22) err(file, it.id, 'tagline 需 ≤22 个汉字')
    const pl = visibleLen(it.plain)
    if (pl < 60 || pl > 180) err(file, it.id, `plain 可见字符 ${pl}，需 60–180`)

    if (!isStr(it.syntax) || it.syntax.length < 5 || it.syntax.length > 80) err(file, it.id, 'syntax 长度需 5–80')
    else if (it.syntax !== it.name && !it.syntax.startsWith(it.name + ' ')) err(file, it.id, 'syntax 必须以 name 开头')

    const kp = it.keyPoints
    if (!Array.isArray(kp) || kp.length < 3 || kp.length > 5) err(file, it.id, 'keyPoints 需 3–5 条')
    else kp.forEach((s, i) => { if (!isStr(s) || s.length < 8 || s.length > 80) err(file, it.id, `keyPoints[${i}] 长度需 8–80`) })

    const ops = it.options
    const minOpt = MIN_OPTIONS.get(it.id) ?? 3
    if (!Array.isArray(ops) || ops.length < minOpt || ops.length > 8) err(file, it.id, `options 需 ${minOpt}–8 条（${it.id} 官方仅少量选项）`)
    else ops.forEach((o, i) => {
      if (!isStr(o.flag) || !/^--?[A-Za-z0-9]/.test(o.flag)) err(file, it.id, `options[${i}].flag 非法（${o.flag}）`)
      if (!isStr(o.desc) || o.desc.length < 6 || o.desc.length > 60) err(file, it.id, `options[${i}].desc 长度需 6–60`)
    })

    const ex = it.examples
    if (!Array.isArray(ex) || ex.length < 2 || ex.length > 4) err(file, it.id, 'examples 需 2–4 条')
    else ex.forEach((e, i) => {
      if (!isStr(e.desc) || e.desc.length < 3 || e.desc.length > 40) err(file, it.id, `examples[${i}].desc 长度需 3–40`)
      if (!isStr(e.code) || !e.code.trim()) err(file, it.id, `examples[${i}].code 为空`)
      else if (e.code.length > 160) err(file, it.id, `examples[${i}].code 过长（${e.code.length}）`)
      else if (/^\s*\$\s/m.test(e.code)) err(file, it.id, `examples[${i}].code 不要带 $ 提示符`)
    })

    const pf = it.pitfalls
    if (!Array.isArray(pf) || pf.length < 1 || pf.length > 3) err(file, it.id, 'pitfalls 需 1–3 条')
    else pf.forEach((s, i) => { if (!isStr(s) || s.length < 10 || s.length > 90) err(file, it.id, `pitfalls[${i}] 长度需 10–90`) })

    const rel = it.related
    if (!Array.isArray(rel) || rel.length < 2 || rel.length > 4) err(file, it.id, 'related 需 2–4 条')
    else rel.forEach(r => {
      if (!isStr(r) || !r.startsWith(spec.tool + '-')) err(file, it.id, `related ${r} 必须同 tool 前缀 ${spec.tool}-`)
      if (r === it.id) err(file, it.id, 'related 不能引用自己')
      if (!expectedIds.has(r)) err(file, it.id, `related ${r} 不在本 tool 清单里`)
    })

    const docs = it.docs
    if (!Array.isArray(docs) || docs.length < 1 || docs.length > 2) err(file, it.id, 'docs 需 1–2 条')
    else docs.forEach((d, i) => {
      if (!isStr(d.label) || !d.label.trim()) err(file, it.id, `docs[${i}].label 为空`)
      if (!isStr(d.url) || !/^https:\/\/[^\s]+$/.test(d.url)) { err(file, it.id, `docs[${i}].url 非 https`); return }
      let u
      try { u = new URL(d.url) } catch { err(file, it.id, `docs[${i}].url 非法`); return }
      if (!DOC_HOSTS.has(u.hostname)) err(file, it.id, `docs[${i}] 域名 ${u.hostname} 不在白名单`)
      if (u.pathname === '/' || u.pathname === '') err(file, it.id, `docs[${i}] 不能只给首页`)
      if (spec.tool === 'git' && i === 0 && !(u.hostname === 'git-scm.com')) err(file, it.id, 'Git 条目 docs 第一条必须来自 git-scm.com')
      if (spec.tool === 'linux' && !['man7.org', 'www.gnu.org', 'gnu.org', 'man.openbsd.org', 'curl.se', 'rsync.samba.org', 'www.freedesktop.org', 'www.kernel.org', 'infozip.sourceforge.net'].includes(u.hostname)) err(file, it.id, `Linux 条目 docs[${i}] 来源不合适`)
    })

    const tags = it.tags
    if (!Array.isArray(tags) || tags.length < 2 || tags.length > 5) err(file, it.id, 'tags 需 2–5 个')
    else tags.forEach((t, i) => { if (!isStr(t) || t.length < 1 || t.length > 8) err(file, it.id, `tags[${i}] 长度需 ≤8`) })

    total++
  })

  // 缺漏检查
  for (const e of expected) if (!json.items.some(it => it.id === e.id)) err(file, e.id, '缺少该命令条目')
}

// 跨 tool 污染检查：related 已按 tool 校验；再兜底查 id 前缀与 tool 不符
for (const [id, file] of allIds) {
  const spec = FILES[file]
  if (spec && !id.startsWith(spec.tool + '-')) err(file, id, `id 前缀与 tool 不符`)
  if (spec && spec.tool === 'linux' && id.startsWith('git-')) err(file, id, 'Linux 文件中出现 Git 条目')
  if (spec && spec.tool === 'git' && id.startsWith('linux-')) err(file, id, 'Git 文件中出现 Linux 条目')
}

const uniqueMods = new Set()
for (const [file, spec] of Object.entries(FILES)) for (const m of spec.modules) {
  if (uniqueMods.has(m.id)) err(file, m.id, 'module id 跨文件重复')
  uniqueMods.add(m.id)
}

console.log(`命令数据校验：${Object.keys(FILES).length} 个文件，${total} 条命令`)
if (warnings.length) { console.log(`\n⚠️ 警告 ${warnings.length} 条`); warnings.forEach(w => console.log('  - ' + w)) }
if (errors.length) { console.log(`\n❌ 错误 ${errors.length} 条`); errors.forEach(e => console.log('  - ' + e)); process.exit(1) }
console.log('\n✅ 校验通过（0 错误）')