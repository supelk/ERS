<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NInput,
  NList,
  NListItem,
  NSpace,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import { useExamStore } from '@/stores/exam'
import { useTaskStore } from '@/stores/task'
import type { ExamRecord, ExamSectionRecord, ReviewQuestionRecord } from '@/types/exam'
import { analyzeSingleExam, type SingleExamAiResult } from '@/utils/examAiAnalysis'

const props = defineProps<{
  exam: ExamRecord
  sections: ExamSectionRecord[]
  wrongQuestions: ReviewQuestionRecord[]
  speedQuestions: ReviewQuestionRecord[]
  fastCorrectQuestions: ReviewQuestionRecord[]
}>()

const emit = defineEmits<{
  applied: []
}>()

const message = useMessage()
const examStore = useExamStore()
const taskStore = useTaskStore()

const activeNames = ref<string[]>([])
const loading = ref(false)
const result = ref<SingleExamAiResult | null>(null)
const editableProblemSummary = ref('')
const editableTasks = ref('')
const generated = ref(false)

const hasReviewData = computed(() =>
  props.wrongQuestions.length > 0 || props.speedQuestions.length > 0 || props.fastCorrectQuestions.length > 0
)

async function handleGenerate() {
  if (!hasReviewData.value) {
    message.info('本场暂无错题或慢题记录，将基于板块成绩生成简要分析')
  }

  loading.value = true
  try {
    const previousSameTypeSections = await examStore.fetchPreviousSameTypeSections(props.exam.exam_id)
    const aiResult = await analyzeSingleExam({
      exam: props.exam,
      sections: props.sections,
      previousSameTypeSections,
      wrongQuestions: props.wrongQuestions,
      speedQuestions: props.speedQuestions,
      fastCorrectQuestions: props.fastCorrectQuestions,
    })
    result.value = aiResult
    editableProblemSummary.value = aiResult.problemSummary
    editableTasks.value = aiResult.taskSuggestions.join('\n')
    generated.value = true
  } catch (e) {
    message.error('AI 分析生成失败：' + String(e))
  } finally {
    loading.value = false
  }
}

async function applyProblemSummary() {
  if (!editableProblemSummary.value.trim()) {
    message.warning('请先生成或填写问题汇总内容')
    return
  }
  const firstParent = props.sections.find((section) => !section.parent_section_name)
  if (!firstParent) {
    message.warning('没有可填充的问题汇总板块')
    return
  }
  await examStore.updateSection({
    ...firstParent,
    analysis: firstParent.analysis
      ? `${firstParent.analysis}\n\nAI 参考：${editableProblemSummary.value.trim()}`
      : editableProblemSummary.value.trim(),
  })
  message.success('已填充至问题汇总')
  emit('applied')
}

async function createTasks() {
  const tasks = editableTasks.value
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-\d.、\s]+/, '').trim())
    .filter(Boolean)
  if (tasks.length === 0) {
    message.warning('请先生成或填写任务建议')
    return
  }
  for (const task of tasks) {
    await taskStore.createTask({ task_name: task, status: '未开始' })
  }
  message.success(`已生成 ${tasks.length} 个专项练习任务`)
}
</script>

<template>
  <NCollapse v-model:expanded-names="activeNames" class="ai-review-collapse">
    <NCollapseItem name="single-ai">
      <template #header>
        <div class="ai-header">
          <span>单场智能复盘</span>
          <NTag size="small" :bordered="false" type="info">AI 参考</NTag>
        </div>
      </template>

      <NCard size="small" :bordered="false" class="ai-card">
        <NSpace vertical :size="12">
          <NAlert v-if="!hasReviewData" type="warning" :bordered="false">
            本场暂无错题或慢题记录，AI 分析可能缺少错因依据。补充题目复盘后结论会更可靠。
          </NAlert>

          <div class="ai-actions">
            <NText depth="3">基于本场板块成绩、题目复盘和问题汇总生成，内容不会自动覆盖原数据。</NText>
            <NButton type="primary" size="small" :loading="loading" @click="handleGenerate">
              {{ generated ? '重新生成' : '生成分析' }}
            </NButton>
          </div>

          <template v-if="result">
            <NAlert type="success" :bordered="false">
              {{ result.overall }}
            </NAlert>

            <div class="ai-grid">
              <div>
                <NText strong>优势板块</NText>
                <NList size="small">
                  <NListItem v-for="item in result.strengths" :key="item">{{ item }}</NListItem>
                </NList>
              </div>
              <div>
                <NText strong>优先修补</NText>
                <NList size="small">
                  <NListItem v-for="item in result.weaknesses" :key="item">{{ item }}</NListItem>
                </NList>
              </div>
            </div>

            <div class="tag-row">
              <NTag
                v-for="item in result.sectionTags"
                :key="`${item.section}-${item.tag}`"
                size="small"
                :bordered="false"
              >
                {{ item.section }} · {{ item.tag }} · {{ item.change }}
              </NTag>
            </div>

            <div class="ai-grid">
              <div>
                <NText strong>错因统计</NText>
                <NList size="small">
                  <NListItem v-for="item in result.errorStats" :key="item.category">
                    {{ item.category }}：{{ item.count }} 次。{{ item.note }}
                  </NListItem>
                </NList>
              </div>
              <div>
                <NText strong>改进建议</NText>
                <NList size="small">
                  <NListItem v-for="item in result.suggestions" :key="item">{{ item }}</NListItem>
                </NList>
              </div>
            </div>

            <NInput
              v-model:value="editableProblemSummary"
              type="textarea"
              placeholder="可编辑后填充到问题汇总"
              :autosize="{ minRows: 3, maxRows: 6 }"
            />
            <NInput
              v-model:value="editableTasks"
              type="textarea"
              placeholder="每行一个专项练习任务，可编辑后生成"
              :autosize="{ minRows: 3, maxRows: 6 }"
            />
            <NSpace>
              <NButton size="small" @click="applyProblemSummary">填充至问题汇总</NButton>
              <NButton size="small" @click="createTasks">生成专项任务</NButton>
            </NSpace>
          </template>
        </NSpace>
      </NCard>
    </NCollapseItem>
  </NCollapse>
</template>

<style scoped>
.ai-review-collapse {
  margin-bottom: 16px;
}
.ai-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.ai-card {
  background: var(--bg-surface);
}
.ai-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ai-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
@media (max-width: 760px) {
  .ai-actions,
  .ai-grid {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
