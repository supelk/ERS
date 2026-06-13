<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NSpace, NDivider, NEmpty } from 'naive-ui'
import SectionRow from './SectionRow.vue'
import ChildSectionRow from './ChildSectionRow.vue'
import PresetSectionPicker from './PresetSectionPicker.vue'
import type { ExamSectionFormData } from '@/types/exam'
import { getChildrenOf } from '@/utils/constants'

const props = defineProps<{
  sections: ExamSectionFormData[]
}>()

const emit = defineEmits<{
  'update:sections': [sections: ExamSectionFormData[]]
}>()

let nextClientId = 1

function generateClientId(): string {
  return `temp-${Date.now()}-${nextClientId++}`
}

function createEmptySection(name = ''): ExamSectionFormData {
  return {
    client_id: generateClientId(),
    section_id: 0,
    section_name: name,
    parent_section_name: null,
    total_questions: 0,
    correct_questions: 0,
    per_question_score: 1,
    used_time: 0,
    unattempted_questions: 0,
    analysis: null,
    plan: null,
    next_target_accuracy: null,
    next_target_time: null,
    next_target_efficiency: null,
  }
}

// 将扁平列表分组：parent rows (parent_section_name == null) 和 child rows
const parentSections = computed(() => {
  return props.sections.filter((s) => s.parent_section_name == null || s.parent_section_name === '')
})

function getChildrenOfParent(parentSectionName: string): ExamSectionFormData[] {
  return props.sections.filter((s) => s.parent_section_name === parentSectionName)
}

// 预设选择：只添加父板块
function handlePresetSelect(names: string[]) {
  const existingNames = new Set(parentSections.value.map((s) => s.section_name))
  const newSections = names
    .filter((n) => !existingNames.has(n))
    .map((n) => createEmptySection(n))
  if (newSections.length > 0) {
    updateAll([...props.sections, ...newSections])
  }
}

function handleAddParent() {
  updateAll([...props.sections, createEmptySection()])
}

function handleAddChild(parentSectionName: string) {
  const child = createEmptySection()
  child.parent_section_name = parentSectionName
  // 找到父板块在数组中的位置（从后往前找，确保是父行）
  let parentIndex = -1
  for (let i = props.sections.length - 1; i >= 0; i--) {
    if (props.sections[i].section_name === parentSectionName && props.sections[i].parent_section_name == null) {
      parentIndex = i
      break
    }
  }
  const newSections = [...props.sections]
  // 插入到该父板块所有子项的最后
  let insertAt = parentIndex + 1
  while (insertAt < newSections.length && newSections[insertAt].parent_section_name === parentSectionName) {
    insertAt++
  }
  newSections.splice(insertAt, 0, child)
  updateAll(newSections)
}

function handleRemove(clientId: string) {
  updateAll(props.sections.filter((s) => s.client_id !== clientId))
}

function handleUpdate(clientId: string, value: ExamSectionFormData) {
  const idx = props.sections.findIndex((s) => s.client_id === clientId)
  if (idx >= 0) {
    const updated = [...props.sections]
    updated[idx] = value
    updateAll(updated)
  }
}

function updateAll(list: ExamSectionFormData[]) {
  emit('update:sections', list)
}

// 总题数、总用时汇总
const summary = computed(() => ({
  parentCount: parentSections.value.length,
  childCount: props.sections.length - parentSections.value.length,
  totalQuestions: props.sections.reduce((s, r) => s + r.total_questions, 0),
  totalTime: props.sections.reduce((s, r) => s + r.used_time, 0),
}))
</script>

<template>
  <div class="section-table">
    <!-- 预设板块选择器（只选一级板块） -->
    <PresetSectionPicker @select="handlePresetSelect" />

    <!-- 表头 -->
    <div class="section-header">
      <span class="header-label">🏷️ 板块成绩</span>
      <NButton size="small" @click="handleAddParent">+ 添加一级板块</NButton>
    </div>

    <NDivider style="margin: 8px 0" />

    <!-- 空状态 -->
    <div v-if="parentSections.length === 0" class="empty-wrapper">
      <NEmpty description="暂无板块数据，选择预设板块或手动添加">
        <template #extra>
          <NButton size="small" @click="handleAddParent">添加第一个板块</NButton>
        </template>
      </NEmpty>
    </div>

    <!-- 板块列表：横向滚动容器 + 父行 + 嵌套子行 -->
    <div class="section-scroll">
      <template v-for="parent in parentSections" :key="parent.client_id">
        <div class="parent-block">
          <SectionRow
            :model-value="parent"
            :index="0"
            @update:model-value="(v) => handleUpdate(parent.client_id, v)"
            @remove="handleRemove(parent.client_id)"
          />

          <!-- 子板块列表 -->
          <template v-for="child in getChildrenOfParent(parent.section_name)" :key="child.client_id">
            <ChildSectionRow
              :model-value="child"
              :parent-section-name="parent.section_name"
              @update:model-value="(v) => handleUpdate(child.client_id, v)"
              @remove="handleRemove(child.client_id)"
            />
          </template>

          <!-- 添加子板块按钮 -->
          <div
            v-if="getChildrenOf(parent.section_name).length > 0"
            class="add-child-bar"
          >
            <NButton
              size="tiny"
              type="primary"
              dashed
              @click="handleAddChild(parent.section_name)"
            >
              + 添加子板块
            </NButton>
            <span style="font-size: 11px; color: #999; margin-left: 8px">
              当前 {{ getChildrenOf(parent.section_name).length }} 个子项
            </span>
          </div>
        </div>
        <div style="margin-top: 12px; border-top: 1px dashed #ddd; padding-top: 4px" />
      </template>
    </div>

    <!-- 汇总 -->
    <div v-if="parentSections.length > 0" class="summary-row">
      <NSpace>
        <span style="color: #888; font-size: 13px">
          共 {{ summary.parentCount }} 个一级板块{{ summary.childCount > 0 ? ` · ${summary.childCount} 个子板块` : '' }} ·
          总题数 {{ summary.totalQuestions }} ·
          总用时 {{ summary.totalTime }} 分钟
        </span>
      </NSpace>
    </div>
  </div>
</template>

<style scoped>
.section-table {
  margin-top: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-label {
  font-weight: 600;
  font-size: 15px;
}
.empty-wrapper {
  padding: 24px 0;
}
.parent-block {
  margin-bottom: 4px;
}
.section-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
/* 窗口宽度 < 1200px 时显示滚动提示 */
@media (max-width: 1199px) {
  .section-scroll {
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 8px;
  }
}
.add-child-bar {
  margin: 6px 0 8px 32px;
  display: flex;
  align-items: center;
}
.summary-row {
  margin-top: 12px;
}
</style>
