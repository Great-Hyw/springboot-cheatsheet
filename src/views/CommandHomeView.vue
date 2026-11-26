<script setup>
import { computed } from 'vue'
import {
  COMMAND_TOOLS,
  commandModuleCounts,
  commandStats,
  featuredCommands,
  getToolModules,
} from '../data/commands'

const tools = computed(() =>
  COMMAND_TOOLS.map((t) => ({
    ...t,
    modules: getToolModules(t.id),
    count: commandStats.byTool[t.id] || 0,
  })),
)
</script>

<template>
  <div class="main-inner main-inner--wide">
    <section class="cmd-hero">
      <span class="eyebrow">两个独立模块 · 分开收录、分开检索</span>
      <h1>Linux 与 Git，<br />各有一本<em>小抄</em>。</h1>
      <p class="hero-sub">
        Linux 系统命令和 Git 版本控制是两件事，这里也给它们两个独立入口：各查各的，不混在一起。每条写清楚「什么时候用、真实选项、能直接敲的例子、容易踩的坑」，并附官方 man / git 文档出处。
      </p>
      <div class="hero-stats">
        <div class="hero-stat">
          <strong>{{ commandStats.total }}</strong>
          <span>条命令卡片</span>
        </div>
        <div class="hero-stat">
          <strong>{{ tools.length }}</strong>
          <span>个独立模块</span>
        </div>
        <div class="hero-stat">
          <strong>{{ commandStats.modules }}</strong>
          <span>组使用场景</span>
        </div>
        <div class="hero-stat">
          <strong>{{ commandStats.byTool.linux || 0 }} / {{ commandStats.byTool.git || 0 }}</strong>
          <span>Linux / Git 条数</span>
        </div>
      </div>
    </section>

    <section v-for="tool in tools" :key="tool.id" class="section cmd-tool-section">
      <div class="cmd-tool-head">
        <span class="cmd-tool-badge" :style="{ background: tool.color }">{{ tool.icon }}</span>
        <div class="cmd-tool-head__text">
          <h2 class="section-title">
            {{ tool.label }}
            <small>{{ tool.count }} 条 · {{ tool.modules.length }} 个模块</small>
          </h2>
          <p>{{ tool.desc }}</p>
        </div>
        <RouterLink class="btn btn-primary cmd-tool-enter" :to="`/commands/${tool.id}`">
          进入 {{ tool.short }} 速查 →
        </RouterLink>
      </div>

      <div class="cmd-mod-grid">
        <RouterLink
          v-for="m in tool.modules"
          :key="m.id"
          class="cmd-mod-card"
          :to="{ path: `/commands/${tool.id}`, query: { module: m.id } }"
        >
          <div class="cmd-mod-card__top">
            <strong>{{ m.label }}</strong>
            <span>{{ commandModuleCounts.get(m.id) || 0 }} 条</span>
          </div>
          <p>{{ m.desc }}</p>
        </RouterLink>
      </div>

      <div v-if="featuredCommands[tool.id].length" class="cmd-feat">
        <p class="cmd-feat__label">新手最常用</p>
        <div class="cmd-feat__list">
          <RouterLink
            v-for="c in featuredCommands[tool.id]"
            :key="c.id"
            class="cmd-feat-card"
            :to="`/commands/${tool.id}/${c.id}`"
          >
            <code>{{ c.name }}</code>
            <span>{{ c.tagline }}</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="section" style="margin-bottom: 0">
      <div class="trust-banner trust-banner--cmd">
        <strong>两个模块，边界写死</strong>
        <p>
          Linux 文件只收 Linux 系统命令，Git 文件只收 Git 命令；模块 id、条目 id、相关推荐都带各自前缀，页面也分成两个入口。参数和示例都对照官方文档写过，再由独立核查员复核，不把两边的写法混在一起。
        </p>
        <RouterLink to="/about">看核查方法 →</RouterLink>
      </div>
    </section>
  </div>
</template>