<script setup lang="ts">
import {
  NGrid,
  NGi,
  NFormItemGi,
  NInput,
  NInputNumber,
  NSelect,
  NDatePicker,
  type GridProps,
} from 'naive-ui'
import type { ExamFormData } from '@/types/exam'
import {
  EXAM_TYPE_1_OPTIONS,
  EXAM_TYPE_OPTIONS,
} from '@/utils/constants'

const props = defineProps<{
  modelValue: ExamFormData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ExamFormData]
}>()

function emitUpdate(patch: Partial<ExamFormData>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const gridProps: GridProps = { cols: 24, xGap: 16 }
</script>

<template>
  <div class="exam-form">
    <div class="form-header">
      <span class="header-label">📝 考试基本信息</span>
      <span style="font-size: 12px; color: #999; margin-left: 8px">* 为必填项</span>
    </div>

    <NGrid v-bind="gridProps">
      <!-- 考试名称 * -->
      <NGi :span="8">
        <NFormItemGi label="考试名称 *" label-placement="top">
          <NInput
            :value="modelValue.exam_name"
            @update:value="(v: string) => emitUpdate({ exam_name: v })"
            placeholder="如：2025 省考模考第 5 季"
          />
        </NFormItemGi>
      </NGi>

      <!-- 考试日期 * -->
      <NGi :span="4">
        <NFormItemGi label="考试日期 *" label-placement="top">
          <NDatePicker
            :value="modelValue.exam_date ? new Date(modelValue.exam_date).getTime() : null"
            @update:value="(v: number | null) => {
              const d = v ? new Date(v) : new Date()
              emitUpdate({ exam_date: d.toISOString().split('T')[0] })
            }"
            type="date"
            style="width: 100%"
          />
        </NFormItemGi>
      </NGi>

      <!-- 考试一级分类 * -->
      <NGi :span="3">
        <NFormItemGi label="分类 *" label-placement="top">
          <NSelect
            :value="modelValue.exam_type_1"
            @update:value="(v: string) => emitUpdate({ exam_type_1: v as ExamFormData['exam_type_1'] })"
            :options="EXAM_TYPE_1_OPTIONS"
            placeholder="国考/省考"
          />
        </NFormItemGi>
      </NGi>

      <!-- 考试二级分类 * -->
      <NGi :span="3">
        <NFormItemGi label="类型 *" label-placement="top">
          <NSelect
            :value="modelValue.exam_type"
            @update:value="(v: string) => emitUpdate({ exam_type: v as ExamFormData['exam_type'] })"
            :options="EXAM_TYPE_OPTIONS"
            placeholder="模考/真题/..."
          />
        </NFormItemGi>
      </NGi>

      <!-- 满分 -->
      <NGi :span="2">
        <NFormItemGi label="满分" label-placement="top">
          <NInputNumber
            :value="modelValue.full_score"
            @update:value="(v: number | null) => emitUpdate({ full_score: v ?? 100 })"
            :min="0"
            placeholder="100"
          />
        </NFormItemGi>
      </NGi>

      <!-- 本次总分 * -->
      <NGi :span="2">
        <NFormItemGi label="总分 *" label-placement="top">
          <NInputNumber
            :value="modelValue.total_score"
            @update:value="(v: number | null) => emitUpdate({ total_score: v ?? 0 })"
            :min="0"
            placeholder="0"
          />
        </NFormItemGi>
      </NGi>

      <!-- 总用时 -->
      <NGi :span="2">
        <NFormItemGi label="总用时(分)" label-placement="top">
          <NInputNumber
            :value="modelValue.total_time"
            @update:value="(v: number | null) => emitUpdate({ total_time: v })"
            :min="0"
            placeholder="分钟"
          />
        </NFormItemGi>
      </NGi>
    </NGrid>

    <NGrid v-bind="gridProps" style="margin-top: 8px">
      <!-- 现阶段目标分 -->
      <NGi :span="4">
        <NFormItemGi label="现阶段目标分" label-placement="top">
          <NInputNumber
            :value="modelValue.current_target_score"
            @update:value="(v: number | null) => emitUpdate({ current_target_score: v })"
            :min="0"
            placeholder="如 65"
          />
        </NFormItemGi>
      </NGi>

      <!-- 下阶段目标分 -->
      <NGi :span="4">
        <NFormItemGi label="下阶段目标分" label-placement="top">
          <NInputNumber
            :value="modelValue.next_target_score"
            @update:value="(v: number | null) => emitUpdate({ next_target_score: v })"
            :min="0"
            placeholder="如 75"
          />
        </NFormItemGi>
      </NGi>

      <!-- 备注 -->
      <NGi :span="16">
        <NFormItemGi label="整体备注" label-placement="top">
          <NInput
            :value="modelValue.notes || ''"
            @update:value="(v: string) => emitUpdate({ notes: v || null })"
            type="textarea"
            placeholder="整体感受、考试策略、心态记录..."
            :autosize="{ minRows: 1, maxRows: 2 }"
          />
        </NFormItemGi>
      </NGi>
    </NGrid>
  </div>
</template>

<style scoped>
.exam-form {
  margin-bottom: 8px;
}

.form-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 12px;
}

.header-label {
  font-weight: 600;
  font-size: 15px;
}

/* ============================================================
   响应式断点
   ============================================================ */

/* 768px ~ 1200px：表单改为 2 列布局 */
@media (min-width: 768px) and (max-width: 1199px) {
  .exam-form :deep(.n-grid) {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .exam-form :deep(.n-gi) {
    grid-column: span 1 !important;
  }
  /* 单个输入框最小宽度不低于 120px */
  .exam-form :deep(.n-input),
  .exam-form :deep(.n-input-number),
  .exam-form :deep(.n-base-select) {
    min-width: 120px;
  }
}

/* < 768px：单列纵向排布 */
@media (max-width: 767px) {
  .exam-form :deep(.n-grid) {
    grid-template-columns: 1fr !important;
  }
  .exam-form :deep(.n-gi) {
    grid-column: span 1 !important;
  }
}
</style>
