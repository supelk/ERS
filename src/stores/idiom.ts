import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDatabaseStore } from './database'
import type { IdiomRecord } from '@/types/exam'

export const useIdiomStore = defineStore('idiom', () => {
  const records = ref<IdiomRecord[]>([])
  const currentRecord = ref<IdiomRecord | null>(null)
  const loading = ref(false)

  function getDb() {
    return useDatabaseStore().getDb()
  }

  function rowToRecord(r: any): IdiomRecord {
    return {
      id: r.id,
      word: r.word,
      definition: r.definition,
      notes: r.notes ?? null,
      created_at: r.created_at,
    }
  }

  // 筛选后的列表
  const filteredRecords = computed(() => records.value)

  // ============================================================
  // CRUD
  // ============================================================
  async function fetchRecords(keyword?: string): Promise<void> {
    loading.value = true
    try {
      const db = getDb()
      let rows: any[]
      if (keyword) {
        rows = await db.select<any[]>(
          "SELECT * FROM idiom_records WHERE word LIKE $1 ORDER BY created_at DESC",
          [`%${keyword}%`],
        )
      } else {
        rows = await db.select<any[]>(
          'SELECT * FROM idiom_records ORDER BY created_at DESC',
        )
      }
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
        'SELECT * FROM idiom_records WHERE id = $1',
        [id],
      )
      currentRecord.value = rows.length > 0 ? rowToRecord(rows[0]) : null
    } finally {
      loading.value = false
    }
  }

  async function createRecord(word: string, definition: string, notes: string | null): Promise<number> {
    const db = getDb()
    const result = await db.execute(
      'INSERT INTO idiom_records (word, definition, notes) VALUES ($1, $2, $3)',
      [word, definition, notes ?? null],
    )
    return result.lastInsertId as number
  }

  async function updateRecord(id: number, data: { word?: string; definition?: string; notes?: string | null }): Promise<void> {
    const db = getDb()
    const sets: string[] = []
    const params: any[] = []
    let idx = 1

    if (data.word !== undefined) {
      sets.push(`word = $${idx++}`)
      params.push(data.word)
    }
    if (data.definition !== undefined) {
      sets.push(`definition = $${idx++}`)
      params.push(data.definition)
    }
    if (data.notes !== undefined) {
      sets.push(`notes = $${idx++}`)
      params.push(data.notes ?? null)
    }

    if (sets.length === 0) return

    params.push(id)
    await db.execute(
      `UPDATE idiom_records SET ${sets.join(', ')} WHERE id = $${idx}`,
      params,
    )
  }

  async function deleteRecord(id: number): Promise<void> {
    const db = getDb()
    await db.execute('DELETE FROM idiom_records WHERE id = $1', [id])
    if (currentRecord.value?.id === id) {
      currentRecord.value = null
    }
  }

  /**
   * 随机抽取一条记录（用于复习闪卡）
   */
  async function getRandomRecord(): Promise<IdiomRecord | null> {
    const db = getDb()
    const rows = await db.select<any[]>(
      'SELECT * FROM idiom_records ORDER BY RANDOM() LIMIT 1',
    )
    return rows.length > 0 ? rowToRecord(rows[0]) : null
  }

  return {
    records,
    currentRecord,
    filteredRecords,
    loading,
    fetchRecords,
    fetchRecordById,
    createRecord,
    updateRecord,
    deleteRecord,
    getRandomRecord,
  }
})
