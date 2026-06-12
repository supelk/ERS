<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  NLayout,
  NLayoutHeader,
  NLayoutSider,
  NLayoutContent,
  NConfigProvider,
  NMessageProvider,
  NButton,
  NText,
  NAlert,
  zhCN,
  dateZhCN,
  type GlobalThemeOverrides,
} from 'naive-ui'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAppStore } from '@/stores/app'
import { useDatabaseStore } from '@/stores/database'

const route = useRoute()
const appStore = useAppStore()
const dbStore = useDatabaseStore()

const pageTitle = computed(() => {
  const meta = route.meta as { title?: string }
  return meta?.title || '考试复盘'
})

// NaiveUI 主题覆盖
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#1e272e',
    primaryColorHover: '#2d3436',
    primaryColorPressed: '#000000',
    primaryColorSuppl: '#1e272e',
    successColor: '#00b894',
    warningColor: '#fdcb6e',
    errorColor: '#d63031',
    infoColor: '#0984e3',
    borderRadius: '4px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  Button: {
    borderRadiusMedium: '4px',
  },
  Card: {
    borderRadius: '8px',
    borderColor: '#dfe6e9',
  },
  Tag: {
    borderRadius: '4px',
  },
  DataTable: {
    borderRadius: '8px',
    thColor: '#f0ede8',
  },
  Progress: {
    borderRadius: '3px',
  },
  Layout: {
    headerColor: '#ffffff',
    siderColor: '#1e272e',
  },
  Menu: {
    itemColor: '#1e272e',
    itemTextColor: '#b2bec3',
    itemColorActive: '#2d3436',
    itemTextColorActive: '#fdcb6e',
    itemIconColor: '#636e72',
    itemIconColorActive: '#fdcb6e',
    itemColorHover: '#2d3436',
    itemTextColorHover: '#dfe6e9',
  },
}

const theme = computed(() => null) // 暂不支持 dark mode，用自定义主题覆盖
</script>

<template>
  <NConfigProvider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <NLayout has-sider position="absolute">
      <!-- 墨色侧边栏 -->
      <NLayoutSider
        bordered
        :collapsed="appStore.sidebarCollapsed"
        collapse-mode="width"
        :collapsed-width="64"
        :width="220"
        :native-scrollbar="false"
      >
        <AppSidebar />
      </NLayoutSider>

      <!-- 主内容区 -->
      <NLayout>
        <!-- 顶栏 -->
        <NLayoutHeader bordered position="static">
          <div class="header-content">
            <div class="header-left">
              <NButton
                text
                @click="appStore.toggleSidebar"
                style="font-size: 20px; color: var(--ink)"
              >
                ☰
              </NButton>
              <NText strong class="header-title">{{ pageTitle }}</NText>
            </div>
            <NButton
              text
              @click="appStore.toggleTheme"
              style="font-size: 18px"
            >
              {{ appStore.isDark ? '☀️' : '🌙' }}
            </NButton>
          </div>
        </NLayoutHeader>

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

        <!-- 页面内容 -->
        <NLayoutContent :native-scrollbar="true">
          <div class="page-content">
            <NMessageProvider>
              <router-view />
            </NMessageProvider>
          </div>
        </NLayoutContent>
      </NLayout>
    </NLayout>
  </NConfigProvider>
</template>

<style>
@import '@/styles/theme.css';
</style>

<style scoped>
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-title {
  font-size: 16px;
  color: var(--ink);
  font-family: var(--font-display);
  letter-spacing: 0.5px;
}
.page-content {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
