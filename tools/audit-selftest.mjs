#!/usr/bin/env node
/**
 * tools/audit.mjs 自测脚本。
 *
 * 用 tools/fixtures/ 里的夹具验证审计器本身：
 *   1) smoke 夹具（故意埋错）必须报出全部预期的问题 code，且 exit=1；
 *   2) clean 夹具（完全合法）必须 0 错误 0 存疑，且 exit=0；
 *   3) 离线模式下也必须做 URL 域名白名单校验（--skip-links）。
 *
 * 用法：node tools/audit-selftest.mjs [--with-links]
 *   加 --with-links 会额外跑一次联网链接检查（约 5-15s），验证 404 能被识别。
 * 退出码：0 全部通过；1 有断言失败。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AUDIT = path.join(ROOT, 'tools', 'audit.mjs')
const withLinks = process.argv.includes('--with-links')

let failures = 0
function ok(cond, label, detail = '') {
  if (cond) {
    console.log(`  ✔ ${label}`)
  } else {
    failures++
    console.log(`  ✘ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function runAudit(dataDir, extraArgs, outFile) {
  const args = [AUDIT, '--data-dir', dataDir, '--out', outFile, ...extraArgs]
  const res = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000 })
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, outFile), 'utf8'))
  return { code: res.status, report, stdout: res.stdout, stderr: res.stderr }
}

console.log('== 自测 1：smoke 夹具（故意埋错，离线） ==')
const smokeOut = 'tools/.selftest-smoke.json'
const smoke = runAudit('tools/fixtures/smoke', ['--skip-links'], smokeOut)
const codes = new Set(smoke.report.issues.map((i) => i.code))
const expected = [
  'TAGLINE_TOO_LONG',
  'PLAIN_LENGTH',
  'KEYPOINT_TOO_SHORT',
  'VERSION_NOTE_UNSOURCED',
  'JAVAX_NAMESPACE',
  'IMPORT_PACKAGE_MISMATCH',
  'ATTR_NOT_FOUND',
  'ATTR_DEFAULT_MISMATCH',
  'TARGET_VIOLATION',
  'LINK_DOMAIN_NOT_ALLOWED',
  'KNOWLEDGE_UNBALANCED_FENCE',
  'KNOWLEDGE_LENGTH',
  'TAGS_COUNT',
]
for (const code of expected) ok(codes.has(code), `报出 ${code}`)
ok(smoke.code === 1, 'smoke 夹具 exit=1（有错误）', `实际 ${smoke.code}`)
ok(smoke.report.summary.errors > 0, `error 数 > 0（${smoke.report.summary.errors}）`)
ok(
  smoke.report.issues.some((i) => i.id === 'component') === false,
  '合法 @Component 条目没有误报',
  JSON.stringify(smoke.report.issues.filter((i) => i.id === 'component').map((i) => i.code))
)
// 属性改名/默认值这类事实性错误必须给出「真实值」作为证据
const attrMsg = (smoke.report.issues.find((i) => i.code === 'ATTR_NOT_FOUND') || {}).message || ''
ok(/rollbackFor|noRollbackFor/.test(attrMsg), 'ATTR_NOT_FOUND 消息里列出真实属性名', attrMsg)
const defMsg = (smoke.report.issues.find((i) => i.code === 'ATTR_DEFAULT_MISMATCH') || {}).message || ''
ok(/REQUIRED/.test(defMsg), 'ATTR_DEFAULT_MISMATCH 消息里给出索引中的真实默认值', defMsg)
ok(smoke.report.sample.list.length >= 1, '生成了 40% 抽查计划')

console.log('== 自测 2：clean 夹具（全部合法，离线） ==')
const cleanOut = 'tools/.selftest-clean.json'
const clean = runAudit('tools/fixtures/smoke-clean', ['--skip-links'], cleanOut)
ok(clean.code === 0, 'clean 夹具 exit=0', `实际 ${clean.code}`)
ok(clean.report.summary.errors === 0, 'clean 夹具 0 错误', `${clean.report.summary.errors}`)
ok(clean.report.summary.warnings === 0, 'clean 夹具 0 存疑', `${clean.report.summary.warnings}`)
ok(clean.report.summary.verdict === 'pass', 'verdict=pass', clean.report.summary.verdict)

console.log('== 自测 3：索引加载 ==')
ok(clean.report.index.annotations >= 1109, `索引注解数 ≥1109（实际 ${clean.report.index.annotations}）`)
ok(clean.report.index.simpleNames > 1000, `简单名索引 >1000（${clean.report.index.simpleNames}）`)

if (withLinks) {
  console.log('== 自测 4：联网链接检查（识别 404） ==')
  const netOut = 'tools/.selftest-net.json'
  const net = runAudit('tools/fixtures/smoke', ['--concurrency', '4'], netOut)
  const link = net.report.summary.linkChecks
  ok(link.total >= 4, `检查了 ≥4 个链接（${link.total}）`)
  ok(link.failed >= 1, '至少 1 个链接失败（故意 404）', JSON.stringify(link))
  const broken = net.report.issues.find((i) => i.code === 'LINK_BROKEN')
  ok(!!broken, '报出 LINK_BROKEN', JSON.stringify(link))
  if (broken) ok(/no-such-page/.test(broken.message + broken.url), '失败链接就是故意 404 的那条')
}

// 清理临时报告
for (const f of ['tools/.selftest-smoke.json', 'tools/.selftest-clean.json', 'tools/.selftest-net.json']) {
  try {
    fs.unlinkSync(path.join(ROOT, f))
  } catch {}
}

if (failures) {
  console.error(`\n自测失败：${failures} 项断言未通过`)
  process.exit(1)
}
console.log('\n全部自测通过 ✅')