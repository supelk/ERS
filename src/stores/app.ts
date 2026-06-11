import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Theme = 'light' | 'dark'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const theme = ref<Theme>(
    (localStorage.getItem('ers-theme') as Theme) || 'light'
  )

  const isDark = computed(() => theme.value === 'dark')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setTheme(t: Theme) {
    theme.value = t
    localStorage.setItem('ers-theme', t)
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  return { sidebarCollapsed, theme, isDark, toggleSidebar, setTheme, toggleTheme }
})
