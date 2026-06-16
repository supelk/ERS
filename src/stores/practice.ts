import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDatabaseStore } from './database'
import type { PracticeRecord, PracticeFormData } from '@/types/exam'

export const usePracticeStore = defineStore('practice', () => {
  const records = ref<PracticeRecord[]>([])
  const currentRecord = ref<PracticeRecord | null>(null)
  const loading = ref(false)

  function getDb() {
    return useDatabaseStore().getDb()
  }

  // ============================================================
  // 行映射
  // ============================================================
  function rowToRecord(r: any): PracticeRecord {
    return {
      id: r.id,
      section_name: r.section_name,
      practice_date: r.practice_date,
      total_questions: r.total_questions,
      correct_questions: r.correct_questions,
      accuracy: r.accuracy,
      used_time: r.used_time,
      avg_time_per_question: r.avg_time_per_question,
      notes: r.notes ?? null,
      created_at: r.created_at,
    }
  }

  // ============================================================
  // CRUD — 练习记录
  // ============================================================

  async function fetchRecords(): Promise<void> {
    loading.value = true
    try {
      const db = getDb()
      const rows = await db.select<any[]>(
        'SELECT * FROM practice_records ORDER BY practice_date DESC'
      )
      records.value = rows.map(rowToRecord)
    } finally {
      loading.value = false
    }
  }

  async function fetchRecordById(id: number): Promise<void> {
    loading.value = true
    try {
      const db = getDb()
      const rows = await db.select<any[]>(
        'SELECT * FROM practice_records WHERE id = $1',
        [id]
      )
      currentRecord.value = rows.length > 0 ? rowToRecord(rows[0]) : null
    } finally {
      loading.value = false
    }
  }

  async function createRecord(data: PracticeFormData): Promise<number> {
    const db = getDb()
    const result = await db.execute(
      `INSERT INTO practice_records
        (section_name, practice_date, total_questions, correct_questions, used_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.section_name,
        data.practice_date,
        data.total_questions,
        data.correct_questions,
        data.used_time,
        data.notes ?? null,
      ]
    )
    await fetchRecords()
    return result.lastInsertId as number
  }

  async function updateRecord(data: PracticeFormData): Promise<void> {
    const db = getDb()
    await db.execute(
      `UPDATE practice_records
       SET section_name = $1,
           practice_date = $2,
           total_questions = $3,
           correct_questions = $4,
           used_time = $5,
           notes = $6
       WHERE id = $7`,
      [
        data.section_name,
        data.practice_date,
        data.total_questions,
        data.correct_questions,
        data.used_time,
        data.notes ?? null,
        data.id,
      ]
    )
    await fetchRecords()
    // 如果当前正在查看该记录，同步更新
    if (currentRecord.value && currentRecord.value.id === data.id) {
      currentRecord.value = (await db.select<any[]>(
        'SELECT * FROM practice_records WHERE id = $1',
        [data.id]
      )).map(rowToRecord)[0] ?? null
    }
  }

  async function deleteRecord(id: number): Promise<void> {
    const db = getDb()
    await db.execute('DELETE FROM practice_records WHERE id = $1', [id])
    if (currentRecord.value && currentRecord.value.id === id) {
      currentRecord.value = null
    }
    await fetchRecords()
  }

  // ============================================================
  // 趋势数据（供首页图表）
  // ============================================================
  async function getTrends(
    sectionName?: string,
  ): Promise<{
    xLabels: string[]
    accuracyData: number[]
    avgTimeData: number[]
    totalQuestionsData: number[]
  }> {
    const db = getDb()
    const conds: string[] = []
    const params: any[] = []
    let idx = 1

    if (sectionName) {
      conds.push(`section_name = $${idx++}`)
      params.push(sectionName)
    }

    const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : ''
    const rows = await db.select<any[]>(
      `SELECT * FROM practice_records ${where} ORDER BY practice_date ASC`,
      params,
    )

    return {
      xLabels: rows.map((r) => r.practice_date),
      accuracyData: rows.map((r) => r.accuracy ?? 0),
      avgTimeData: rows.map((r) => r.avg_time_per_question ?? 0),
      totalQuestionsData: rows.map((r) => r.total_questions ?? 0),
    }
  }

  // ============================================================
  // 可用板块（供筛选下拉）
  // ============================================================
  async function getAvailableSections(): Promise<string[]> {
    const db = getDb()
    const rows = await db.select<any[]>(
      'SELECT DISTINCT section_name FROM practice_records ORDER BY section_name'
    )
    return rows.map((r) => r.section_name as string)
  }

  return {
    records,
    currentRecord,
    loading,
    fetchRecords,
    fetchRecordById,
    createRecord,
    updateRecord,
    deleteRecord,
    getTrends,
    getAvailableSections,
  }
})
