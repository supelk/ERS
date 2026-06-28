<script setup lang="ts">
import { ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NInput,
  NList,
  NListItem,
  NSpace,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import { useTaskStore } from '@/stores/task'
import type { MultiExamSectionTrend, TrendPoint } from '@/types/exam'
import { analyzeHistory, type HistoryAiResult } from '@/utils/examAiAnalysis'

const props = defineProps<{
  show: boolean
  filterLabel: string
  selectedSection: string
  scoreTrend: TrendPoint[]
  sectionTimeTrends: MultiExamSectionTrend[]
  sectionEfficiencyTrends: MultiExamSectionTrend[]
  sectionAccuracyTrends: MultiExamSectionTrend[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  jumpSection: [section: string]
}>()

const message = useMessage()
const taskStore = useTaskStore()
const loading = ref(false)
const result = ref<HistoryAiResult | null>(null)
const editableTasks = ref('')

async function generate() {
  if (props.scoreTrend.length < 2) {
    message.info('当前筛选条件下少于 2 场考试，暂不生成历史诊断')
    return
  }
  loading.value = true
  try {
    const aiResult = await analyzeHistory({
      filterLabel: props.filterLabel || '全部考试',
      selectedSection: props.selectedSection,
      scoreTrend: props.scoreTrend,
      sectionTimeTrends: props.sectionTimeTrends,
      sectionEfficiencyTrends: props.sectionEfficiencyTrends,
      sectionAccuracyTrends: props.sectionAccuracyTrends,
    })
    result.value = aiResult
    editableTasks.value = aiResult.targetTasks.join('\n')
  } catch (e) {
    message.error('AI 历史诊断失败：' + String(e))
  } finally {
    loading.value = false
  }
}

async function createTasks() {
  const tasks = editableTasks.value
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-\d.、\s]+/, '').trim())
    .filter(Boolean)
  if (tasks.length === 0) {
    message.warning('请先生成或填写周期目标任务')
    return
  }
  for (const task of tasks) {
    await taskStore.createTask({ task_name: task, status: '未开始' })
  }
  message.success(`已生成 ${tasks.length} 个周期目标任务`)
}
</script>

<template>
  <NCard v-if="show" size="small" class="history-ai-card">
    <NSpace vertical :size="12">
      <div class="ai-actions">
        <div>
          <NText strong>AI 历史诊断</NText>
          <div class="subline">严格匹配当前筛选条件：{{ filterLabel || '全部考试' }}</div>
        </div>
        <NSpace>
          <NButton size="small" :loading="loading" type="primary" @click="generate">
            {{ result ? '重新生成' : '生成诊断' }}
          </NButton>
          <NButton size="small" quaternary @click="emit('update:show', false)">收起</NButton>
        </NSpace>
      </div>

      <NAlert v-if="scoreTrend.length < 2" type="warning" :bordered="false">
        当前筛选条件下少于 2 场考试，历史变化趋势不足。请放宽筛选或录入更多同类考试。
      </NAlert>

      <template v-if="result">
        <NAlert type="success" :bordered="false">{{ result.trendSummary }}</NAlert>

        <div class="ai-grid">
          <div>
            <NText strong>量化变化</NText>
            <NList size="small">
              <NListItem v-for="item in result.quantitativeChanges" :key="item">{{ item }}</NListItem>
            </NList>
          </div>
          <div>
            <NText strong>阶段优先级</NText>
            <NList size="small">
              <NListItem v-for="item in result.priorities" :key="item">{{ item }}</NListItem>
            </NList>
          </div>
        </div>

        <div class="tag-row">
          <NTag v-for="item in result.progressSections" :key="'p-' + item" type="success" size="small" :bordered="false">
            进步 · {{ item }}
          </NTag>
          <NTag v-for="item in result.bottleneckSections" :key="'b-' + item" type="warning" size="small" :bordered="false">
            瓶颈 · {{ item }}
          </NTag>
        </div>

        <div>
          <NText strong>共性问题</NText>
          <NList size="small">
            <NListItem v-for="item in result.commonProblems" :key="item">{{ item }}</NListItem>
          </NList>
        </div>

        <NInput
          v-model:value="editableTasks"
          type="textarea"
          placeholder="每行一个周期目标任务，可编辑后生成"
          :autosize="{ minRows: 3, maxRows: 6 }"
        />

        <NSpace>
          <NButton
            v-if="result.focusSection"
            size="small"
            @click="emit('jumpSection', result.focusSection)"
          >
            查看{{ result.focusSection }}趋势
          </NButton>
          <NButton size="small" @click="createTasks">生成周期目标任务</NButton>
        </NSpace>
      </template>
    </NSpace>
  </NCard>
</template>

<style scoped>
.history-ai-card {
  margin-bottom: 16px;
}
.ai-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.subline {
  margin-top: 2px;
  color: var(--text-tertiary);
  font-size: 12px;
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
