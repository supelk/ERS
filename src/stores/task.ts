import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDatabaseStore } from './database'
import type { PracticeTask, TaskStatus } from '@/types/exam'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<PracticeTask[]>([])
  const loading = ref(false)

  // 按状态分组
  const tasksByStatus = computed(() => {
    const groups: Record<TaskStatus, PracticeTask[]> = {
      '未开始': [],
      '进行中': [],
      '已完成': [],
      '逾期': [],
    }
    for (const t of tasks.value) {
      groups[t.status]?.push(t)
    }
    return groups
  })

  // 按板块名称查找（用于显示关联的考试信息）
  const sectionNames = ref<Map<number, string>>(new Map())

  function getDb() {
    return useDatabaseStore().getDb()
  }

  // ============================================================
  // CRUD
  // ============================================================
  async function fetchTasks(sectionId?: number) {
    loading.value = true
    try {
      const db = getDb()
      let rows: any[]
      if (sectionId != null) {
        rows = await db.select<any[]>(
          'SELECT * FROM practice_tasks WHERE section_id = $1 ORDER BY created_at DESC',
          [sectionId]
        )
      } else {
        rows = await db.select<any[]>(
          'SELECT * FROM practice_tasks ORDER BY created_at DESC'
        )
      }
      tasks.value = rows.map(rowToTask)
      // 加载关联的板块名称
      await loadSectionNames()
    } finally {
      loading.value = false
    }
  }

  async function loadSectionNames() {
    const db = getDb()
    const nameMap = new Map<number, string>()
    for (const t of tasks.value) {
      if (t.section_id != null && !nameMap.has(t.section_id)) {
        const rows = await db.select<any[]>(
          `SELECT esr.section_name, er.exam_name
           FROM exam_section_records esr
           JOIN exam_records er ON esr.exam_id = er.exam_id
           WHERE esr.section_id = $1`,
          [t.section_id]
        )
        if (rows.length > 0) {
          nameMap.set(t.section_id, `${rows[0].exam_name} · ${rows[0].section_name}`)
        }
      }
    }
    sectionNames.value = nameMap
  }

  async function createTask(data: {
    section_id: number | null
    task_name: string
    total_questions: number
    completed_questions: number
    status: TaskStatus
    deadline: string | null
  }) {
    const db = getDb()
    const result = await db.execute(
      `INSERT INTO practice_tasks (section_id, task_name, total_questions, completed_questions, status, deadline)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.section_id, data.task_name, data.total_questions, data.completed_questions, data.status, data.deadline]
    )
    await fetchTasks()
    return result.lastInsertId
  }

  async function updateTask(taskId: number, data: Partial<PracticeTask>) {
    const db = getDb()
    // Build dynamic SET clause
    const fields: string[] = []
    const values: any[] = []
    let idx = 1

    const mappings: [keyof PracticeTask, string][] = [
      ['section_id', 'section_id'],
      ['task_name', 'task_name'],
      ['total_questions', 'total_questions'],
      ['completed_questions', 'completed_questions'],
      ['status', 'status'],
      ['deadline', 'deadline'],
    ]

    for (const [key, col] of mappings) {
      if (key in data) {
        fields.push(`${col} = $${idx}`)
        values.push((data as any)[key])
        idx++
      }
    }

    if (fields.length === 0) return

    values.push(taskId)
    await db.execute(
      `UPDATE practice_tasks SET ${fields.join(', ')} WHERE task_id = $${idx}`,
      values
    )
    await fetchTasks()
  }

  async function deleteTask(taskId: number) {
    const db = getDb()
    await db.execute('DELETE FROM practice_tasks WHERE task_id = $1', [taskId])
    await fetchTasks()
  }

  async function updateTaskStatus(taskId: number, status: TaskStatus) {
    await updateTask(taskId, { status })
  }

  // ============================================================
  // 自动逾期检测
  // ============================================================
  async function autoCheckOverdue() {
    const today = new Date().toISOString().split('T')[0]
    const db = getDb()
    await db.execute(
      `UPDATE practice_tasks
       SET status = '逾期'
       WHERE status IN ('未开始', '进行中')
         AND deadline IS NOT NULL
         AND deadline < $1`,
      [today]
    )
    if (tasks.value.length > 0) {
      await fetchTasks()
    }
  }

  // ============================================================
  // 获取可关联的板块列表
  // ============================================================
  async function getSectionOptions(): Promise<{ label: string; value: number }[]> {
    const db = getDb()
    const rows = await db.select<any[]>(
      `SELECT esr.section_id, esr.section_name, er.exam_name
       FROM exam_section_records esr
       JOIN exam_records er ON esr.exam_id = er.exam_id
       ORDER BY er.exam_date DESC
       LIMIT 100`
    )
    return rows.map((r) => ({
      label: `${r.exam_name} · ${r.section_name}`,
      value: r.section_id,
    }))
  }

  function rowToTask(r: any): PracticeTask {
    return {
      task_id: r.task_id,
      section_id: r.section_id,
      task_name: r.task_name,
      total_questions: r.total_questions,
      completed_questions: r.completed_questions,
      status: r.status,
      deadline: r.deadline,
      created_at: r.created_at,
    }
  }

  return {
    tasks,
    tasksByStatus,
    sectionNames,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    autoCheckOverdue,
    getSectionOptions,
  }
})
