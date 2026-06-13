<script setup lang="ts">
import { computed } from 'vue'
import {
  NGrid,
  NGi,
  NFormItemGi,
  NSelect,
  NInput,
  NInputNumber,
  NText,
  NTag,
  NButton,
  type FormItemProps,
  type GridProps,
} from 'naive-ui'
import type { ExamSectionFormData } from '@/types/exam'
import { calcAccuracy, calcScoreEfficiency } from '@/utils/calculations'
import { formatPercent, formatNumber } from '@/utils/formatters'
import {
  PARENT_SECTIONS,
  getChildrenOf,
} from '@/utils/constants'

const props = defineProps<{
  modelValue: ExamSectionFormData
  index: number
  /** 如果为 true，只显示父板块选择器，且不可选子板块 */
  parentOnly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ExamSectionFormData]
  remove: []
}>()

function emitUpdate(patch: Partial<ExamSectionFormData>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

// 该板块是否有子板块
const hasChildren = computed(() => getChildrenOf(props.modelValue.section_name).length > 0)

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
  <div class="section-grid-wrap">
    <NGrid v-bind="gridProps">
      <!-- 板块名称 -->
      <NGi :span="4">
        <NFormItemGi label="板块" v-bind="formItemProps">
          <NSelect
            :value="modelValue.section_name || undefined"
            @update:value="(v: string) => emitUpdate({ section_name: v })"
            :options="PARENT_SECTIONS"
            placeholder="选择一级板块"
            filterable
          />
          <NTag v-if="hasChildren" type="info" size="tiny" style="margin-top: 3px">
            含 {{ getChildrenOf(modelValue.section_name).length }} 个子项
          </NTag>
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
          <NInput type="textarea" :value="modelValue.analysis" @update:value="(v: string) => emitUpdate({ analysis: v || null })" placeholder="如：增长率比较题超时、逻辑填空薄弱..." :autosize="{ minRows: 1, maxRows: 3 }" />
        </NFormItemGi>
      </NGi>

      <NGi :span="12">
        <NFormItemGi label="下一步计划" v-bind="formItemProps">
          <NInput type="textarea" :value="modelValue.plan" @update:value="(v: string) => emitUpdate({ plan: v || null })" placeholder="如：每天一篇资料分析限时训练..." :autosize="{ minRows: 1, maxRows: 3 }" />
        </NFormItemGi>
      </NGi>
    </NGrid>
  </div>
</template>

<style scoped>
.section-grid-wrap {
  min-width: 1050px;
}
/* 窄屏下保证输入框不挤压 */
@media (max-width: 1199px) {
  .section-grid-wrap {
    min-width: 1050px;
  }
}
:deep(.n-form-item) { margin-bottom: 4px; }
</style>
