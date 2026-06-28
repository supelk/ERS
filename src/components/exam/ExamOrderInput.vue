<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NEmpty, NInput, NModal, NPopconfirm, NSelect, NSpace, NText, useMessage } from 'naive-ui'
import type { ExamSectionFormData } from '@/types/exam'

interface OrderItem {
  id: string
  section_name: string
}

interface SavedOrderPreset {
  id: string
  name: string
  order: string[]
  createdAt: string
}

const STORAGE_KEY = 'ers-exam-order-presets'

const props = defineProps<{
  modelValue: string | null
  sections: ExamSectionFormData[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const message = useMessage()
const rows = computed<OrderItem[]>(() => parseOrder(props.modelValue))
const savedPresets = ref<SavedOrderPreset[]>(loadPresets())
const selectedPresetId = ref<string | null>(null)
const showSaveModal = ref(false)
const presetName = ref('')

const sectionOptions = computed(() =>
  props.sections
    .filter((section) => section.section_name.trim())
    .map((section) => {
      const parent = section.parent_section_name
      return {
        label: parent ? `${parent} / ${section.section_name}` : section.section_name,
        value: section.section_name,
      }
    }),
)

const presetOptions = computed(() =>
  savedPresets.value.map((preset) => ({
    label: `${preset.name}（${preset.order.length}项）`,
    value: preset.id,
  })),
)

function parseOrder(value: string | null): OrderItem[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      .map((name, index) => ({
        id: `order-${index}-${name}`,
        section_name: name,
      }))
  } catch {
    return value
      .split(/[、,，\s]+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name, index) => ({
        id: `order-${index}-${name}`,
        section_name: name,
      }))
  }
}

function parseOrderNames(value: string | null): string[] {
  return parseOrder(value).map((row) => row.section_name).filter(Boolean)
}

function emitRows(nextRows: OrderItem[]) {
  const names = nextRows.map((row) => row.section_name).filter(Boolean)
  emit('update:modelValue', names.length > 0 ? JSON.stringify(names) : null)
}

function updateRow(index: number, value: string) {
  const nextRows = rows.value.map((row, rowIndex) =>
    rowIndex === index ? { ...row, section_name: value } : row,
  )
  emitRows(nextRows)
}

function addRow() {
  const firstUnused = sectionOptions.value.find(
    (option) => !rows.value.some((row) => row.section_name === option.value),
  )
  emitRows([
    ...rows.value,
    {
      id: `order-new-${Date.now()}`,
      section_name: firstUnused?.value ?? '',
    },
  ])
}

function removeRow(index: number) {
  emitRows(rows.value.filter((_, rowIndex) => rowIndex !== index))
}

function loadPresets(): SavedOrderPreset[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.name === 'string' && Array.isArray(item.order))
      : []
  } catch {
    return []
  }
}

function savePresets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets.value))
}

function openSaveModal() {
  const order = parseOrderNames(props.modelValue)
  if (order.length === 0) {
    message.warning('请先添加当前做题顺序')
    return
  }
  presetName.value = ''
  showSaveModal.value = true
}

function saveCurrentPreset() {
  const name = presetName.value.trim()
  if (!name) {
    message.warning('请输入顺序名称')
    return
  }
  const order = parseOrderNames(props.modelValue)
  if (order.length === 0) {
    message.warning('当前做题顺序为空')
    return
  }

  const existingIndex = savedPresets.value.findIndex((preset) => preset.name === name)
  const nextPreset: SavedOrderPreset = {
    id: existingIndex >= 0 ? savedPresets.value[existingIndex].id : `order-preset-${Date.now()}`,
    name,
    order,
    createdAt: new Date().toISOString(),
  }
  if (existingIndex >= 0) {
    savedPresets.value.splice(existingIndex, 1, nextPreset)
  } else {
    savedPresets.value.unshift(nextPreset)
  }
  savePresets()
  selectedPresetId.value = nextPreset.id
  showSaveModal.value = false
  message.success(existingIndex >= 0 ? '已更新做题顺序' : '已保存做题顺序')
}

function applyPreset() {
  const preset = savedPresets.value.find((item) => item.id === selectedPresetId.value)
  if (!preset) {
    message.warning('请选择已保存的顺序')
    return
  }
  emit('update:modelValue', JSON.stringify(preset.order))
  message.success(`已应用「${preset.name}」`)
}

function deletePreset() {
  const preset = savedPresets.value.find((item) => item.id === selectedPresetId.value)
  if (!preset) return
  savedPresets.value = savedPresets.value.filter((item) => item.id !== preset.id)
  savePresets()
  selectedPresetId.value = null
  message.success(`已删除「${preset.name}」`)
}
</script>

<template>
  <NCard size="small" title="做题顺序">
    <NSpace vertical :size="10">
      <NText depth="3">
        按实际作答先后选择板块，支持记录到二级板块。
      </NText>

      <div class="preset-row">
        <NSelect
          v-model:value="selectedPresetId"
          :options="presetOptions"
          placeholder="选择已保存的做题顺序"
          clearable
          filterable
        />
        <NButton size="small" :disabled="!selectedPresetId" @click="applyPreset">应用</NButton>
        <NButton size="small" type="primary" secondary @click="openSaveModal">保存当前顺序</NButton>
        <NPopconfirm @positive-click="deletePreset">
          <template #trigger>
            <NButton size="small" quaternary type="error" :disabled="!selectedPresetId">删除</NButton>
          </template>
          确认删除这个已保存顺序？
        </NPopconfirm>
      </div>

      <NEmpty v-if="rows.length === 0" description="暂未记录做题顺序" />

      <div v-for="(row, index) in rows" :key="row.id" class="order-row">
        <span class="order-index">{{ index + 1 }}</span>
        <NSelect
          :value="row.section_name || undefined"
          :options="sectionOptions"
          filterable
          placeholder="选择作答板块"
          @update:value="(value: string) => updateRow(index, value)"
        />
        <NButton size="small" quaternary type="error" @click="removeRow(index)">
          删除
        </NButton>
      </div>

      <div>
        <NButton size="small" type="primary" dashed @click="addRow">
          + 添加顺序
        </NButton>
      </div>
    </NSpace>

    <NModal
      v-model:show="showSaveModal"
      preset="card"
      title="保存做题顺序"
      :bordered="false"
      class="save-order-modal"
    >
      <NSpace vertical :size="12">
        <NInput
          v-model:value="presetName"
          placeholder="如：省考常用顺序、资料优先"
          @keyup.enter="saveCurrentPreset"
        />
        <NSpace justify="end">
          <NButton @click="showSaveModal = false">取消</NButton>
          <NButton type="primary" @click="saveCurrentPreset">保存</NButton>
        </NSpace>
      </NSpace>
    </NModal>
  </NCard>
</template>

<style scoped>
.preset-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto auto;
  align-items: center;
  gap: 8px;
}
.order-row {
  display: grid;
  grid-template-columns: 28px minmax(180px, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.order-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}
.save-order-modal {
  width: min(420px, calc(100vw - 32px));
}
@media (max-width: 720px) {
  .preset-row {
    grid-template-columns: 1fr 1fr;
  }
  .preset-row :deep(.n-base-selection) {
    grid-column: 1 / -1;
  }
}
</style>
