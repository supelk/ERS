<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import {
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NConfigProvider,
  NMessageProvider,
  NAlert,
  NButton,
  zhCN,
  dateZhCN,
  type GlobalThemeOverrides,
} from 'naive-ui'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAppStore } from '@/stores/app'
import { useDatabaseStore } from '@/stores/database'

const appStore = useAppStore()
const dbStore = useDatabaseStore()

// NaiveUI 主题覆盖 — 现代极简办公风
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#5B8DEF',
    primaryColorHover: '#7BA3F3',
    primaryColorPressed: '#4A7EDF',
    primaryColorSuppl: '#5B8DEF',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    errorColor: '#DC2626',
    infoColor: '#3B82F6',
    borderRadius: '8px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusSmall: '6px',
    borderRadiusLarge: '10px',
  },
  Card: {
    borderRadius: '10px',
    borderColor: '#F3F4F6',
  },
  Tag: {
    borderRadius: '6px',
  },
  DataTable: {
    borderRadius: '10px',
    thColor: '#F5F4F1',
    tdColor: '#FFFFFF',
  },
  Progress: {
    borderRadius: '4px',
    fillColor: '#5B8DEF',
    railColor: '#F3F4F6',
  },
  Layout: {
    siderColor: '#FAFAFA',
  },
  Menu: {
    itemColor: '#FAFAFA',
    itemTextColor: '#6B7280',
    itemColorActive: '#EEF1F6',
    itemTextColorActive: '#5B8DEF',
    itemIconColor: '#9CA3AF',
    itemIconColorActive: '#5B8DEF',
    itemColorHover: '#F0F2F5',
    itemTextColorHover: '#1F2937',
    borderRadius: '8px',
  },
  Input: {
    borderRadius: '6px',
    borderColor: '#E5E7EB',
  },
  Select: {
    borderRadius: '6px',
  },
}

// ============================================================
// 响应式断点检测
// ============================================================
let resizeTimer: ReturnType<typeof setTimeout> | null = null

function handleResize() {
  // debounce 避免频繁触发
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    const prev = appStore.windowWidth
    const next = window.innerWidth
    appStore.updateWindowWidth(next)
    appStore.applyBreakpointAuto(prev, next)
  }, 100)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  // 初始化时应用当前断点
  const w = window.innerWidth
  appStore.updateWindowWidth(w)
  if (w < 768) {
    appStore.applyBreakpointAuto(1200, w) // 模拟从桌面进入
  } else if (w < 1024) {
    appStore.applyBreakpointAuto(1200, w)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})

const theme = null
</script>

<template>
  <NConfigProvider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <!-- ============================================================
         桌面/平板模式：正常侧边栏 + 主内容
         ============================================================ -->
    <NLayout v-if="!appStore.isMobile" has-sider position="absolute">
      <NLayoutSider
        bordered
        :collapsed="appStore.sidebarCollapsed"
        collapse-mode="width"
        :collapsed-width="64"
        :width="240"
        :native-scrollbar="false"
        show-trigger="bar"
        :style="{ transition: 'width 0.3s ease' }"
      >
        <AppSidebar />
      </NLayoutSider>

      <NLayout :style="{ transition: 'all 0.3s ease' }">
        <!-- 数据库错误 -->
        <NAlert
          v-if="dbStore.initError"
          type="error"
          :bordered="false"
          closable
          style="margin: 12px 24px 0; border-radius: 8px"
        >
          数据库初始化失败：{{ dbStore.initError }}
        </NAlert>

        <NLayoutContent :native-scrollbar="true" style="overflow-x: auto">
          <div class="page-content">
            <NMessageProvider>
              <router-view />
            </NMessageProvider>
          </div>
        </NLayoutContent>
      </NLayout>
    </NLayout>

    <!-- ============================================================
         移动端模式：侧边栏隐藏 + 抽屉浮层
         ============================================================ -->
    <NLayout v-else position="absolute">
      <!-- 移动端主内容 -->
      <NLayoutContent :native-scrollbar="true" style="overflow-x: auto">
        <!-- 移动端顶栏（仅菜单按钮） -->
        <div class="mobile-topbar">
          <NButton text class="mobile-menu-btn" @click="appStore.toggleDrawer()">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </NButton>
          <span class="mobile-title">考试复盘系统</span>
        </div>

        <NAlert
          v-if="dbStore.initError"
          type="error"
          :bordered="false"
          closable
          style="margin: 8px 12px 0; border-radius: 8px; font-size: 13px"
        >
          数据库初始化失败：{{ dbStore.initError }}
        </NAlert>

        <div class="page-content-mobile">
          <NMessageProvider>
            <router-view />
          </NMessageProvider>
        </div>
      </NLayoutContent>

      <!-- 左侧抽屉浮层 -->
      <transition name="drawer-slide">
        <div
          v-if="appStore.drawerVisible"
          class="drawer-overlay"
          @click.self="appStore.closeDrawer()"
        >
          <div class="drawer-panel">
            <AppSidebar />
          </div>
        </div>
      </transition>
    </NLayout>
  </NConfigProvider>
</template>

<style>
@import '@/styles/theme.css';
</style>

<style scoped>
/* ============================================================
   桌面/平板：页面内容
   ============================================================ */
.page-content {
  padding: 24px;
  min-width: 1200px;
  margin: 0 auto;
}

/* ============================================================
   移动端顶栏
   ============================================================ */
.mobile-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 12px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 10;
}
.mobile-menu-btn {
  color: var(--text-primary);
  flex-shrink: 0;
}
.mobile-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
}

/* 移动端内容 */
.page-content-mobile {
  padding: 12px;
  overflow-x: auto;
}

/* ============================================================
   抽屉浮层（移动端）
   ============================================================ */
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
  /* backdrop subtle */
}
.drawer-panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 260px;
  background: var(--bg-sidebar);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
  border-right: 1px solid var(--border-light);
}

/* 抽屉滑入/滑出过渡 */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-slide-enter-active .drawer-panel,
.drawer-slide-leave-active .drawer-panel {
  transition: transform 0.3s ease;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
}
.drawer-slide-enter-from .drawer-panel {
  transform: translateX(-100%);
}
.drawer-slide-leave-to .drawer-panel {
  transform: translateX(-100%);
}
</style>
