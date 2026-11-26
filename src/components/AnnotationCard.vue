<script setup>
import { computed } from 'vue'
import { annotationCategory } from '../data'

const props = defineProps({
  item: { type: Object, required: true },
})

const category = computed(() => annotationCategory(props.item.category))
const visibleTags = computed(() => props.item.tags.slice(0, 2))
</script>

<template>
  <RouterLink class="ann-card" :to="`/annotations/${item.id}`">
    <div class="ann-card__top">
      <h3 class="ann-card__name">{{ item.name }}</h3>
      <span class="pill" :class="item.level === '进阶' ? 'pill--advanced' : 'pill--beginner'">{{ item.level }}</span>
    </div>
    <p class="ann-card__tagline">{{ item.tagline }}</p>
    <div class="ann-card__meta">
      <span class="cat-dot" :style="{ background: category.color }"></span>
      <span>{{ category.label }}</span>
      <span>·</span>
      <code>{{ item.package }}</code>
    </div>
    <div v-if="visibleTags.length" class="ann-card__tags">
      <span v-for="tag in visibleTags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </RouterLink>
</template>