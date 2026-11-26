/**
 * 命令速查数据层：Linux 与 Git 是两个独立工具（tool），
 * 数据分别放在 commands-linux-*.json / commands-git.json；
 * 这里按 tool 分开聚合，不做跨工具合并，避免两类命令混在一起。
 */
const files = import.meta.glob('./commands-*.json', { eager: true })

export const COMMAND_TOOLS = [
  {
    id: 'linux',
    label: 'Linux 命令',
    short: 'Linux',
    icon: 'L',
    color: '#e95420',
    desc: '文件、文本、权限、进程、网络、磁盘——日常敲得最多的 49 条。',
  },
  {
    id: 'git',
    label: 'Git 命令',
    short: 'Git',
    icon: 'G',
    color: '#f05033',
    desc: '配置、提交、分支、远程、撤销、排查——30 条把版本控制用明白。',
  },
]

const TOOL_IDS = COMMAND_TOOLS.map((t) => t.id)
const MODULE_ORDER = [
  'linux-file', 'linux-text', 'linux-perm', 'linux-process', 'linux-network', 'linux-disk',
  'git-setup', 'git-basic', 'git-branch', 'git-remote', 'git-undo', 'git-history',
]
const moduleOrderOf = (id) => {
  const i = MODULE_ORDER.indexOf(id)
  return i === -1 ? 99 : i
}

function normalizeCommand(raw, tool) {
  return {
    ...raw,
    id: String(raw.id || ''),
    tool,
    module: raw.module || '',
    name: String(raw.name || ''),
    level: raw.level === '进阶' ? '进阶' : '入门',
    tagline: raw.tagline || '',
    plain: raw.plain || '',
    syntax: raw.syntax || '',
    keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints : [],
    options: Array.isArray(raw.options) ? raw.options : [],
    examples: Array.isArray(raw.examples) ? raw.examples : [],
    pitfalls: Array.isArray(raw.pitfalls) ? raw.pitfalls : [],
    related: Array.isArray(raw.related) ? raw.related : [],
    docs: Array.isArray(raw.docs) ? raw.docs : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  }
}

const modulesByTool = new Map(TOOL_IDS.map((t) => [t, []]))
const itemsByTool = new Map(TOOL_IDS.map((t) => [t, []]))
const seenModule = new Set()

for (const mod of Object.values(files)) {
  const data = mod?.default ?? mod
  if (!data || !TOOL_IDS.includes(data.tool)) continue
  const tool = data.tool
  for (const m of Array.isArray(data.modules) ? data.modules : []) {
    if (!m?.id || seenModule.has(m.id)) continue
    seenModule.add(m.id)
    modulesByTool.get(tool).push({
      id: m.id,
      tool,
      label: m.label || m.id,
      desc: m.desc || '',
    })
  }
  const list = itemsByTool.get(tool)
  for (const item of Array.isArray(data.items) ? data.items : []) {
    if (!item?.id) continue
    list.push(normalizeCommand(item, tool))
  }
}

for (const tool of TOOL_IDS) {
  modulesByTool.get(tool).sort((a, b) => moduleOrderOf(a.id) - moduleOrderOf(b.id))
  const modIndex = new Map(modulesByTool.get(tool).map((m, i) => [m.id, i]))
  const seen = new Set()
  itemsByTool.set(
    tool,
    itemsByTool
      .get(tool)
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .sort((a, b) => {
        const ma = modIndex.get(a.module) ?? 99
        const mb = modIndex.get(b.module) ?? 99
        if (ma !== mb) return ma - mb
        return 0
      }),
  )
}

export const commands = TOOL_IDS.flatMap((t) => itemsByTool.get(t))

export const commandModules = new Map(modulesByTool)
export const commandsByToolMap = new Map(itemsByTool)

export function getCommandTool(toolId) {
  return COMMAND_TOOLS.find((t) => t.id === toolId) || null
}

export function getToolModules(toolId) {
  return modulesByTool.get(toolId) || []
}

export function getToolCommands(toolId) {
  return itemsByTool.get(toolId) || []
}

export function getCommand(toolId, id) {
  return getToolCommands(toolId).find((c) => c.id === id) || null
}

export function getCommandById(id) {
  for (const t of TOOL_IDS) {
    const found = itemsByTool.get(t).find((c) => c.id === id)
    if (found) return found
  }
  return null
}

export function getModule(toolId, moduleId) {
  return getToolModules(toolId).find((m) => m.id === moduleId) || null
}

export function commandsOfModule(toolId, moduleId) {
  return getToolCommands(toolId).filter((c) => c.module === moduleId)
}

export const commandModuleCounts = new Map(
  TOOL_IDS.flatMap((t) => getToolModules(t).map((m) => [m.id, commandsOfModule(t, m.id).length])),
)

export const commandStats = {
  total: commands.length,
  modules: MODULE_ORDER.filter((m) => commands.some((c) => c.module === m)).length,
  byTool: Object.fromEntries(TOOL_IDS.map((t) => [t, itemsByTool.get(t).length])),
}

const FEATURED = {
  linux: ['linux-ls', 'linux-grep', 'linux-chmod', 'linux-ps', 'linux-curl', 'linux-tar'],
  git: ['git-status', 'git-add', 'git-commit', 'git-log', 'git-switch', 'git-push'],
}

export const featuredCommands = {
  linux: FEATURED.linux.map((id) => getCommand('linux', id)).filter(Boolean),
  git: FEATURED.git.map((id) => getCommand('git', id)).filter(Boolean),
}