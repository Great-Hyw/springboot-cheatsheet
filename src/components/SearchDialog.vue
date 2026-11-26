<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useSearch } from '../composables/useSearch'

const { open, query, results, flatResults, closeSearch } = useSearch()
const inputRef = ref(null)
const activeIndex = ref(0)

const groups = computed(() => {
  const list = []
  if (results.value.annotations.length) {
    list.push({ type: 'annotation', label: '注解', rows: results.value.annotations })
  }
  if (results.value.knowledge.length) {
    list.push({ type: 'knowledge', label: '知识文章', rows: results.value.knowledge })
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

function go(item) {
  closeSearch()
  // 用 location.hash 跳转，避免在弹层里依赖 router 实例
  window.location.hash = item.type === 'annotation' ? `#/annotations/${item.id}` : `#/knowledge/${item.id}`
}

function indexOfRow(type, rowIndex) {
  let base = 0
  for (const g of groups.value) {
    if (g.type === type) return base + rowIndex
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
            placeholder="搜注解名、包名、关键词或知识主题…"
            autocomplete="off"
            spellcheck="false"
            aria-label="搜索关键词"
            @keydown="onInputKeydown"
          />
          <span class="search-esc">ESC</span>
        </div>

        <div class="search-body">
          <template v-if="flatResults.length">
            <template v-for="group in groups" :key="group.type">
              <p class="search-group-label">{{ group.label }}</p>
              <a
                v-for="(row, i) in group.rows"
                :key="row.item.id"
                class="search-item"
                :class="{ active: activeIndex === indexOfRow(group.type, i) }"
                :href="row.item.type === 'annotation' ? `#/annotations/${row.item.id}` : `#/knowledge/${row.item.id}`"
                @click.prevent="go(row.item)"
                @mouseenter="activeIndex = indexOfRow(group.type, i)"
              >
                <span class="search-item__icon">{{ group.type === 'annotation' ? '@' : '文' }}</span>
                <span class="search-item__body">
                  <span class="search-item__title">{{ group.type === 'annotation' ? row.item.title.replace(/^@/, '') : row.item.title }}</span>
                  <span class="search-item__sub">{{ row.item.subtitle }}</span>
                </span>
                <span class="search-item__type">{{ group.type === 'annotation' ? '注解' : '知识' }}</span>
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