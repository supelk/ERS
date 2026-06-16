<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NCard,
  NGrid,
  NGi,
  NButton,
  NSpin,
  NEmpty,
  NText,
  useMessage,
} from 'naive-ui'
import TaskForm from '@/components/task/TaskForm.vue'
import TaskColumn from '@/components/task/TaskColumn.vue'
import { useTaskStore } from '@/stores/task'
import { useExamStore } from '@/stores/exam'
import type { PracticeTask, TaskStatus } from '@/types/exam'
import { TASK_STATUS_COLORS } from '@/utils/constants'
import { formatPercent } from '@/utils/formatters'

const message = useMessage()
const taskStore = useTaskStore()
const examStore = useExamStore()

const loading = ref(false)
const showForm = ref(false)
const editTask = ref<PracticeTask | null>(null)

const latestSectionGoals = ref<
  { section_name: string; exam_name: string; accuracy: number; target: number }[]
>([])

onMounted(async () => {
  loading.value = true
  try {
    await taskStore.fetchTasks()
    await loadGoals()
  } catch (e) {
    message.error('加载数据失败: ' + String(e))
  } finally {
    loading.value = false
  }
})

async function loadGoals() {
  if (examStore.exams.length === 0) {
    await examStore.fetchExams()
  }
  if (examStore.exams.length > 0) {
    const latestExam = examStore.exams[0]
    await examStore.fetchExamById(latestExam.exam_id)
    latestSectionGoals.value = examStore.currentSections
      .filter((s) => s.next_target_accuracy != null)
      .map((s) => ({
        section_name: s.section_name,
        exam_name: latestExam.exam_name,
        accuracy: s.accuracy,
        target: s.next_target_accuracy ?? 0,
      }))
  }
}

function handleOpenCreate() {
  editTask.value = null
  showForm.value = true
}

function handleEdit(task: PracticeTask) {
  editTask.value = task
  showForm.value = true
}

async function handleDelete(task: PracticeTask) {
  try {
    await taskStore.deleteTask(task.task_id)
    message.success('任务已删除')
  } catch (e) {
    message.error('删除失败: ' + String(e))
  }
}

async function handleComplete(task: PracticeTask) {
  if (task.status === '已完成') return
  try {
    await taskStore.completeTask(task.task_id)
    message.success('任务已完成')
  } catch (e) {
    message.error('操作失败: ' + String(e))
  }
}

async function handleFormSubmit(data: {
  task_name: string
  status: TaskStatus
}) {
  try {
    if (editTask.value) {
      await taskStore.updateTask(editTask.value.task_id, data)
      message.success('任务已更新')
    } else {
      await taskStore.createTask(data)
      message.success('任务已创建')
    }
    showForm.value = false
    editTask.value = null
  } catch (e) {
    message.error('保存失败: ' + String(e))
  }
}
</script>

<template>
  <div>
    <div class="goals-header">
      <h2 class="goals-title">目标与计划</h2>
      <NButton type="primary" @click="handleOpenCreate">+ 新建任务</NButton>
    </div>

    <NSpin :show="loading">
      <!-- 目标摘要 -->
      <NCard title="板块目标摘要" size="small" style="margin-bottom: 16px">
        <template v-if="latestSectionGoals.length > 0">
          <NGrid :cols="3" :x-gap="12">
            <NGi v-for="goal in latestSectionGoals" :key="goal.section_name">
              <div class="goal-item">
                <NText strong>{{ goal.section_name }}</NText>
                <NText depth="3" style="font-size: 12px">来自：{{ goal.exam_name }}</NText>
                <span style="font-size: 13px">
                  当前 <b :style="{ color: goal.accuracy >= goal.target ? 'var(--success)' : 'var(--error)' }">
                    {{ formatPercent(goal.accuracy) }}
                  </b>
                  → 目标 <b style="color: var(--primary)">{{ formatPercent(goal.target) }}</b>
                </span>
              </div>
            </NGi>
          </NGrid>
        </template>
        <template v-else>
          <NEmpty description="还没有设置板块目标，去录入考试并填写下阶段目标吧" size="small" />
        </template>
      </NCard>

      <!-- 任务看板 -->
        <p style="margin: 0 0 12px; font-size: 13px; color: var(--text-tertiary)">
          看板用于记录方向性任务（定性不定量），由你自己判断何时完成。例如：加强言语理解、巩固资料分析。
        </p>
        <template v-if="taskStore.tasks.length > 0">
          <NGrid :cols="3" :x-gap="12">
            <NGi v-for="(statusKey, _) in (['未开始','进行中','已完成'] as TaskStatus[])" :key="statusKey">
              <TaskColumn
                :title="statusKey"
                :tasks="taskStore.tasksByStatus[statusKey]"
                :color="TASK_STATUS_COLORS[statusKey]"
                @edit="handleEdit"
                @delete="handleDelete"
                @complete="handleComplete"
              />
            </NGi>
          </NGrid>
        </template>
        <template v-else>
          <NEmpty description="还没有方向任务" size="small">
            <template #extra>
              <NButton type="primary" @click="handleOpenCreate">创建第一个任务</NButton>
            </template>
          </NEmpty>
        </template>
      </NCard>
    </NSpin>

    <TaskForm
      :show="showForm"
      :edit-data="editTask"
      @update:show="(v: boolean) => showForm = v"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<style scoped>
.goals-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.goals-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-display);
}
.goal-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}
</style>
