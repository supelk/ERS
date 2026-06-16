import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDatabaseStore } from './database'
import type { PracticeTask, TaskStatus } from '@/types/exam'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<PracticeTask[]>([])
  const loading = ref(false)

  function getDb() {
    return useDatabaseStore().getDb()
  }

  // 按状态分组（看板列）
  const tasksByStatus = computed(() => {
    const groups: Record<TaskStatus, PracticeTask[]> = {
      '未开始': [],
      '进行中': [],
      '已完成': [],
    }
    for (const t of tasks.value) {
      const status: TaskStatus = (t.status as string) === '逾期' ? '进行中' : t.status
      if (groups[status]) {
        groups[status].push(t)
      }
    }
    return groups
  })

  // ============================================================
  // 行映射
  // ============================================================
  function rowToTask(r: any): PracticeTask {
    const raw = r.status as string
    const status: TaskStatus = raw === '逾期' ? '进行中' : raw as TaskStatus
    return {
      task_id: r.task_id,
      task_name: r.task_name,
      status,
      created_at: r.created_at,
    }
  }

  // ============================================================
  // CRUD
  // ============================================================
  async function fetchTasks(): Promise<void> {
    loading.value = true
    try {
      const db = getDb()
      const rows = await db.select<any[]>(
        'SELECT * FROM practice_tasks ORDER BY created_at DESC'
      )
      tasks.value = rows.map(rowToTask)
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: {
    task_name: string
    status: TaskStatus
  }): Promise<number> {
    const db = getDb()
    const result = await db.execute(
      'INSERT INTO practice_tasks (task_name, status) VALUES ($1, $2)',
      [data.task_name, data.status]
    )
    await fetchTasks()
    return result.lastInsertId as number
  }

  async function updateTask(
    taskId: number,
    data: Partial<Pick<PracticeTask, 'task_name' | 'status'>>,
  ): Promise<void> {
    const db = getDb()
    const sets: string[] = []
    const params: any[] = []
    let idx = 1

    if (data.task_name !== undefined) {
      sets.push(`task_name = $${idx++}`)
      params.push(data.task_name)
    }
    if (data.status !== undefined) {
      sets.push(`status = $${idx++}`)
      params.push(data.status)
    }

    if (sets.length === 0) return

    params.push(taskId)
    await db.execute(
      `UPDATE practice_tasks SET ${sets.join(', ')} WHERE task_id = $${idx}`,
      params,
    )
    await fetchTasks()
  }

  async function deleteTask(taskId: number): Promise<void> {
    const db = getDb()
    await db.execute('DELETE FROM practice_tasks WHERE task_id = $1', [taskId])
    await fetchTasks()
  }

  /** 快速将任务标记为已完成（无需进入编辑） */
  async function completeTask(taskId: number): Promise<void> {
    await updateTask(taskId, { status: '已完成' })
  }

  return {
    tasks,
    tasksByStatus,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  }
})
