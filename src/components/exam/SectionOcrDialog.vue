<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NDataTable,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NTag,
  NText,
  type DataTableColumns,
} from 'naive-ui'
import type { RecognizedSectionDraft } from '@/utils/sectionOcr'
import {
  PRESET_SECTIONS,
  getParentSectionName,
} from '@/utils/constants'

const props = defineProps<{
  show: boolean
  rows: RecognizedSectionDraft[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  confirm: [rows: RecognizedSectionDraft[]]
}>()

const editableRows = ref<RecognizedSectionDraft[]>([])

watch(
  () => props.rows,
  (rows) => {
    editableRows.value = rows.map((row) => ({ ...row }))
  },
  { immediate: true, deep: true },
)

const activeRows = computed(() => editableRows.value.filter((row) => !row.ignored))

const invalidRowIds = computed(() => {
  const ids = new Set<string>()
  for (const row of activeRows.value) {
    if (!row.section_name) ids.add(row.id)
    if (row.total_questions != null && row.total_questions < 0) ids.add(row.id)
    if (row.correct_questions != null && row.correct_questions < 0) ids.add(row.id)
    if (
      row.total_questions != null &&
      row.correct_questions != null &&
      row.correct_questions > row.total_questions
    ) {
      ids.add(row.id)
    }
    if (row.used_time != null && row.used_time < 0) ids.add(row.id)
    if (row.score != null && row.score < 0) ids.add(row.id)
  }
  return ids
})

const canConfirm = computed(() => activeRows.value.length > 0 && invalidRowIds.value.size === 0)

const columns = computed<DataTableColumns<RecognizedSectionDraft>>(() => [
  {
    title: '状态',
    key: 'state',
    width: 92,
    render(row) {
      if (row.ignored) return hTag('default', '已忽略')
      if (invalidRowIds.value.has(row.id)) return hTag('error', '需修正')
      if (row.duplicate) return hTag('warning', '重复')
      return hTag('success', '可填充')
    },
  },
  {
    title: '板块',
    key: 'section_name',
    width: 160,
    render(row) {
      return hSelect(row, 'section_name', PRESET_SECTIONS)
    },
  },
  {
    title: '总题数',
    key: 'total_questions',
    width: 110,
    render(row) {
      return hNumber(row, 'total_questions')
    },
  },
  {
    title: '答对数',
    key: 'correct_questions',
    width: 110,
    render(row) {
      return hNumber(row, 'correct_questions')
    },
  },
  {
    title: '用时',
    key: 'used_time',
    width: 110,
    render(row) {
      return hNumber(row, 'used_time', 0.5)
    },
  },
  {
    title: '得分',
    key: 'score',
    width: 110,
    render(row) {
      return hNumber(row, 'score', 0.5)
    },
  },
  {
    title: '来源',
    key: 'rawName',
    ellipsis: { tooltip: true },
  },
  {
    title: '操作',
    key: 'actions',
    width: 96,
    render(row) {
      return row.ignored
        ? hButton('恢复', () => updateRow(row.id, { ignored: false }))
        : hButton('删除', () => updateRow(row.id, { ignored: true }))
    },
  },
])

function hTag(type: 'default' | 'success' | 'warning' | 'error', label: string) {
  return h(NTag, { type, size: 'small', bordered: false }, { default: () => label })
}

function hButton(label: string, onClick: () => void) {
  return h(NButton, { size: 'tiny', quaternary: true, onClick }, { default: () => label })
}

function hSelect(
  row: RecognizedSectionDraft,
  field: 'section_name',
  options: { label: string; value: string }[],
) {
  return h(NSelect, {
    value: row[field] || undefined,
    options,
    size: 'small',
    filterable: true,
    disabled: row.ignored,
    onUpdateValue: (value: string) => {
      updateRow(row.id, {
        section_name: value,
        parent_section_name: getParentSectionName(value),
      })
    },
  })
}

function hNumber(
  row: RecognizedSectionDraft,
  field: 'total_questions' | 'correct_questions' | 'used_time' | 'score',
  step = 1,
) {
  const invalid =
    invalidRowIds.value.has(row.id) &&
    ((field === 'correct_questions' &&
      row.total_questions != null &&
      row.correct_questions != null &&
      row.correct_questions > row.total_questions) ||
      (row[field] != null && row[field]! < 0))

  return h(NInputNumber, {
    value: row[field],
    size: 'small',
    min: 0,
    step,
    disabled: row.ignored,
    status: invalid ? 'error' : undefined,
    placeholder: '-',
    onUpdateValue: (value: number | null) => updateRow(row.id, { [field]: value }),
  })
}

function updateRow(id: string, patch: Partial<RecognizedSectionDraft>) {
  editableRows.value = editableRows.value.map((row) =>
    row.id === id ? { ...row, ...patch } : row,
  )
}

function addRow() {
  editableRows.value.push({
    id: `manual-${Date.now()}`,
    rawName: '手动补充',
    section_name: '',
    parent_section_name: null,
    total_questions: null,
    correct_questions: null,
    used_time: null,
    score: null,
    duplicate: false,
  })
}

function handleConfirm() {
  if (!canConfirm.value) return
  emit('confirm', activeRows.value.map((row) => ({ ...row })))
  emit('update:show', false)
}
</script>

<script lang="ts">
import { h } from 'vue'
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    title="识别结果确认"
    :bordered="false"
    class="ocr-dialog"
    @update:show="emit('update:show', $event)"
  >
    <NSpace vertical :size="12">
      <NAlert type="info" :bordered="false">
        请核对截图识别结果。重复板块默认忽略，可恢复其中一条后再填充。
      </NAlert>

      <NAlert v-if="invalidRowIds.size > 0" type="error" :bordered="false">
        有 {{ invalidRowIds.size }} 行数值异常，答对数不能大于总题数，数值不能小于 0。
      </NAlert>

      <div class="table-shell">
        <NDataTable
          :columns="columns"
          :data="editableRows"
          :loading="loading"
          :pagination="false"
          size="small"
          :row-key="(row) => row.id"
        />
      </div>

      <div class="dialog-footer">
        <NText depth="3">将填充 {{ activeRows.length }} 个板块，只补空字段。</NText>
        <NSpace>
          <NButton @click="addRow">新增板块</NButton>
          <NButton @click="emit('update:show', false)">取消</NButton>
          <NButton type="primary" :disabled="!canConfirm" @click="handleConfirm">
            确认填充
          </NButton>
        </NSpace>
      </div>
    </NSpace>
  </NModal>
</template>

<style scoped>
.ocr-dialog {
  width: min(1080px, calc(100vw - 32px));
}
.table-shell {
  overflow-x: auto;
}
.table-shell :deep(.n-data-table) {
  min-width: 960px;
}
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
@media (max-width: 720px) {
  .dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
