<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  activeId: { type: String, default: '' },
})

function go(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <aside v-if="items.length" class="doc-toc" aria-label="本页目录">
    <p>本页目录</p>
    <a
      v-for="h in items"
      :key="h.id"
      :href="`#${h.id}`"
      :class="{ active: activeId === h.id, lv3: h.level === 3 }"
      @click.prevent="go(h.id)"
    >
      {{ h.text }}
    </a>
  </aside>
</template>