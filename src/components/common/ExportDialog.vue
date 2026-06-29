<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NButton, NSpace, NCheckbox, NText, NSpin, useMessage } from 'naive-ui'
import { useExamStore } from '@/stores/exam'
import { exportToJSON, exportToCSV } from '@/composables/useImportExport'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const message = useMessage()
const examStore = useExamStore()
const loading = ref(false)
const selectedIds = ref<number[]>([])
const format = ref<'json' | 'csv'>('json')

watch(
  () => props.show,
  async (v) => {
    if (!v) return
    loading.value = true
    await examStore.fetchExams()
    selectedIds.value = examStore.exams.map((e) => e.exam_id)
    loading.value = false
  },
)

function toggleAll() {
  selectedIds.value = selectedIds.value.length === examStore.exams.length
    ? []
    : examStore.exams.map((e) => e.exam_id)
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob(['\ufeff' + content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function handleExport() {
  if (selectedIds.value.length === 0) {
    message.warning('请至少选择一条记录')
    return
  }

  loading.value = true
  try {
    const date = new Date().toISOString().split('T')[0]
    if (format.value === 'json') {
      const data = await exportToJSON(selectedIds.value)
      download(JSON.stringify(data, null, 2), `考试复盘_${date}.json`, 'application/json;charset=utf-8')
    } else {
      const content = await exportToCSV(selectedIds.value)
      download(content, `考试复盘_${date}.csv`, 'text/csv;charset=utf-8')
    }
    message.success('导出成功')
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
            <NButton :type="format === 'json' ? 'primary' : 'default'" size="small" @click="format = 'json'">
              JSON
            </NButton>
            <NButton :type="format === 'csv' ? 'primary' : 'default'" size="small" @click="format = 'csv'">
              CSV
            </NButton>
          </NSpace>
        </div>

        <div class="exam-check-list">
          <NButton text size="small" style="margin-bottom: 8px" @click="toggleAll">全选 / 取消</NButton>
          <div v-for="exam in examStore.exams" :key="exam.exam_id" class="check-item">
            <NCheckbox
              :checked="selectedIds.includes(exam.exam_id)"
              @update:checked="(v: boolean) => {
                selectedIds = v
                  ? [...selectedIds, exam.exam_id]
                  : selectedIds.filter(id => id !== exam.exam_id)
              }"
            />
            <span style="margin-left: 4px; font-size: 13px">{{ exam.exam_name }}</span>
            <NText depth="3" style="font-size: 12px; margin-left: 8px">{{ exam.exam_date }}</NText>
          </div>
        </div>
      </NSpin>

      <NSpace justify="end" style="margin-top: 16px">
        <NButton @click="emit('update:show', false)">取消</NButton>
        <NButton type="primary" :disabled="selectedIds.length === 0" @click="handleExport">
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
