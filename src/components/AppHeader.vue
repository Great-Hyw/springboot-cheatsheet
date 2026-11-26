<script setup>
import { useFavorites } from '../composables/useFavorites'
import { useSearch } from '../composables/useSearch'
import { useTheme } from '../composables/useTheme'

defineEmits(['toggle-sidebar'])

const { total } = useFavorites()
const { openSearch } = useSearch()
const { isDark, label, toggleTheme } = useTheme()
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <button class="icon-btn menu-btn" aria-label="打开导航菜单" @click="$emit('toggle-sidebar')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
        </svg>
      </button>

      <RouterLink to="/" class="brand" aria-label="SpringBoot 速查首页">
        <span class="brand-mark">SB</span>
        <span class="brand-text">
          <strong>SpringBoot 速查</strong>
          <small>注解 · 知识</small>
        </span>
        <span class="brand-badge">3.5</span>
      </RouterLink>

      <nav class="top-nav" aria-label="主导航">
        <RouterLink to="/annotations">注解速查</RouterLink>
        <RouterLink to="/knowledge">知识库</RouterLink>
        <RouterLink to="/favorites">
          收藏<span v-if="total" class="nav-count">{{ total }}</span>
        </RouterLink>
      </nav>

      <div class="header-actions">
        <button class="search-trigger" type="button" aria-label="打开搜索" @click="openSearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span class="search-trigger__text">搜索注解 / 知识</span>
          <kbd>⌘K</kbd>
        </button>

        <button class="icon-btn" type="button" :aria-label="label" :title="label" @click="toggleTheme">
          <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke-linecap="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>