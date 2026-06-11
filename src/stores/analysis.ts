import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDatabaseStore } from './database'
import { getParentSectionName, isParentSection } from '@/utils/constants'
import type {
  SectionComparison,
  TimeDistribution,
  TrendPoint,
  MultiExamSectionTrend,
} from '@/types/exam'

export const useAnalysisStore = defineStore('analysis', () => {
  const loading = ref(false)

  function getDb() {
    return useDatabaseStore().getDb()
  }

  // ============================================================
  // 单次考试：板块正确率对比（实际 vs 目标）
  // ============================================================
  async function getSectionComparisons(examId: number): Promise<SectionComparison[]> {
    const db = getDb()
    const rows = await db.select<any[]>(
      `SELECT section_name, accuracy, next_target_accuracy
       FROM exam_section_records
       WHERE exam_id = $1
       ORDER BY section_id`,
      [examId]
    )
    return rows.map((r) => ({
      section_name: r.section_name,
      actual: r.accuracy ?? 0,
      target: r.next_target_accuracy ?? 0,
      diff: (r.accuracy ?? 0) - (r.next_target_accuracy ?? 0),
      isAboveTarget: (r.accuracy ?? 0) >= (r.next_target_accuracy ?? 0),
    }))
  }

  // ============================================================
  // 单次考试：时间分配数据（用时占比 vs 题量占比）
  // ============================================================
  async function getTimeDistribution(examId: number): Promise<TimeDistribution[]> {
    const db = getDb()
    const rows = await db.select<any[]>(
      `SELECT section_name, used_time, total_questions
       FROM exam_section_records
       WHERE exam_id = $1
       ORDER BY section_id`,
      [examId]
    )
    const totalTime = rows.reduce((s, r) => s + (r.used_time ?? 0), 0)
    const totalQuestions = rows.reduce((s, r) => s + (r.total_questions ?? 0), 0)

    return rows.map((r) => ({
      section_name: r.section_name,
      time_percent: totalTime > 0 ? ((r.used_time ?? 0) / totalTime) * 100 : 0,
      question_percent: totalQuestions > 0 ? ((r.total_questions ?? 0) / totalQuestions) * 100 : 0,
    }))
  }

  // ============================================================
  // 单次考试：得分效率数据
  // ============================================================
  async function getEfficiencyData(examId: number): Promise<{ section_name: string; value: number }[]> {
    const db = getDb()
    const rows = await db.select<any[]>(
      `SELECT section_name, score_efficiency
       FROM exam_section_records
       WHERE exam_id = $1
       ORDER BY section_id`,
      [examId]
    )
    return rows.map((r) => ({
      section_name: r.section_name,
      value: r.score_efficiency ?? 0,
    }))
  }

  // ============================================================
  // 多考试：总分趋势（支持筛选）
  // ============================================================
  async function getScoreTrend(filterType1?: string, filterType?: string): Promise<TrendPoint[]> {
    const db = getDb()
    const conds: string[] = []
    const params: any[] = []
    let idx = 1

    if (filterType1) {
      conds.push(`exam_type_1 = $${idx++}`)
      params.push(filterType1)
    }
    if (filterType) {
      conds.push(`exam_type = $${idx++}`)
      params.push(filterType)
    }

    const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : ''
    const rows = await db.select<any[]>(
      `SELECT exam_name, exam_date, total_score
       FROM exam_records ${where}
       ORDER BY exam_date ASC`,
      params
    )
    return rows.map((r) => ({
      label: r.exam_name || r.exam_date,
      value: r.total_score ?? 0,
    }))
  }

  // ============================================================
  // 多考试：所有一级板块正确率趋势（支持筛选）
  // 自动聚合：无论是旧数据（子项直接作为 section_name）还是新数据（有 parent_section_name），
  // 都按一级板块聚合
  // ============================================================
  async function getAllSectionTrends(filterType1?: string, filterType?: string): Promise<MultiExamSectionTrend[]> {
    const db = getDb()

    // 构建筛选条件
    const conds: string[] = []
    const filterParams: any[] = []
    let idx = 1

    if (filterType1) {
      conds.push(`er.exam_type_1 = $${idx++}`)
      filterParams.push(filterType1)
    }
    if (filterType) {
      conds.push(`er.exam_type = $${idx++}`)
      filterParams.push(filterType)
    }
    const filterWhere = conds.length > 0 ? `AND ${conds.join(' AND ')}` : ''

    // 查询所有板块数据（包括一级和二级），带筛选
    const rows = await db.select<any[]>(
      `SELECT er.exam_name, er.exam_date, esr.section_name, esr.parent_section_name, esr.accuracy
       FROM exam_section_records esr
       JOIN exam_records er ON esr.exam_id = er.exam_id
       WHERE 1=1 ${filterWhere}
       ORDER BY er.exam_date ASC`,
      filterParams
    )

    // 将每条记录映射到其逻辑一级板块：
    // - 如果有 parent_section_name，用它
    // - 如果 section_name 本身是一级板块，用它
    // - 如果 section_name 是二级板块（在层级定义中），查其父级
    const parentMap = new Map<string, Map<string, number[]>>()
    // parentMap: parentName -> (examLabel -> [accuracy values])

    for (const row of rows) {
      let parentName: string
      if (row.parent_section_name) {
        parentName = row.parent_section_name
      } else if (isParentSection(row.section_name)) {
        parentName = row.section_name
      } else {
        const p = getParentSectionName(row.section_name)
        parentName = p || row.section_name // fallback to itself
      }

      const label = row.exam_name || row.exam_date
      if (!parentMap.has(parentName)) {
        parentMap.set(parentName, new Map())
      }
      const examMap = parentMap.get(parentName)!
      if (!examMap.has(label)) {
        examMap.set(label, [])
      }
      examMap.get(label)!.push(row.accuracy ?? 0)
    }

    // 对每个一级板块，每个考试，取平均正确率
    const results: MultiExamSectionTrend[] = []
    for (const [parentName, examMap] of parentMap) {
      const dataPoints: TrendPoint[] = []
      for (const [label, accuracies] of examMap) {
        const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length
        dataPoints.push({ label, value: avg })
      }
      // 按日期排序（label 是 exam_name | exam_date，日期在前）
      // 简单按原顺序保持
      results.push({ section_name: parentName, dataPoints })
    }

    return results
  }

  // ============================================================
  // 单次考试：汇总统计
  // ============================================================
  async function getExamSummary(examId: number) {
    const db = getDb()
    // 考试主记录
    const examRows = await db.select<any[]>(
      'SELECT * FROM exam_records WHERE exam_id = $1',
      [examId]
    )
    if (examRows.length === 0) return null

    const exam = examRows[0]

    // 板块统计
    const sectionRows = await db.select<any[]>(
      `SELECT
         COUNT(*) as section_count,
         AVG(accuracy) as avg_accuracy,
         MAX(accuracy) as max_accuracy,
         MIN(accuracy) as min_accuracy,
         SUM(total_questions) as total_questions,
         SUM(correct_questions) as total_correct,
         SUM(used_time) as total_used_time
       FROM exam_section_records
       WHERE exam_id = $1`,
      [examId]
    )
    const stats = sectionRows[0]

    const overallAccuracy = stats.total_questions > 0
      ? (stats.total_correct / stats.total_questions) * 100
      : 0

    return {
      exam_name: exam.exam_name,
      exam_date: exam.exam_date,
      exam_type_1: exam.exam_type_1,
      exam_type: exam.exam_type,
      total_score: exam.total_score,
      full_score: exam.full_score,
      current_target_score: exam.current_target_score,
      next_target_score: exam.next_target_score,
      total_time: exam.total_time,
      section_count: stats.section_count ?? 0,
      avg_accuracy: stats.avg_accuracy ?? 0,
      overall_accuracy: overallAccuracy,
      total_questions: stats.total_questions ?? 0,
      total_correct: stats.total_correct ?? 0,
      total_used_time: stats.total_used_time ?? 0,
      target_diff: exam.current_target_score != null
        ? exam.total_score - exam.current_target_score
        : null,
    }
  }

  return {
    loading,
    getSectionComparisons,
    getTimeDistribution,
    getEfficiencyData,
    getScoreTrend,
    getAllSectionTrends,
    getExamSummary,
  }
})
