<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NButton, NSpace, NText, NUpload, useMessage, type UploadFileInfo } from 'naive-ui'
import { importFromJSON, importFromCSV } from '@/composables/useImportExport'
import { useExamStore } from '@/stores/exam'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const message = useMessage()
const examStore = useExamStore()
const loading = ref(false)
const importResult = ref<{ imported: number; skipped: number } | null>(null)

async function handleFileChange(options: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  const file = options.file.file
  if (!file) return

  loading.value = true
  importResult.value = null

  try {
    const text = await file.text()
    const isJSON = file.name.endsWith('.json')

    if (isJSON) {
      const data = JSON.parse(text)
      importResult.value = await importFromJSON(data)
    } else {
      importResult.value = await importFromCSV(text)
    }

    await examStore.fetchExams()

    if (importResult.value.skipped === 0) {
      message.success(`导入成功！共导入 ${importResult.value.imported} 条记录`)
    } else {
      message.warning(
        `导入完成：${importResult.value.imported} 条成功，${importResult.value.skipped} 条跳过`
      )
    }
  } catch (e) {
    message.error('导入失败: ' + String(e))
  } finally {
    loading.value = false
  }
}

function handleClose() {
  importResult.value = null
  emit('update:show', false)
}
</script>

<template>
  <NModal :show="show" @update:show="emit('update:show', $event)">
    <div class="dialog">
      <h3>导入数据</h3>

      <div style="margin-bottom: 16px">
        <NText depth="3">
          支持 JSON（.json）和 CSV（.csv）格式。<br />
          导入后会自动创建对应的考试和板块记录。
        </NText>
      </div>

      <NUpload
        :show-file-list="true"
        :max="1"
        accept=".json,.csv"
        @change="handleFileChange"
      >
        <NButton :loading="loading">选择文件</NButton>
      </NUpload>

      <div v-if="importResult" style="margin-top: 16px" class="result-box">
        <NText>✅ 成功：{{ importResult.imported }} 条</NText>
        <NText v-if="importResult.skipped > 0">⚠️ 跳过：{{ importResult.skipped }} 条</NText>
      </div>

      <NSpace justify="end" style="margin-top: 16px">
        <NButton @click="handleClose">关闭</NButton>
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
.result-box {
  padding: 12px;
  background: var(--bg-color, #fafafa);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
