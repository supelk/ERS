<script setup lang="ts">
import { ref } from 'vue'
import {
  NCard,
  NButton,
  NDivider,
  NSwitch,
  NText,
  NPopconfirm,
  useMessage,
} from 'naive-ui'
import { useAppStore } from '@/stores/app'
import { useDatabaseStore } from '@/stores/database'
import { useExamStore } from '@/stores/exam'
import { useTaskStore } from '@/stores/task'

const message = useMessage()
const appStore = useAppStore()
const dbStore = useDatabaseStore()
const examStore = useExamStore()
const taskStore = useTaskStore()

const clearingData = ref(false)

async function handleClearAllData() {
  clearingData.value = true
  try {
    const db = dbStore.getDb()
    await db.execute('DELETE FROM practice_tasks')
    await db.execute('DELETE FROM exam_section_records')
    await db.execute('DELETE FROM exam_records')
    await examStore.fetchExams()
    await taskStore.fetchTasks()
    message.success('所有数据已清空')
  } catch (e) {
    message.error('清空失败: ' + String(e))
  } finally {
    clearingData.value = false
  }
}
</script>

<template>
  <div>
    <h2 style="margin: 0 0 16px">设置</h2>

    <!-- 外观 -->
    <NCard title="🎨 外观" size="small" style="margin-bottom: 16px">
      <div class="setting-row">
        <NText>深色模式</NText>
        <NSwitch :value="appStore.isDark" @update:value="appStore.toggleTheme()" />
      </div>
    </NCard>

    <!-- 数据管理 -->
    <NCard title="💾 数据管理" size="small" style="margin-bottom: 16px">
      <div class="setting-row">
        <div>
          <NText strong>清空所有数据</NText>
          <br />
          <NText depth="3" style="font-size: 12px">删除所有考试记录、板块数据和练习任务。此操作不可撤销。</NText>
        </div>
        <NPopconfirm @positive-click="handleClearAllData">
          <template #trigger>
            <NButton type="error" :loading="clearingData">清空数据</NButton>
          </template>
          确认清空所有数据？
        </NPopconfirm>
      </div>
    </NCard>

    <!-- 快捷键 -->
    <NCard title="⌨️ 快捷键" size="small" style="margin-bottom: 16px">
      <div class="shortcut-list">
        <div class="shortcut-item">
          <NText>折叠/展开侧边栏</NText>
          <NText depth="3">点击顶栏 ☰ 按钮</NText>
        </div>
        <div class="shortcut-item">
          <NText>切换暗色模式</NText>
          <NText depth="3">点击顶栏 🌙 / ☀️ 按钮</NText>
        </div>
      </div>
    </NCard>

    <!-- 关于 -->
    <NCard title="ℹ️ 关于" size="small">
      <div class="about-info">
        <p><b>考试复盘闭环系统</b> v0.1.0</p>
        <p style="color: #999; font-size: 13px">
          帮你告别 Excel，高效沉淀每次考试的成长数据。<br />
          从录入 → 分析 → 目标 → 计划，形成完整闭环。
        </p>
        <NDivider />
        <p style="color: #999; font-size: 12px">
          技术栈：Tauri v2 + Vue 3 + NaiveUI + SQLite
        </p>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}
.about-info p {
  margin: 4px 0;
}
</style>
