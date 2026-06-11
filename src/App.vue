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
  NSpace,
  NText,
  NAlert,
  darkTheme,
  zhCN,
  dateZhCN,
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

const theme = computed(() => (appStore.isDark ? darkTheme : null))
</script>

<template>
  <NConfigProvider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
    <NLayout has-sider position="absolute">
      <!-- 侧边栏 -->
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
            <NSpace align="center">
              <NButton
                text
                @click="appStore.toggleSidebar"
                style="font-size: 20px"
              >
                ☰
              </NButton>
              <NText strong style="font-size: 16px">{{ pageTitle }}</NText>
            </NSpace>
            <NButton
              text
              @click="appStore.toggleTheme"
              style="font-size: 18px"
            >
              {{ appStore.isDark ? '☀️' : '🌙' }}
            </NButton>
          </div>
        </NLayoutHeader>

        <!-- 数据库错误提示 -->
        <NAlert
          v-if="dbStore.initError"
          type="error"
          :bordered="false"
          closable
          style="margin: 12px 24px 0"
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
/* 全局样式 */
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
}

.page-content {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
