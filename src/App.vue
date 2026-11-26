<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import SearchDialog from './components/SearchDialog.vue'
import SiteFooter from './components/SiteFooter.vue'
import { useSearch } from './composables/useSearch'

const route = useRoute()
const sidebarOpen = ref(false)
const showTop = ref(false)
const { openSearch } = useSearch()

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)

function isTyping(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

function onKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    openSearch()
    return
  }
  if (e.key === '/' && !isTyping(e.target)) {
    e.preventDefault()
    openSearch()
  }
}

function onScroll() {
  showTop.value = window.scrollY > 640
}

function backToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 不能用 href="#main"：hash 路由会把 #main 当成路由路径。这里手动聚焦正文。
function skipToMain() {
  const main = document.getElementById('main')
  if (main) {
    main.focus({ preventScroll: true })
    main.scrollIntoView({ block: 'start' })
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="skipToMain">跳到正文</a>
  <div class="app-shell">
    <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />
    <div class="app-body">
      <AppSidebar :open="sidebarOpen" />
      <button
        v-if="sidebarOpen"
        class="sidebar-overlay"
        type="button"
        aria-label="关闭导航菜单"
        @click="sidebarOpen = false"
      ></button>
      <main id="main" class="app-main" tabindex="-1">
        <RouterView />
      </main>
    </div>
    <SiteFooter />
    <SearchDialog />
    <button
      v-show="showTop"
      class="to-top show"
      type="button"
      aria-label="回到顶部"
      title="回到顶部"
      @click="backToTop"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>