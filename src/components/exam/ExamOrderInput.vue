<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCard, NEmpty, NSelect, NSpace, NText } from 'naive-ui'
import type { ExamSectionFormData } from '@/types/exam'

interface OrderItem {
  id: string
  section_name: string
}

const props = defineProps<{
  modelValue: string | null
  sections: ExamSectionFormData[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const rows = computed<OrderItem[]>(() => parseOrder(props.modelValue))

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
</script>

<template>
  <NCard size="small" title="做题顺序">
    <NSpace vertical :size="10">
      <NText depth="3">
        按实际作答先后选择板块，支持记录到二级板块。
      </NText>

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
  </NCard>
</template>

<style scoped>
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
</style>
