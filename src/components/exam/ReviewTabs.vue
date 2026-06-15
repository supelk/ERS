<script setup lang="ts">
import { NTabs, NTabPane } from 'naive-ui'
import QuestionGroupTable from './QuestionGroupTable.vue'
import type { ReviewQuestionFormData } from '@/types/exam'

defineProps<{
  wrongQuestions: ReviewQuestionFormData[]
  speedQuestions: ReviewQuestionFormData[]
  fastCorrectQuestions: ReviewQuestionFormData[]
  parentSectionNames: string[]
  /** 只读模式（详情页用） */
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:wrongQuestions': [value: ReviewQuestionFormData[]]
  'update:speedQuestions': [value: ReviewQuestionFormData[]]
  'update:fastCorrectQuestions': [value: ReviewQuestionFormData[]]
}>()
</script>

<template>
  <div class="review-tabs">
    <NTabs type="line" :default-value="'wrong'" :animated="true">
      <!-- 做错的题 -->
      <NTabPane name="wrong" tab="做错的题">
        <QuestionGroupTable
          :questions="wrongQuestions"
          :parent-section-names="parentSectionNames"
          mode="wrong"
          :readonly="readonly"
          title="📝 做错的题"
          hint="按板块记录错题信息，提交时自动过滤空行"
          row-label="道错题"
          @update:questions="(v) => emit('update:wrongQuestions', v)"
        />
      </NTabPane>

      <!-- 做对但慢的题 -->
      <NTabPane name="speed" tab="做对但慢的题">
        <QuestionGroupTable
          :questions="speedQuestions"
          :parent-section-names="parentSectionNames"
          mode="speed"
          :readonly="readonly"
          title="⏱️ 做对但慢的题"
          hint="记录用时过长的题目，针对性提速训练"
          row-label="道慢题"
          @update:questions="(v) => emit('update:speedQuestions', v)"
        />
      </NTabPane>

      <!-- 又快又对的题 -->
      <NTabPane name="fast" tab="又快又对的题">
        <QuestionGroupTable
          :questions="fastCorrectQuestions"
          :parent-section-names="parentSectionNames"
          mode="fast"
          :readonly="readonly"
          title="⚡ 又快又对的题"
          hint="记录高质量解题思路，沉淀破题方法论"
          row-label="道优题"
          @update:questions="(v) => emit('update:fastCorrectQuestions', v)"
        />
      </NTabPane>
    </NTabs>
  </div>
</template>

<style scoped>
.review-tabs {
  margin-top: 0;
}
.review-tabs :deep(.n-tabs-nav) {
  background: var(--bg-surface);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  padding: 0 8px;
}
.review-tabs :deep(.n-tabs-pane-wrapper) {
  padding-top: 4px;
}
</style>
