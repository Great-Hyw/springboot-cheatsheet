import hljs from 'highlight.js/lib/core'
import java from 'highlight.js/lib/languages/java'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import properties from 'highlight.js/lib/languages/properties'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import javascript from 'highlight.js/lib/languages/javascript'

hljs.registerLanguage('java', java)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('properties', properties)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('json', json)
hljs.registerLanguage('javascript', javascript)

const ALIASES = {
  java: 'java',
  xml: 'xml',
  html: 'xml',
  yml: 'yaml',
  yaml: 'yaml',
  properties: 'properties',
  conf: 'properties',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  sql: 'sql',
  json: 'json',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'javascript',
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function highlightCode(code, lang) {
  const language = ALIASES[String(lang || '').toLowerCase()]
  if (!language) return escapeHtml(code)
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value
  } catch {
    return escapeHtml(code)
  }
}

export function highlightElement(el) {
  try {
    hljs.highlightElement(el)
  } catch {
    /* 高亮失败不影响可读性 */
  }
}