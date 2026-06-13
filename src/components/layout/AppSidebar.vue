<script setup lang="ts">
import { h, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NMenu, NIcon, NButton, type MenuOption } from 'naive-ui'
import { useAppStore } from '@/stores/app'

// ----------------------------------------------------------------
// 内联 SVG 图标（线性风格）
// ----------------------------------------------------------------
const ListIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2' }),
  h('path', { d: 'M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z' }),
  h('line', { x1: 9, y1: 12, x2: 15, y2: 12 }),
  h('line', { x1: 9, y1: 16, x2: 15, y2: 16 }),
])

const AddIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('line', { x1: 12, y1: 8, x2: 12, y2: 16 }),
  h('line', { x1: 8, y1: 12, x2: 16, y2: 12 }),
])

const ChartIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }),
  h('polyline', { points: '17 6 23 6 23 12' }),
])

const FlagIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }),
  h('line', { x1: 4, y1: 22, x2: 4, y2: 15 }),
])

const BulbIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M9 18h6' }),
  h('path', { d: 'M10 22h4' }),
  h('path', { d: 'M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14' }),
])

const SettingsIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: 12, cy: 12, r: 3 }),
  h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }),
])

// 折叠/展开箭头图标
const CollapseIcon = () => h('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('polyline', { points: '15 18 9 12 15 6' }),
])

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const menuOptions: MenuOption[] = [
  { label: '考试记录', key: '/exams', icon: () => h(NIcon, null, { default: ListIcon }) },
  { label: '录入考试', key: '/exams/new', icon: () => h(NIcon, null, { default: AddIcon }) },
  { label: '趋势分析', key: '/trends', icon: () => h(NIcon, null, { default: ChartIcon }) },
  { label: '目标与计划', key: '/goals', icon: () => h(NIcon, null, { default: FlagIcon }) },
  { label: 'AI 助手', key: '/ai', icon: () => h(NIcon, null, { default: BulbIcon }) },
  { label: '设置', key: '/settings', icon: () => h(NIcon, null, { default: SettingsIcon }) },
]

const activeKey = computed(() => route.path)

function handleMenuSelect(key: string) {
  router.push(key)
  // 移动端抽屉模式下，选择菜单后自动关闭
  if (appStore.isMobile) {
    appStore.closeDrawer()
  }
}
</script>

<template>
  <div class="sidebar-container">
    <!-- 品牌区 + 折叠按钮 -->
    <div class="sidebar-brand">
      <div class="brand-left">
        <svg class="brand-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <transition name="fade-text">
          <span v-show="!appStore.sidebarCollapsed" class="brand-text">考试复盘系统</span>
        </transition>
      </div>
      <NButton
        text
        class="collapse-btn"
        :class="{ rotated: appStore.sidebarCollapsed }"
        @click="appStore.toggleSidebar()"
      >
        <CollapseIcon />
      </NButton>
    </div>

    <!-- 分割线 -->
    <div class="sidebar-divider" />

    <!-- 菜单 -->
    <NMenu
      :value="activeKey"
      :options="menuOptions"
      :collapsed="appStore.sidebarCollapsed"
      :collapsed-icon-size="20"
      @update:value="handleMenuSelect"
    />

    <!-- 底部版本（仅展开态可见） -->
    <transition name="fade-text">
      <div v-show="!appStore.sidebarCollapsed" class="sidebar-footer">
        <span class="version-text">v0.1</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-sidebar);
  overflow: hidden;
}

/* 品牌区 */
.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 14px 14px;
  min-height: 56px;
}
.brand-left {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}
.brand-icon {
  color: var(--primary);
  flex-shrink: 0;
}
.brand-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
  letter-spacing: 1px;
  white-space: nowrap;
}

/* 折叠按钮 */
.collapse-btn {
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform 0.3s ease, color 0.15s;
}
.collapse-btn:hover {
  color: var(--text-primary);
}
.collapse-btn.rotated {
  transform: rotate(180deg);
}

/* 分割线 */
.sidebar-divider {
  height: 1px;
  margin: 0 14px 8px;
  background: linear-gradient(to right, transparent, var(--border-light), transparent);
}

/* 菜单 — NMenu collapsed 自带 tooltip */
:deep(.n-menu) {
  flex: 1;
  padding: 4px 6px;
}

/* 底部版本 */
.sidebar-footer {
  padding: 10px 14px;
  border-top: 1px solid var(--border-light);
  text-align: center;
}
.version-text {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
}

/* 文字淡入淡出过渡 */
.fade-text-enter-active,
.fade-text-leave-active {
  transition: opacity 0.25s ease;
}
.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
}
</style>
