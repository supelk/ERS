<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NButton, NSpace, NCheckbox, NText, NSpin, useMessage } from 'naive-ui'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { useExamStore } from '@/stores/exam'
import { exportToJSON, exportToCSV } from '@/composables/useImportExport'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const message = useMessage()
const examStore = useExamStore()
const loading = ref(false)
const selectedIds = ref<number[]>([])
const format = ref<'json' | 'csv'>('json')

watch(
  () => props.show,
  async (v) => {
    if (v) {
      loading.value = true
      await examStore.fetchExams()
      selectedIds.value = examStore.exams.map((e) => e.exam_id)
      loading.value = false
    }
  }
)

function toggleAll() {
  if (selectedIds.value.length === examStore.exams.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = examStore.exams.map((e) => e.exam_id)
  }
}

async function handleExport() {
  if (selectedIds.value.length === 0) {
    message.warning('请至少选择一条记录')
    return
  }

  loading.value = true
  try {
    // 生成内容
    let content: string
    let defaultName: string
    let filterName: string
    let filterExt: string

    if (format.value === 'json') {
      const data = await exportToJSON(selectedIds.value)
      content = JSON.stringify(data, null, 2)
      defaultName = `考试复盘_${new Date().toISOString().split('T')[0]}.json`
      filterName = 'JSON'
      filterExt = 'json'
    } else {
      content = await exportToCSV(selectedIds.value)
      defaultName = `考试复盘_${new Date().toISOString().split('T')[0]}.csv`
      filterName = 'CSV'
      filterExt = 'csv'
    }

    // 使用 Tauri 原生保存对话框
    const filePath = await save({
      defaultPath: defaultName,
      filters: [{ name: filterName, extensions: [filterExt] }],
    })

    if (!filePath) {
      // 用户取消
      loading.value = false
      return
    }

    // 写入文件
    await writeTextFile(filePath, '﻿' + content)
    message.success(`导出成功！文件已保存`)
    emit('update:show', false)
  } catch (e) {
    message.error('导出失败: ' + String(e))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NModal :show="show" @update:show="emit('update:show', $event)">
    <div class="dialog">
      <h3>导出数据</h3>

      <NSpin :show="loading">
        <div style="margin-bottom: 12px">
          <NText strong>格式：</NText>
          <NSpace style="margin-top: 8px">
            <NButton
              :type="format === 'json' ? 'primary' : 'default'"
              size="small"
              @click="format = 'json'"
            >
              JSON（完整数据）
            </NButton>
            <NButton
              :type="format === 'csv' ? 'primary' : 'default'"
              size="small"
              @click="format = 'csv'"
            >
              CSV（Excel 可打开）
            </NButton>
          </NSpace>
        </div>

        <div class="exam-check-list">
          <NButton text size="small" @click="toggleAll" style="margin-bottom: 8px">
            全选 / 取消
          </NButton>
          <div v-for="exam in examStore.exams" :key="exam.exam_id" class="check-item">
            <NCheckbox
              :checked="selectedIds.includes(exam.exam_id)"
              @update:checked="(v: boolean) => {
                if (v) { selectedIds.push(exam.exam_id) }
                else { selectedIds = selectedIds.filter(id => id !== exam.exam_id) }
              }"
            />
            <span style="margin-left: 4px; font-size: 13px">{{ exam.exam_name }}</span>
            <NText depth="3" style="font-size: 12px; margin-left: 8px">
              {{ exam.exam_date }}
            </NText>
          </div>
        </div>
      </NSpin>

      <NSpace justify="end" style="margin-top: 16px">
        <NButton @click="emit('update:show', false)">取消</NButton>
        <NButton type="primary" @click="handleExport" :disabled="selectedIds.length === 0">
          导出 {{ selectedIds.length }} 条
        </NButton>
      </NSpace>
    </div>
  </NModal>
</template>

<style scoped>
.dialog {
  width: 460px;
  padding: 24px;
  background: var(--card-color, #fff);
  border-radius: 8px;
}
.dialog h3 {
  margin: 0 0 16px;
}
.exam-check-list {
  max-height: 280px;
  overflow-y: auto;
}
.check-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
}
</style>
