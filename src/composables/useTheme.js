import { computed, ref } from 'vue'

const STORAGE_KEY = 'sb-theme'
const isDark = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
)

function apply(dark) {
  isDark.value = dark
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {
    /* 隐私模式下写不了 localStorage，忽略 */
  }
}

export function useTheme() {
  const label = computed(() => (isDark.value ? '切换到浅色模式' : '切换到深色模式'))
  return {
    isDark,
    label,
    toggleTheme() {
      apply(!isDark.value)
    },
  }
}