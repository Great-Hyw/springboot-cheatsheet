#!/usr/bin/env node
/**
 * 为人工抽查准备「官方文档证据快照」。
 *
 * 把高风险注解/机制对应的官方页面抓下来，去掉 HTML 标签后存成纯文本
 * tools/evidence/cache/<slug>.txt，供抽查时 grep 原文引用（避免凭记忆断言）。
 * 只抓白名单域名，带超时/重试。
 *
 * 用法：node tools/evidence/fetch-evidence.mjs [--refresh] [slug...]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CACHE_DIR = path.join(ROOT, 'tools', 'evidence', 'cache')
fs.mkdirSync(CACHE_DIR, { recursive: true })

const PAGES = {
  'tx-annotations': 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html',
  'tx-propagation': 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html',
  'tx-declarative': 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/index.html',
  'scheduling': 'https://docs.spring.io/spring-framework/reference/integration/scheduling.html',
  'mockbean-javadoc': 'https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/mock/mockito/MockBean.html',
  'mockitobean-javadoc': 'https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/mock/mockito/MockitoBean.html',
  'test-autoconfigure-javadoc': 'https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/autoconfigure/web/servlet/AutoConfigureMockMvc.html',
  'bean-validation': 'https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html',
  'mvc-ann-advice': 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html',
  'autowired': 'https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html',
  'external-config': 'https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html',
  'classpath-scanning': 'https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html',
  'auto-config': 'https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html',
  'method-security': 'https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html',
  'boot-testing': 'https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html',
  'jpa-entity': 'https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1.html',
  'transaction-management': 'https://docs.spring.io/spring-framework/reference/data-access/transaction.html',
  'spring-data-jpa': 'https://docs.spring.io/spring-data/jpa/reference/jpa.html',
  'mybatis-spring': 'https://mybatis.org/spring/mappers.html',
  'conditional': 'https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations',
}

const args = process.argv.slice(2)
const refresh = args.includes('--refresh')
const only = args.filter((a) => !a.startsWith('--'))
const timeoutMs = 30000

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

async function fetchText(url) {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), timeoutMs)
    try {
      const res = await fetch(url, { redirect: 'follow', signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0 cheatsheet-verifier/1.0' } })
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      return { status: res.status, finalUrl: res.url, text: stripHtml(html) }
    } catch (e) {
      clearTimeout(t)
      lastErr = e
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200))
    }
  }
  return { status: 0, error: String(lastErr?.message || lastErr) }
}

const slugs = only.length ? only : Object.keys(PAGES)
const results = []
for (const slug of slugs) {
  const url = PAGES[slug]
  if (!url) {
    console.error(`未知 slug: ${slug}`)
    continue
  }
  const file = path.join(CACHE_DIR, `${slug}.txt`)
  if (!refresh && fs.existsSync(file) && fs.statSync(file).size > 500) {
    results.push({ slug, url, cached: true })
    continue
  }
  process.stderr.write(`抓取 ${slug} ... `)
  const r = await fetchText(url)
  if (!r.text) {
    console.error(`失败：${r.error || r.status}`)
    results.push({ slug, url, ok: false })
    continue
  }
  const header = `SOURCE: ${url}\nFETCHED: ${new Date().toISOString()}\n\n`
  fs.writeFileSync(file, header + r.text)
  console.error(`ok ${r.text.length} chars`)
  results.push({ slug, url, ok: true, chars: r.text.length })
}
console.log(JSON.stringify({ cacheDir: path.relative(ROOT, CACHE_DIR), results }, null, 2))