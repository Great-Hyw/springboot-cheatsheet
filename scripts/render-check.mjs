/**
 * 渲染检查脚本：用无头 Chrome 打开预览站，自动检查：
 *  - JS 控制台错误 / 页面异常
 *  - 横向溢出（手机上最常见的布局事故）
 *  - 关键元素是否渲染（顶栏、侧栏、标题、卡片列表）
 *  - 详情页 / 知识页在数据存在时是否能正常打开
 * 同时把每个页面截图存到 tmp/screens/，方便人工快速过一眼。
 *
 * 用法：node scripts/render-check.mjs [baseUrl]
 * 前提：先 npm run build 且 npx vite preview --port 4173 已启动。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const argUrl = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : ''
const baseUrl = (argUrl || 'http://127.0.0.1:4173').replace(/\/$/, '')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p))
if (!executablePath) {
  console.error('找不到 Chrome/Edge，可以用 CHROME_PATH 环境变量指定。')
  process.exit(2)
}

function readAllIds(prefix) {
  const dir = path.join(root, 'src', 'data')
  if (!fs.existsSync(dir)) return []
  const ids = []
  for (const file of fs.readdirSync(dir)) {
    if (!file.startsWith(prefix) || !file.endsWith('.json')) continue
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      for (const it of data.items || []) if (it?.id) ids.push(it.id)
    } catch {
      /* 忽略损坏文件 */
    }
  }
  return ids
}

function readFirstId(prefix) {
  const dir = path.join(root, 'src', 'data')
  if (!fs.existsSync(dir)) return null
  for (const file of fs.readdirSync(dir)) {
    if (!file.startsWith(prefix) || !file.endsWith('.json')) continue
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      if (Array.isArray(data.items) && data.items[0]?.id) return data.items[0].id
    } catch {
      /* 忽略损坏文件，交给校验脚本报告 */
    }
  }
  return null
}

function readAllTopics() {
  const dir = path.join(root, 'src', 'data')
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const file of fs.readdirSync(dir)) {
    if (!file.startsWith('topics-') || !file.endsWith('.json')) continue
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      const topic = data.topic
      for (const it of data.items || []) if (it?.id && topic) out.push({ topic, id: it.id })
    } catch {
      /* 忽略损坏文件 */
    }
  }
  return out
}

function readAllCommands() {
  const dir = path.join(root, 'src', 'data')
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const file of fs.readdirSync(dir)) {
    if (!file.startsWith('commands-') || !file.endsWith('.json')) continue
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      for (const it of data.items || []) if (it?.id && it?.tool) out.push({ tool: it.tool, id: it.id })
    } catch {
      /* 忽略损坏文件 */
    }
  }
  return out
}

const checkAll = process.argv.includes('--all')
const routes = ['/', '/annotations', '/knowledge', '/commands', '/commands/linux', '/commands/git', '/topics', '/topics/conventions', '/topics/interview', '/topics/layers', '/topics/coordinates', '/favorites', '/about']
if (checkAll) {
  for (const id of readAllIds('annotations-')) routes.push(`/annotations/${id}`)
  for (const id of readAllIds('knowledge-')) routes.push(`/knowledge/${id}`)
  for (const c of readAllCommands()) routes.push(`/commands/${c.tool}/${c.id}`)
  for (const t of readAllTopics()) routes.push(`/topics/${t.topic}/${t.id}`)
} else {
  const annId = readFirstId('annotations-')
  const knId = readFirstId('knowledge-')
  const cmd = readAllCommands()[0]
  const topic = readAllTopics()[0]
  if (annId) routes.push(`/annotations/${annId}`)
  if (knId) routes.push(`/knowledge/${knId}`)
  if (cmd) routes.push(`/commands/${cmd.tool}/${cmd.id}`)
  if (topic) routes.push(`/topics/${topic.topic}/${topic.id}`)
}
routes.push('/this-page-does-not-exist')

const report = { baseUrl, generatedAt: new Date().toISOString(), pages: [], problems: [] }

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
})

const screensDir = path.join(root, 'tmp', 'screens')
fs.mkdirSync(screensDir, { recursive: true })

