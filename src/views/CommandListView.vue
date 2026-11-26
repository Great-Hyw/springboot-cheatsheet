<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  COMMAND_TOOLS,
  commandModuleCounts,
  getCommandTool,
  getToolCommands,
  getToolModules,
} from '../data/commands'

const route = useRoute()
const router = useRouter()

const toolId = computed(() => String(route.params.tool || ''))
const tool = computed(() => getCommandTool(toolId.value))
const modules = computed(() => getToolModules(toolId.value))
const commands = computed(() => getToolCommands(toolId.value))

const keyword = ref('')
const level = ref('全部')
const activeModule = computed(() => String(route.query.module || ''))

watch(toolId, () => {
  keyword.value = ''
  level.value = '全部'
})

const visibleModuleSections = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const filtered = commands.value.filter((c) => {
    if (activeModule.value && c.module !== activeModule.value) return false
    if (level.value !== '全部' && c.level !== level.value) return false
    if (!kw) return true
    return [c.name, c.tagline, c.plain, c.syntax, ...(c.tags || []), ...(c.options || []).map((o) => o.flag)]
      .join(' ')
      .toLowerCase()
      .includes(kw)
  })
  return modules.value
    .filter((m) => !activeModule.value || m.id === activeModule.value)
    .map((m) => ({ ...m, items: filtered.filter((c) => c.module === m.id) }))
    .filter((m) => m.items.length)
})

const totalVisible = computed(() => visibleModuleSections.value.reduce((n, s) => n + s.items.length, 0))

function setModule(id) {
  router.replace({
    path: `/commands/${toolId.value}`,
    query: id ? { module: id } : {},
  })
}
</script>

<template>
  <div class="main-inner main-inner--wide">
    <template v-if="tool">
      <nav class="crumb" aria-label="面包屑">
        <RouterLink to="/commands">命令速查</RouterLink>
        <span>/</span>
        <span>{{ tool.short }}</span>
      </nav>

      <header class="cmd-list-head">
        <span class="cmd-tool-badge cmd-tool-badge--lg" :style="{ background: tool.color }">{{ tool.icon }}</span>
        <div>
          <h1>{{ tool.label }}</h1>
          <p>{{ tool.desc }}</p>
          <div class="cmd-list-meta">
            <span>{{ commands.length }} 条命令</span>
            <span>·</span>
            <span>{{ modules.length }} 个模块</span>
            <span>·</span>
            <span>每条都有真实选项、可执行示例和官方文档</span>
          </div>
        </div>
      </header>

      <div class="filter-bar cmd-filter-bar">
        <div class="filter-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input v-model="keyword" type="search" :placeholder="`在 ${tool.short} 命令里搜：命令名、用途或参数`" />
        </div>
        <div class="filter-chips" role="group" aria-label="按难度筛选">
          <button
            v-for="lv in ['全部', '入门', '进阶']"
            :key="lv"
            type="button"
            class="filter-chip"
            :class="{ active: level === lv }"
            @click="level = lv"
          >
            {{ lv }}
          </button>
        </div>
      </div>

      <div class="cmd-mod-chips" role="group" aria-label="按模块筛选">
        <button type="button" class="filter-chip" :class="{ active: !activeModule }" @click="setModule('')">全部模块</button>
        <button
          v-for="m in modules"
          :key="m.id"
          type="button"
          class="filter-chip"
          :class="{ active: activeModule === m.id }"
          @click="setModule(m.id)"
        >
          {{ m.label }} <span class="chip-count">{{ commandModuleCounts.get(m.id) || 0 }}</span>
        </button>
      </div>

      <template v-if="totalVisible">
        <section v-for="m in visibleModuleSections" :key="m.id" class="cmd-section">
          <div class="cmd-section__head">
            <h2>{{ m.label }}</h2>
            <p>{{ m.desc }}</p>
            <span class="cmd-section__count">{{ m.items.length }} 条</span>
          </div>
          <div class="cmd-grid">
            <RouterLink v-for="c in m.items" :key="c.id" class="cmd-card" :to="`/commands/${tool.id}/${c.id}`">
              <div class="cmd-card__top">
                <code class="cmd-card__name">{{ c.name }}</code>
                <span class="tag" :class="{ 'tag--adv': c.level === '进阶' }">{{ c.level }}</span>
              </div>
              <p class="cmd-card__tagline">{{ c.tagline }}</p>
              <code class="cmd-card__syntax">{{ c.syntax }}</code>
              <div class="cmd-card__tags">
                <span v-for="t in c.tags.slice(0, 3)" :key="t" class="tag">{{ t }}</span>
              </div>
            </RouterLink>
          </div>
        </section>
      </template>

      <div v-else class="empty">
        <strong>{{ commands.length ? '没有匹配的命令' : '这个模块的数据还没生成' }}</strong>
        <p v-if="commands.length">换个关键词，或切回「全部模块 / 全部难度」。</p>
        <div class="empty-actions">
          <button type="button" class="btn" @click="keyword = ''; level = '全部'; setModule('')">清除筛选</button>
          <RouterLink class="btn" to="/commands">看看另一个模块</RouterLink>
        </div>
      </div>
    </template>

    <div v-else class="empty">
      <strong>没有这个命令模块</strong>
      <p>Linux 和 Git 是两个独立入口，别走错门。</p>
      <div class="empty-actions">
        <RouterLink v-for="t in COMMAND_TOOLS" :key="t.id" class="btn" :to="`/commands/${t.id}`">
          {{ t.label }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>