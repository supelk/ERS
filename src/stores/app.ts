import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Theme = 'light' | 'dark'

const SIDEBAR_KEY = 'ers-sidebar-collapsed'

function loadSidebarState(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    if (stored !== null) return stored === 'true'
  } catch { /* localStorage unavailable */ }
  return false
}

function saveSidebarState(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed))
  } catch { /* localStorage unavailable */ }
}

export const useAppStore = defineStore('app', () => {
  // ============================================================
  // 侧边栏状态
  // ============================================================
  const sidebarCollapsed = ref(loadSidebarState())
  const drawerVisible = ref(false)       // 移动端浮层抽屉
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

  // 断点判定
  const isMobile = computed(() => windowWidth.value < 768)
  const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024)
  const isDesktop = computed(() => windowWidth.value >= 1200)

  function setSidebarCollapsed(value: boolean) {
    sidebarCollapsed.value = value
    saveSidebarState(value)
  }

  function toggleSidebar() {
    setSidebarCollapsed(!sidebarCollapsed.value)
  }

  function openDrawer() {
    drawerVisible.value = true
  }

  function closeDrawer() {
    drawerVisible.value = false
  }

  function toggleDrawer() {
    drawerVisible.value = !drawerVisible.value
  }

  function updateWindowWidth(width: number) {
    windowWidth.value = width
  }

  // 跨越断点时自动调整侧边栏
  function applyBreakpointAuto(prevWidth: number, newWidth: number) {
    // 进入移动端（<768）：隐藏侧边栏，关闭抽屉
    if (prevWidth >= 768 && newWidth < 768) {
      sidebarCollapsed.value = true
      drawerVisible.value = false
      return
    }
    // 离开移动端进入平板（768-1023）：自动折叠
    if (prevWidth < 768 && newWidth >= 768 && newWidth < 1024) {
      sidebarCollapsed.value = true
      return
    }
    // 进入平板区域（≥768 → <1024）：自动折叠
    if (prevWidth >= 1024 && newWidth < 1024) {
      sidebarCollapsed.value = true
      return
    }
    // 进入桌面端（≥1200）：自动展开
    if (prevWidth < 1200 && newWidth >= 1200) {
      sidebarCollapsed.value = false
      return
    }
  }

  // ============================================================
  // 主题（保留）
  // ============================================================
  const theme = ref<Theme>(
    (() => {
      try { return (localStorage.getItem('ers-theme') as Theme) || 'light' }
      catch { return 'light' }
    })()
  )

  const isDark = computed(() => theme.value === 'dark')

  function setTheme(t: Theme) {
    theme.value = t
    try { localStorage.setItem('ers-theme', t) } catch { /* */ }
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  return {
    sidebarCollapsed,
    drawerVisible,
    windowWidth,
    isMobile,
    isTablet,
    isDesktop,
    setSidebarCollapsed,
    toggleSidebar,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    updateWindowWidth,
    applyBreakpointAuto,
    theme,
    isDark,
    setTheme,
    toggleTheme,
  }
})