async function check(route, width, height, label) {
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  const url = `${baseUrl}/#${route}`
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }).catch((e) => {
    consoleErrors.push(`goto failed: ${e.message}`)
  })
  await new Promise((r) => setTimeout(r, 350))

  const info = await page.evaluate(() => {
    const doc = document.documentElement
    const inner = window.innerWidth
    const overflow = []
    if (doc.scrollWidth > inner + 2) {
      const all = [...document.querySelectorAll('body *')]
      const candidates = []
      for (const el of all) {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        const rectOverflow = r.width > 0 && r.right > inner + 2
        // 文字不可断行导致内容比盒子宽：rect 不越界，但 scrollWidth 会撑大页面
        const textOverflow =
          cs.overflowX === 'visible' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2
        if (!rectOverflow && !textOverflow) continue
        // 内容在 overflow-x:auto 的容器里只会让容器内部滚动，不算页面溢出
        let anc = el.parentElement
        let insideScroller = false
        while (anc) {
          const ox = getComputedStyle(anc).overflowX
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') {
            insideScroller = true
            break
          }
          anc = anc.parentElement
        }
        if (insideScroller) continue
        candidates.push({
          el,
          tag: el.tagName.toLowerCase(),
          cls: (el.className && String(el.className).slice(0, 60)) || '',
          right: Math.round(r.right),
          width: Math.round(r.width),
          text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 80),
        })
      }
      // 只保留最内层的问题元素，避免把祖先链一起报出来
      for (const c of candidates) {
        if (candidates.some((o) => o !== c && c.el.contains(o.el))) continue
        overflow.push({ tag: c.tag, cls: c.cls, right: c.right, width: c.width, text: c.text })
        if (overflow.length >= 5) break
      }
    }
    const text = (sel) => document.querySelector(sel)?.textContent?.trim() || ''
    return {
      title: document.title,
      h1: text('h1'),
      scrollWidth: doc.scrollWidth,
      innerWidth: inner,
      overflow,
      cards: document.querySelectorAll('.ann-card, .kn-card, .fav-row, .detail-head, .doc-head, .cmd-card, .cmd-mod-card, .cmd-detail-head, .topic-card, .topic-row, .topic-detail-head').length,
      hasHeader: !!document.querySelector('header, .app-header, .site-header'),
      computedLang: doc.lang,
    }
  })

  const problems = []
  if (info.overflow.length) {
    problems.push(`${label} 横向溢出：scrollWidth ${info.scrollWidth} > ${info.innerWidth}，例如 ${JSON.stringify(info.overflow)}`)
  }
  if (consoleErrors.length) problems.push(`${label} 控制台错误：${consoleErrors.join(' | ')}`)
  if (!info.h1) problems.push(`${label} 缺少 h1`)

  const shot = path.join(screensDir, `${label.replace(/[^a-z0-9]+/gi, '_')}.png`)
  await page.screenshot({ path: shot, fullPage: false })
  await page.close()

  report.pages.push({ route, viewport: `${width}x${height}`, ...info, consoleErrors, screenshot: shot })
  report.problems.push(...problems)
  console.log(
    `${problems.length ? '❌' : '✅'} ${label}  ${info.title || '(no title)'}  h1="${info.h1}"  元素=${info.cards}` +
      (problems.length ? `\n   ${problems.join('\n   ')}` : ''),
  )
}

for (const route of routes) {
  const label = route === '/' ? 'home' : route.replace(/[/]/g, '_')
  // --all 时详情页只跑手机宽度：横向溢出是移动端主要风险，桌面端抽首页/列表即可
  const isDetail = route.split('/').length > 2
  if (!checkAll || !isDetail) await check(route, 1440, 900, `desktop_${label}`)
  await check(route, 390, 844, `mobile_${label}`)
}

await browser.close()

fs.mkdirSync(path.join(root, 'tmp'), { recursive: true })
fs.writeFileSync(path.join(root, 'tmp', 'render-report.json'), JSON.stringify(report, null, 2))
console.log(`\n共检查 ${report.pages.length} 个页面，问题 ${report.problems.length} 个。报告：tmp/render-report.json`)
if (report.problems.length) process.exit(1)