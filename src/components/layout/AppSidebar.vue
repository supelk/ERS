<script setup lang="ts">
import { h, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NMenu, NIcon, type MenuOption } from 'naive-ui'

// 内联 SVG 图标组件
const ListIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2' }),
  h('path', { d: 'M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z' }),
  h('line', { x1: 9, y1: 12, x2: 15, y2: 12 }),
  h('line', { x1: 9, y1: 16, x2: 15, y2: 16 }),
])

const AddIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('line', { x1: 12, y1: 8, x2: 12, y2: 16 }),
  h('line', { x1: 8, y1: 12, x2: 16, y2: 12 }),
])

const ChartIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }),
  h('polyline', { points: '17 6 23 6 23 12' }),
])

const FlagIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }),
  h('line', { x1: 4, y1: 22, x2: 4, y2: 15 }),
])

const BulbIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M9 18h6' }),
  h('path', { d: 'M10 22h4' }),
  h('path', { d: 'M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14' }),
])

const SettingsIcon = () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('circle', { cx: 12, cy: 12, r: 3 }),
  h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }),
])

const router = useRouter()
const route = useRoute()

const menuOptions: MenuOption[] = [
  { label: '考试记录', key: '/exams', icon: () => h(NIcon, null, { default: ListIcon }) },
  { label: '录入考试', key: '/exams/new', icon: () => h(NIcon, null, { default: AddIcon }) },
  { label: '趋势分析', key: '/trends', icon: () => h(NIcon, null, { default: ChartIcon }) },
  { label: '目标与计划', key: '/goals', icon: () => h(NIcon, null, { default: FlagIcon }) },
  { label: 'AI 助手', key: '/ai', icon: () => h(NIcon, null, { default: BulbIcon }) },
  { label: '设置', key: '/settings', icon: () => h(NIcon, null, { default: SettingsIcon }) },
]

const activeKey = ref(route.path)

function handleMenuSelect(key: string) {
  router.push(key)
}
</script>

<template>
  <div class="sidebar-container">
    <div class="sidebar-header">
      <span class="app-title">📊 考试复盘</span>
    </div>
    <NMenu
      :value="activeKey"
      :options="menuOptions"
      @update:value="handleMenuSelect"
    />
  </div>
</template>

<style scoped>
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-top: 8px;
}

.sidebar-header {
  padding: 16px 24px;
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color, #2080f0);
  white-space: nowrap;
}

.app-title {
  letter-spacing: 2px;
}
</style>
