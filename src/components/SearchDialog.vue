<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useSearch } from '../composables/useSearch'

const { open, query, results, flatResults, closeSearch } = useSearch()
const inputRef = ref(null)
const activeIndex = ref(0)

const groups = computed(() => {
  const list = []
  if (results.value.annotations.length) {
    list.push({ key: 'annotation', type: 'annotation', label: '注解', rows: results.value.annotations })
  }
  if (results.value.knowledge.length) {
    list.push({ key: 'knowledge', type: 'knowledge', label: '知识文章', rows: results.value.knowledge })
  }
  if (results.value.topics.length) {
    list.push({ key: 'topic', type: 'topic', label: '实战专题', rows: results.value.topics })
  }
  if (results.value.linux.length) {
    list.push({ key: 'linux', type: 'command', tool: 'linux', label: 'Linux 命令', rows: results.value.linux })
  }
  if (results.value.git.length) {
    list.push({ key: 'git', type: 'command', tool: 'git', label: 'Git 命令', rows: results.value.git })
  }
  return list
})

watch(open, async (isOpen) => {
  if (!isOpen) return
  activeIndex.value = 0
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
})

watch(query, () => {
  activeIndex.value = 0
})

function move(delta) {
  const n = flatResults.value.length
  if (!n) return
  activeIndex.value = (activeIndex.value + delta + n) % n
}

function onInputKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeSearch()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    move(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = flatResults.value[activeIndex.value]
    if (item) go(item)
  }
}

function pathOf(item) {
  if (item.type === 'annotation') return `#/annotations/${item.id}`
  if (item.type === 'knowledge') return `#/knowledge/${item.id}`
  if (item.type === 'topic') return `#/topics/${item.topic}/${item.id}`
  return `#/commands/${item.tool}/${item.id}`
}

function go(item) {
  closeSearch()
  // 用 location.hash 跳转，避免在弹层里依赖 router 实例
  window.location.hash = pathOf(item)
}

function hrefOf(item) {
  return pathOf(item)
}

function iconOf(item) {
  if (item.type === 'annotation') return '@'
  if (item.type === 'knowledge') return '文'
  if (item.type === 'topic') return '专'
  return item.tool === 'linux' ? 'L' : 'G'
}

function titleOf(item) {
  return item.type === 'annotation' ? item.title.replace(/^@/, '') : item.title
}

function badgeOf(item) {
  if (item.type === 'annotation') return '注解'
  if (item.type === 'knowledge') return '知识'
  if (item.type === 'topic') return '专题'
  return item.toolLabel || item.tool
}

function indexOfRow(key, rowIndex) {
  let base = 0
  for (const g of groups.value) {
    if (g.key === key) return base + rowIndex
    base += g.rows.length
  }
  return -1
}

function closeOnOverlay(e) {
  if (e.target === e.currentTarget) closeSearch()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="search-overlay" @click="closeOnOverlay" @keydown.esc="closeSearch">
      <div class="search-panel" role="dialog" aria-modal="true" aria-label="搜索">
        <div class="search-input-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            type="search"
            placeholder="搜注解名、包名、专题、命令或知识主题…"
            autocomplete="off"
            spellcheck="false"
            aria-label="搜索关键词"
            @keydown="onInputKeydown"
          />
          <span class="search-esc">ESC</span>
        </div>

        <div class="search-body">
          <template v-if="flatResults.length">
            <template v-for="group in groups" :key="group.key">
              <p class="search-group-label">{{ group.label }}</p>
              <a
                v-for="(row, i) in group.rows"
                :key="row.item.id"
                class="search-item"
                :class="{ active: activeIndex === indexOfRow(group.key, i) }"
                :href="hrefOf(row.item)"
                @click.prevent="go(row.item)"
                @mouseenter="activeIndex = indexOfRow(group.key, i)"
              >
                <span class="search-item__icon" :class="{ 'search-item__icon--cmd': group.type === 'command', 'search-item__icon--topic': group.type === 'topic' }">{{ iconOf(row.item) }}</span>
                <span class="search-item__body">
                  <span class="search-item__title">{{ titleOf(row.item) }}</span>
                  <span class="search-item__sub">{{ row.item.subtitle }}</span>
                </span>
                <span class="search-item__type">{{ badgeOf(row.item) }}</span>
              </a>
            </template>
          </template>
          <div v-else class="search-empty">
            <strong>没有找到「{{ query }}」</strong>
            换个关键词试试：注解名（如 <code>@Transactional</code>）、中文（如「事务」）或包名。
          </div>
        </div>

        <div class="search-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> 选择</span>
          <span><kbd>Enter</kbd> 打开</span>
          <span><kbd>Esc</kbd> 关闭</span>
          <span style="margin-left: auto">共 {{ flatResults.length }} 条结果</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>