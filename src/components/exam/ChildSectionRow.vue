<script setup lang="ts">
import { computed } from 'vue'
import {
  NGrid, NGi, NFormItemGi, NSelect, NInput,
  NInputNumber, NText, NButton,
  type FormItemProps, type GridProps,
} from 'naive-ui'
import type { ExamSectionFormData } from '@/types/exam'
import { calcAccuracy, calcScoreEfficiency } from '@/utils/calculations'
import { formatPercent, formatNumber } from '@/utils/formatters'
import { getChildrenOf } from '@/utils/constants'

const props = defineProps<{
  modelValue: ExamSectionFormData
  parentSectionName: string   // 父板块名称
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ExamSectionFormData]
  remove: []
}>()

function emitUpdate(patch: Partial<ExamSectionFormData>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const childOptions = computed(() => {
  const children = getChildrenOf(props.parentSectionName)
  return children.map((c) => ({ label: c, value: c }))
})

const previewAccuracy = computed(() =>
  calcAccuracy(props.modelValue.correct_questions, props.modelValue.total_questions)
)
const previewEfficiency = computed(() =>
  calcScoreEfficiency(props.modelValue.correct_questions, props.modelValue.per_question_score, props.modelValue.used_time)
)
const accuracyColor = computed(() => {
  const v = previewAccuracy.value
  const target = props.modelValue.next_target_accuracy
  if (!target || !v) return undefined
  return v >= target ? 'success' as const : 'error' as const
})

const formItemProps = computed<Partial<FormItemProps>>(() => ({
  labelPlacement: 'top' as const,
  size: 'small' as const,
}))
const gridProps: GridProps = { cols: 24, xGap: 12 }
</script>

<template>
  <div class="child-row">
    <div class="child-indicator">└ {{ parentSectionName }}</div>
    <div class="section-grid-wrap">
      <NGrid v-bind="gridProps">
        <NGi :span="4">
          <NFormItemGi label="子板块" v-bind="formItemProps">
            <NSelect
              :value="modelValue.section_name || undefined"
              @update:value="(v: string) => emitUpdate({ section_name: v, parent_section_name: parentSectionName })"
              :options="childOptions"
              placeholder="选择子项"
            />
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="总题数" v-bind="formItemProps">
            <NInputNumber :value="modelValue.total_questions" @update:value="(v: number | null) => emitUpdate({ total_questions: v ?? 0 })" :min="0" placeholder="0" />
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="答对数" v-bind="formItemProps">
            <NInputNumber :value="modelValue.correct_questions" @update:value="(v: number | null) => emitUpdate({ correct_questions: v ?? 0 })" :min="0" :max="modelValue.total_questions" placeholder="0" />
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="正确率" v-bind="formItemProps">
            <NText :type="accuracyColor" style="font-weight: 600; font-size: 14px; line-height: 34px">{{ formatPercent(previewAccuracy) }}</NText>
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="分值" v-bind="formItemProps">
            <NInputNumber :value="modelValue.per_question_score" @update:value="(v: number | null) => emitUpdate({ per_question_score: v ?? 1 })" :min="0" :step="0.5" placeholder="1" />
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="用时(分)" v-bind="formItemProps">
            <NInputNumber :value="modelValue.used_time" @update:value="(v: number | null) => emitUpdate({ used_time: v ?? 0 })" :min="0" placeholder="0" />
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="得分效率" v-bind="formItemProps">
            <NText style="font-weight: 600; font-size: 14px; line-height: 34px">{{ formatNumber(previewEfficiency, 2) }}</NText>
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="未作答" v-bind="formItemProps">
            <NInputNumber :value="modelValue.unattempted_questions" @update:value="(v: number | null) => emitUpdate({ unattempted_questions: v ?? 0 })" :min="0" placeholder="0" />
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="目标正确率" v-bind="formItemProps">
            <NInputNumber :value="modelValue.next_target_accuracy" @update:value="(v: number | null) => emitUpdate({ next_target_accuracy: v })" :min="0" :max="100" placeholder="%" />
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label="目标用时" v-bind="formItemProps">
            <NInputNumber :value="modelValue.next_target_time" @update:value="(v: number | null) => emitUpdate({ next_target_time: v })" :min="0" placeholder="分" />
          </NFormItemGi>
        </NGi>

        <NGi :span="2">
          <NFormItemGi label=" " v-bind="formItemProps">
            <NButton type="error" size="small" quaternary @click="emit('remove')">删除</NButton>
          </NFormItemGi>
        </NGi>

        <NGi :span="12">
          <NFormItemGi label="问题分析" v-bind="formItemProps">
            <NInput type="textarea" :value="modelValue.analysis" @update:value="(v: string) => emitUpdate({ analysis: v || null })" placeholder="薄弱点..." :autosize="{ minRows: 1, maxRows: 2 }" />
          </NFormItemGi>
        </NGi>

        <NGi :span="12">
          <NFormItemGi label="下一步计划" v-bind="formItemProps">
            <NInput type="textarea" :value="modelValue.plan" @update:value="(v: string) => emitUpdate({ plan: v || null })" placeholder="专项练习..." :autosize="{ minRows: 1, maxRows: 2 }" />
          </NFormItemGi>
        </NGi>
      </NGrid>
    </div>
  </div>
</template>

<style scoped>
.child-row {
  margin: 8px 0 8px 32px;
  padding: 8px 12px;
  border-left: 3px solid var(--primary);
  background: var(--primary-light);
  border-radius: 0 8px 8px 0;
}
.child-row .section-grid-wrap {
  min-width: 1020px;
}
.child-indicator {
  font-size: 12px;
  color: var(--primary);
  margin-bottom: 6px;
  font-weight: 500;
}
:deep(.n-form-item) { margin-bottom: 4px; }
</style>
