import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDatabaseStore } from './database'
import type {
  ExamRecord,
  ExamSectionRecord,
  ExamFormData,
  ExamFilters,
} from '@/types/exam'

export const useExamStore = defineStore('exam', () => {
  // ============================================================
  // State
  // ============================================================
  const exams = ref<ExamRecord[]>([])
  const currentExam = ref<ExamRecord | null>(null)
  const currentSections = ref<ExamSectionRecord[]>([])
  const loading = ref(false)
  const filters = ref<ExamFilters>({})

  // ============================================================
  // Getters
  // ============================================================
  const filteredExams = computed(() => {
    let list = exams.value
    if (filters.value.keyword) {
      const kw = filters.value.keyword.toLowerCase()
      list = list.filter((e) => e.exam_name.toLowerCase().includes(kw))
    }
    if (filters.value.exam_type_1) {
      list = list.filter((e) => e.exam_type_1 === filters.value.exam_type_1)
    }
    if (filters.value.exam_type) {
      list = list.filter((e) => e.exam_type === filters.value.exam_type)
    }
    // Already sorted by exam_date DESC from query
    return list
  })

  // ============================================================
  // Helpers
  // ============================================================
  function getDb() {
    return useDatabaseStore().getDb()
  }

  function parseSections(rows: any[]): ExamSectionRecord[] {
    return rows.map((r) => ({
      section_id: r.section_id,
      exam_id: r.exam_id,
      section_name: r.section_name,
      parent_section_name: r.parent_section_name ?? null,
      total_questions: r.total_questions,
      correct_questions: r.correct_questions,
      per_question_score: r.per_question_score,
      used_time: r.used_time,
      unattempted_questions: r.unattempted_questions,
      accuracy: r.accuracy,
      score_efficiency: r.score_efficiency,
      analysis: r.analysis,
      plan: r.plan,
      next_target_accuracy: r.next_target_accuracy,
      next_target_time: r.next_target_time,
      next_target_efficiency: r.next_target_efficiency,
    }))
  }

  function rowToExam(r: any): ExamRecord {
    return {
      exam_id: r.exam_id,
      exam_name: r.exam_name,
      exam_date: r.exam_date,
      exam_type_1: r.exam_type_1,
      exam_type: r.exam_type,
      total_score: r.total_score,
      full_score: r.full_score,
      current_target_score: r.current_target_score,
      next_target_score: r.next_target_score,
      total_time: r.total_time,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  }

  // ============================================================
  // Actions: Exam CRUD
  // ============================================================
  async function fetchExams() {
    loading.value = true
    try {
      const db = getDb()
      const rows = await db.select<any[]>(
        'SELECT * FROM exam_records ORDER BY exam_date DESC'
      )
      exams.value = rows.map(rowToExam)
    } finally {
      loading.value = false
    }
  }

  async function fetchExamById(examId: number) {
    loading.value = true
    try {
      const db = getDb()
      const rows = await db.select<any[]>(
        'SELECT * FROM exam_records WHERE exam_id = $1',
        [examId]
      )
      if (rows.length === 0) {
        currentExam.value = null
        currentSections.value = []
        return
      }
      currentExam.value = rowToExam(rows[0])

      const sectionRows = await db.select<any[]>(
        'SELECT * FROM exam_section_records WHERE exam_id = $1 ORDER BY section_id',
        [examId]
      )
      currentSections.value = parseSections(sectionRows)
    } finally {
      loading.value = false
    }
  }

  async function createExam(data: ExamFormData) {
    const db = getDb()
    await db.execute('BEGIN TRANSACTION')
    try {
      const result = await db.execute(
        `INSERT INTO exam_records
          (exam_name, exam_date, exam_type_1, exam_type, total_score, full_score,
           current_target_score, next_target_score, total_time, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          data.exam_name,
          data.exam_date,
          data.exam_type_1,
          data.exam_type,
          data.total_score,
          data.full_score,
          data.current_target_score,
          data.next_target_score,
          data.total_time,
          data.notes,
        ]
      )
      const examId = result.lastInsertId

      // Insert sections
      for (const s of data.sections) {
        await db.execute(
          `INSERT INTO exam_section_records
            (exam_id, section_name, parent_section_name, total_questions, correct_questions,
             per_question_score, used_time, unattempted_questions,
             analysis, plan, next_target_accuracy, next_target_time,
             next_target_efficiency)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            examId,
            s.section_name,
            s.parent_section_name,
            s.total_questions,
            s.correct_questions,
            s.per_question_score,
            s.used_time,
            s.unattempted_questions,
            s.analysis,
            s.plan,
            s.next_target_accuracy,
            s.next_target_time,
            s.next_target_efficiency,
          ]
        )
      }

      await db.execute('COMMIT')
      // Refresh list
      await fetchExams()
      return examId
    } catch (e) {
      await db.execute('ROLLBACK')
      throw e
    }
  }

  async function updateExam(data: ExamFormData) {
    const db = getDb()
    await db.execute('BEGIN TRANSACTION')
    try {
      await db.execute(
        `UPDATE exam_records SET
          exam_name=$1, exam_date=$2, exam_type_1=$3, exam_type=$4,
          total_score=$5, full_score=$6, current_target_score=$7,
          next_target_score=$8, total_time=$9, notes=$10
         WHERE exam_id=$11`,
        [
          data.exam_name,
          data.exam_date,
          data.exam_type_1,
          data.exam_type,
          data.total_score,
          data.full_score,
          data.current_target_score,
          data.next_target_score,
          data.total_time,
          data.notes,
          data.exam_id,
        ]
      )

      // Delete removed sections
      const keptIds = data.sections
        .map((s) => s.section_id)
        .filter((id) => id > 0)
      if (keptIds.length > 0) {
        const placeholders = keptIds.map((_, i) => `$${i + 2}`).join(',')
        await db.execute(
          `DELETE FROM exam_section_records WHERE exam_id=$1 AND section_id NOT IN (${placeholders})`,
          [data.exam_id, ...keptIds]
        )
      } else {
        await db.execute(
          'DELETE FROM exam_section_records WHERE exam_id=$1',
          [data.exam_id]
        )
      }

      // Upsert sections
      for (const s of data.sections) {
        if (s.section_id > 0) {
          // Update existing
          await db.execute(
            `UPDATE exam_section_records SET
              section_name=$1, parent_section_name=$2, total_questions=$3, correct_questions=$4,
              per_question_score=$5, used_time=$6, unattempted_questions=$7,
              analysis=$8, plan=$9, next_target_accuracy=$10,
              next_target_time=$11, next_target_efficiency=$12
             WHERE section_id=$13`,
            [
              s.section_name,
              s.parent_section_name,
              s.total_questions,
              s.correct_questions,
              s.per_question_score,
              s.used_time,
              s.unattempted_questions,
              s.analysis,
              s.plan,
              s.next_target_accuracy,
              s.next_target_time,
              s.next_target_efficiency,
              s.section_id,
            ]
          )
        } else {
          // Insert new
          await db.execute(
            `INSERT INTO exam_section_records
              (exam_id, section_name, total_questions, correct_questions,
               per_question_score, used_time, unattempted_questions,
               analysis, plan, next_target_accuracy, next_target_time,
               next_target_efficiency)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              data.exam_id,
              s.section_name,
              s.total_questions,
              s.correct_questions,
              s.per_question_score,
              s.used_time,
              s.unattempted_questions,
              s.analysis,
              s.plan,
              s.next_target_accuracy,
              s.next_target_time,
              s.next_target_efficiency,
            ]
          )
        }
      }

      await db.execute('COMMIT')
      await fetchExams()
      // Refresh current exam if viewing it
      if (currentExam.value?.exam_id === data.exam_id) {
        await fetchExamById(data.exam_id)
      }
    } catch (e) {
      await db.execute('ROLLBACK')
      throw e
    }
  }

  async function deleteExam(examId: number) {
    const db = getDb()
    await db.execute('DELETE FROM exam_records WHERE exam_id = $1', [examId])
    await fetchExams()
  }

  // ============================================================
  // Actions: Section CRUD (individual)
  // ============================================================
  async function fetchSections(examId: number) {
    const db = getDb()
    const rows = await db.select<any[]>(
      'SELECT * FROM exam_section_records WHERE exam_id = $1 ORDER BY section_id',
      [examId]
    )
    currentSections.value = parseSections(rows)
  }

  async function updateSection(section: ExamSectionRecord) {
    const db = getDb()
    await db.execute(
      `UPDATE exam_section_records SET
        section_name=$1, parent_section_name=$2, total_questions=$3, correct_questions=$4,
        per_question_score=$5, used_time=$6, unattempted_questions=$7,
        analysis=$8, plan=$9, next_target_accuracy=$10,
        next_target_time=$11, next_target_efficiency=$12
       WHERE section_id=$13`,
      [
        section.section_name,
        section.parent_section_name,
        section.total_questions,
        section.correct_questions,
        section.per_question_score,
        section.used_time,
        section.unattempted_questions,
        section.analysis,
        section.plan,
        section.next_target_accuracy,
        section.next_target_time,
        section.next_target_efficiency,
        section.section_id,
      ]
    )
    // Refresh the section from DB to get updated computed columns
    const rows = await db.select<any[]>(
      'SELECT * FROM exam_section_records WHERE section_id = $1',
      [section.section_id]
    )
    if (rows.length > 0) {
      const idx = currentSections.value.findIndex(
        (s) => s.section_id === section.section_id
      )
      if (idx >= 0) {
        currentSections.value[idx] = parseSections(rows)[0]
      }
    }
  }

  // ============================================================
  // Actions: Filters
  // ============================================================
  function setFilters(f: ExamFilters) {
    filters.value = { ...f }
  }

  function clearFilters() {
    filters.value = {}
  }

  return {
    exams,
    currentExam,
    currentSections,
    loading,
    filters,
    filteredExams,
    fetchExams,
    fetchExamById,
    createExam,
    updateExam,
    deleteExam,
    fetchSections,
    updateSection,
    setFilters,
    clearFilters,
  }
})
