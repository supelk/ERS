import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/utils/api'
import type { PracticeTask, TaskStatus } from '@/types/exam'

const STATUS_NOT_STARTED = '未开始' as TaskStatus
const STATUS_IN_PROGRESS = '进行中' as TaskStatus
const STATUS_DONE = '已完成' as TaskStatus

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<PracticeTask[]>([])
  const loading = ref(false)

  const tasksByStatus = computed(() => {
    const groups = {
      [STATUS_NOT_STARTED]: [] as PracticeTask[],
      [STATUS_IN_PROGRESS]: [] as PracticeTask[],
      [STATUS_DONE]: [] as PracticeTask[],
    } as unknown as Record<TaskStatus, PracticeTask[]>
    for (const t of tasks.value) {
      const status: TaskStatus = (t.status as string) === '逾期' ? STATUS_IN_PROGRESS : t.status
      if (groups[status]) groups[status].push(t)
    }
    return groups
  })

  async function fetchTasks(): Promise<void> {
    loading.value = true
    try {
      tasks.value = (await api.get<{ tasks: PracticeTask[] }>('/practice-tasks')).tasks
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: { task_name: string; status: TaskStatus }): Promise<number> {
    const task = (await api.post<{ task: PracticeTask }>('/practice-tasks', data)).task
    await fetchTasks()
    return task.task_id
  }

  async function updateTask(taskId: number, data: Partial<Pick<PracticeTask, 'task_name' | 'status'>>): Promise<void> {
    await api.patch(`/practice-tasks/${taskId}`, data)
    await fetchTasks()
  }

  async function deleteTask(taskId: number): Promise<void> {
    await api.delete(`/practice-tasks/${taskId}`)
    await fetchTasks()
  }

  async function completeTask(taskId: number): Promise<void> {
    await updateTask(taskId, { status: STATUS_DONE })
  }

  return { tasks, tasksByStatus, loading, fetchTasks, createTask, updateTask, deleteTask, completeTask }
})
