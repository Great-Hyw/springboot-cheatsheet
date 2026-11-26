<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import CodeBlock from '../components/CodeBlock.vue'
import { getCommand, getCommandTool, getModule, getToolCommands } from '../data/commands'

const route = useRoute()
const toolId = computed(() => String(route.params.tool || ''))
const commandId = computed(() => String(route.params.id || ''))
const tool = computed(() => getCommandTool(toolId.value))
const command = computed(() => getCommand(toolId.value, commandId.value))
const module = computed(() => (command.value ? getModule(toolId.value, command.value.module) : null))

const siblings = computed(() => {
  if (!command.value) return []
  return getToolCommands(toolId.value).filter((c) => c.module === command.value.module)
})
const idx = computed(() => siblings.value.findIndex((c) => c.id === commandId.value))
const prev = computed(() => (idx.value > 0 ? siblings.value[idx.value - 1] : null))
const next = computed(() => (idx.value > -1 && idx.value < siblings.value.length - 1 ? siblings.value[idx.value + 1] : null))

const relatedCommands = computed(() => {
  if (!command.value) return []
  return command.value.related
    .map((id, i) => ({ id, name: null, i }))
    .map((r) => {
      const c = getCommand(toolId.value, r.id)
      return c ? { id: c.id, name: c.name, tagline: c.tagline } : { id: r.id, name: r.id, tagline: '' }
    })
})

const copied = ref(false)
async function copyName() {
  try {
    await navigator.clipboard.writeText(command.value.name)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="main-inner">
    <template v-if="command && tool">
      <nav class="crumb" aria-label="面包屑">
        <RouterLink to="/commands">命令速查</RouterLink>
        <span>/</span>
        <RouterLink :to="`/commands/${tool.id}`">{{ tool.short }}</RouterLink>
        <span>/</span>
        <span>{{ module?.label || command.module }}</span>
      </nav>

      <header class="cmd-detail-head">
        <div class="cmd-detail-head__main">
          <span class="cmd-tool-badge" :style="{ background: tool.color }">{{ tool.icon }}</span>
          <div>
            <h1 class="cmd-detail-name">{{ command.name }}</h1>
            <p class="cmd-detail-tagline">{{ command.tagline }}</p>
            <div class="cmd-detail-meta">
              <span class="tag">{{ tool.short }}</span>
              <span class="tag">{{ module?.label || command.module }}</span>
              <span class="tag" :class="{ 'tag--adv': command.level === '进阶' }">{{ command.level }}</span>
            </div>
          </div>
        </div>
        <button class="fav-btn" type="button" @click="copyName">{{ copied ? '已复制 ✓' : '复制命令名' }}</button>
      </header>

      <section class="plain-box">
        <p>{{ command.plain }}</p>
      </section>

      <section v-if="command.keyPoints.length" class="detail-block">
        <h2 class="block-title">先记住这几点</h2>
        <ul class="point-list">
          <li v-for="(p, i) in command.keyPoints" :key="i">{{ p }}</li>
        </ul>
      </section>

      <section class="detail-block">
        <h2 class="block-title">语法</h2>
        <CodeBlock :code="command.syntax" lang="bash" title="语法" />
      </section>

      <section v-if="command.options.length" class="detail-block">
        <h2 class="block-title">常用选项 <small>真实参数，不用记全</small></h2>
        <div class="table-wrap">
          <table class="attr-table">
            <thead>
              <tr>
                <th>选项</th>
                <th>作用</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in command.options" :key="o.flag">
                <td><code>{{ o.flag }}</code></td>
                <td>{{ o.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="detail-block">
        <h2 class="block-title">照着敲</h2>
        <div v-for="(ex, i) in command.examples" :key="i" class="cmd-example">
          <p class="cmd-example__desc">{{ ex.desc }}</p>
          <CodeBlock :code="ex.code" lang="bash" :title="`示例 ${i + 1}`" />
        </div>
      </section>

      <section v-if="command.pitfalls.length" class="detail-block">
        <h2 class="block-title">容易踩的坑</h2>
        <ul class="note-list">
          <li v-for="(p, i) in command.pitfalls" :key="i">{{ p }}</li>
        </ul>
      </section>

      <section v-if="relatedCommands.length" class="detail-block">
        <h2 class="block-title">顺带看看</h2>
        <div class="related-chips">
          <RouterLink
            v-for="r in relatedCommands"
            :key="r.id"
            class="chip chip--cmd"
            :to="`/commands/${tool.id}/${r.id}`"
          >
            <code>{{ r.name }}</code>
            <span>{{ r.tagline }}</span>
          </RouterLink>
        </div>
      </section>

      <section v-if="command.docs.length" class="detail-block">
        <h2 class="block-title">官方文档</h2>
        <ul class="doc-links">
          <li v-for="d in command.docs" :key="d.url">
            <a :href="d.url" target="_blank" rel="noopener noreferrer">{{ d.label }}</a>
            <span>{{ d.url }}</span>
          </li>
        </ul>
      </section>

      <nav class="detail-pager">
        <RouterLink v-if="prev" class="pager-link" :to="`/commands/${tool.id}/${prev.id}`">
          <span>← 上一条</span>
          <strong>{{ prev.name }}</strong>
        </RouterLink>
        <span v-else class="pager-ghost"></span>
        <RouterLink v-if="next" class="pager-link pager-link--next" :to="`/commands/${tool.id}/${next.id}`">
          <span>下一条 →</span>
          <strong>{{ next.name }}</strong>
        </RouterLink>
      </nav>
    </template>

    <div v-else class="empty">
      <strong>没有找到这条命令</strong>
      <p>可能是链接拼错了，或者数据还没生成。</p>
      <div class="empty-actions">
        <RouterLink class="btn" to="/commands">回到命令速查</RouterLink>
      </div>
    </div>
  </div>
</template>