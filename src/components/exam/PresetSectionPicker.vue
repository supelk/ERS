<script setup lang="ts">
import { ref } from 'vue'
import { NSelect, NButton, NText } from 'naive-ui'
import { PARENT_SECTIONS } from '@/utils/constants'

const emit = defineEmits<{
  select: [sectionNames: string[]]
}>()

const selectedValues = ref<string[]>([])

function handleAdd() {
  if (selectedValues.value.length === 0) return
  emit('select', [...selectedValues.value])
  selectedValues.value = []
}
</script>

<template>
  <div class="preset-picker">
    <NText depth="3" style="margin-right: 8px; line-height: 34px">📋 快速添加板块：</NText>
    <NSelect
      v-model:value="selectedValues"
      :options="PARENT_SECTIONS.map((s: any) => ({ label: s.label, value: s.value }))"
      multiple
      placeholder="选择预设板块..."
      style="width: 420px"
      size="small"
      clearable
    />
    <NButton
      type="primary"
      size="small"
      :disabled="selectedValues.length === 0"
      @click="handleAdd"
      style="margin-left: 8px"
    >
      添加到表格
    </NButton>
  </div>
</template>

<style scoped>
.preset-picker {
  display: flex;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 12px;
}
</style>
