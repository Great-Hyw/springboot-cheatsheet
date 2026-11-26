<script setup>
import { computed, ref } from 'vue'
import { getAnnotation, getKnowledge, knowledgeCategory } from '../data'
import { useFavorites } from '../composables/useFavorites'

const { favAnnotations, favKnowledge, toggleFav } = useFavorites()
const tab = ref('annotation')

const anns = computed(() => favAnnotations.value.map((id) => getAnnotation(id)).filter(Boolean))
const kns = computed(() => favKnowledge.value.map((id) => getKnowledge(id)).filter(Boolean))

const tabCount = computed(() => (tab.value === 'annotation' ? anns.value.length : kns.value.length))
const total = computed(() => anns.value.length + kns.value.length)

function remove(type, id) {
  toggleFav(type, id)
}
</script>

<template>
  <div class="main-inner">
    <div class="page-head">
      <span class="eyebrow">Favorites</span>
      <h1 class="page-title">我的收藏</h1>
      <p class="page-desc">收藏只保存在当前浏览器的 localStorage 里，不上传任何服务器。换设备或清缓存会丢失。</p>
    </div>

    <div v-if="total" class="fav-tabs" role="tablist">
      <button
        class="filter-chip"
        :class="{ active: tab === 'annotation' }"
        type="button"
        role="tab"
        :aria-selected="tab === 'annotation'"
        @click="tab = 'annotation'"
      >
        注解 {{ anns.length }}
      </button>
      <button
        class="filter-chip"
        :class="{ active: tab === 'knowledge' }"
        type="button"
        role="tab"
        :aria-selected="tab === 'knowledge'"
        @click="tab = 'knowledge'"
      >
        知识 {{ kns.length }}
      </button>
    </div>

    <template v-if="total">
      <div v-if="tab === 'annotation'" class="fav-list">
        <div v-for="a in anns" :key="a.id" class="fav-row">
          <RouterLink class="fav-row__main" :to="`/annotations/${a.id}`">
            <strong>{{ a.name }}</strong>
            <span>{{ a.tagline }}</span>
          </RouterLink>
          <button class="fav-remove" type="button" @click="remove('annotation', a.id)">移除</button>
        </div>
        <div v-if="!anns.length" class="empty-mini">还没有收藏注解。在注解详情页点右上角「收藏」即可。</div>
      </div>

      <div v-else class="fav-list">
        <div v-for="k in kns" :key="k.id" class="fav-row">
          <RouterLink class="fav-row__main" :to="`/knowledge/${k.id}`">
            <strong>{{ k.title }}</strong>
            <span>{{ knowledgeCategory(k.category).label }} · {{ k.readingMinutes }} 分钟 · {{ k.summary }}</span>
          </RouterLink>
          <button class="fav-remove" type="button" @click="remove('knowledge', k.id)">移除</button>
        </div>
        <div v-if="!kns.length" class="empty-mini">还没有收藏文章。在知识文章页点右上角「收藏」即可。</div>
      </div>
    </template>

    <div v-else class="empty-state">
      <span class="empty-icon">⭐</span>
      <h3>收藏夹是空的</h3>
      <p>在任意注解详情页或知识文章页点「收藏」，之后就能从这里快速找到。数据只存在你自己的浏览器里。</p>
      <div class="empty-actions">
        <RouterLink class="btn btn-sm btn-primary" to="/annotations">去逛逛注解</RouterLink>
        <RouterLink class="btn btn-sm" to="/knowledge">去读知识库</RouterLink>
      </div>
    </div>

    <p v-if="total" class="source-note" style="margin-top: 22px">当前收藏 {{ total }} 条。清理浏览器数据会一并清除收藏。</p>
  </div>
</template>