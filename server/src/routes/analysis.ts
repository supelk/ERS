import type { FastifyInstance } from 'fastify'
import { one, query } from '../db.js'

function examFilter(queryObj: any, alias = '') {
  const conds: string[] = []
  const params: unknown[] = []
  let idx = 2
  const p = alias ? `${alias}.` : ''
  if (queryObj.filterType1) { conds.push(`${p}exam_type_1 = $${idx++}`); params.push(queryObj.filterType1) }
  if (queryObj.filterType) { conds.push(`${p}exam_type = $${idx++}`); params.push(queryObj.filterType) }
  if (queryObj.dateFrom) { conds.push(`${p}exam_date >= $${idx++}`); params.push(queryObj.dateFrom) }
  if (queryObj.dateTo) { conds.push(`${p}exam_date <= $${idx++}`); params.push(queryObj.dateTo) }
  return { sql: conds.length ? ` AND ${conds.join(' AND ')}` : '', params }
}

function groupTrend(rows: any[], valueKey: string) {
  const parentMap = new Map<string, Map<string, number[]>>()
  for (const row of rows) {
    const sectionName = row.section_name
    const label = row.exam_name || row.exam_date
    if (!parentMap.has(sectionName)) parentMap.set(sectionName, new Map())
    const examMap = parentMap.get(sectionName)!
    if (!examMap.has(label)) examMap.set(label, [])
    examMap.get(label)!.push(row[valueKey] ?? 0)
  }
  return [...parentMap.entries()].map(([section_name, examMap]) => ({
    section_name,
    dataPoints: [...examMap.entries()].map(([label, values]) => ({
      label,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    })),
  }))
}

export async function analysisRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/analysis/exams/:id/section-comparisons', { preHandler: app.authenticate }, async (request) => {
    const rows = await query<any>(
      `SELECT section_name, accuracy, next_target_accuracy FROM exam_section_records
       WHERE user_id=$1 AND exam_id=$2 AND (parent_section_name IS NULL OR parent_section_name = '') ORDER BY section_id`,
      [request.currentUser.id, Number(request.params.id)],
    )
    return {
      items: rows.map((r) => ({
        section_name: r.section_name,
        actual: r.accuracy ?? 0,
        target: r.next_target_accuracy ?? 0,
        diff: (r.accuracy ?? 0) - (r.next_target_accuracy ?? 0),
        isAboveTarget: (r.accuracy ?? 0) >= (r.next_target_accuracy ?? 0),
      })),
    }
  })

  app.get<{ Params: { id: string } }>('/analysis/exams/:id/time-distribution', { preHandler: app.authenticate }, async (request) => {
    const rows = await query<any>(
      `SELECT section_name, used_time, total_questions FROM exam_section_records
       WHERE user_id=$1 AND exam_id=$2 AND (parent_section_name IS NULL OR parent_section_name = '') ORDER BY section_id`,
      [request.currentUser.id, Number(request.params.id)],
    )
    const totalTime = rows.reduce((s, r) => s + (r.used_time ?? 0), 0)
    const totalQuestions = rows.reduce((s, r) => s + (r.total_questions ?? 0), 0)
    return {
      items: rows.map((r) => ({
        section_name: r.section_name,
        time_percent: totalTime > 0 ? ((r.used_time ?? 0) / totalTime) * 100 : 0,
        question_percent: totalQuestions > 0 ? ((r.total_questions ?? 0) / totalQuestions) * 100 : 0,
      })),
    }
  })

  app.get<{ Params: { id: string } }>('/analysis/exams/:id/efficiency', { preHandler: app.authenticate }, async (request) => {
    const rows = await query<any>(
      `SELECT section_name, score_efficiency FROM exam_section_records
       WHERE user_id=$1 AND exam_id=$2 AND (parent_section_name IS NULL OR parent_section_name = '') ORDER BY section_id`,
      [request.currentUser.id, Number(request.params.id)],
    )
    return { items: rows.map((r) => ({ section_name: r.section_name, value: r.score_efficiency ?? 0 })) }
  })

  app.get<{ Params: { id: string } }>('/analysis/exams/:id/summary', { preHandler: app.authenticate }, async (request) => {
    const exam = await one<any>('SELECT * FROM exam_records WHERE user_id=$1 AND exam_id=$2', [request.currentUser.id, Number(request.params.id)])
    if (!exam) return { summary: null }
    const stats = await one<any>(
      `SELECT COUNT(*) section_count, AVG(accuracy) avg_accuracy, SUM(total_questions) total_questions,
       SUM(correct_questions) total_correct, SUM(used_time) total_used_time
       FROM exam_section_records WHERE user_id=$1 AND exam_id=$2 AND (parent_section_name IS NULL OR parent_section_name = '')`,
      [request.currentUser.id, Number(request.params.id)],
    )
    const overall = stats?.total_questions > 0 ? (stats.total_correct / stats.total_questions) * 100 : 0
    return {
      summary: {
        ...exam,
        section_count: Number(stats?.section_count ?? 0),
        avg_accuracy: stats?.avg_accuracy ?? 0,
        overall_accuracy: overall,
        total_questions: stats?.total_questions ?? 0,
        total_correct: stats?.total_correct ?? 0,
        total_used_time: stats?.total_used_time ?? 0,
        target_diff: exam.current_target_score != null ? exam.total_score - exam.current_target_score : null,
      },
    }
  })

  app.get<{ Querystring: any }>('/analysis/score-trend', { preHandler: app.authenticate }, async (request) => {
    const f = examFilter(request.query)
    const rows = await query<any>(
      `SELECT exam_name, exam_date, total_score FROM exam_records WHERE user_id=$1 ${f.sql} ORDER BY exam_date ASC`,
      [request.currentUser.id, ...f.params],
    )
    return { items: rows.map((r) => ({ label: r.exam_name || r.exam_date, value: r.total_score ?? 0 })) }
  })

  app.get<{ Querystring: any }>('/analysis/section-trends/:metric', { preHandler: app.authenticate }, async (request) => {
    const metricMap: Record<string, string> = {
      accuracy: 'accuracy',
      time: 'used_time',
      efficiency: 'score_efficiency',
    }
    const metric = metricMap[(request.params as any).metric] || 'accuracy'
    const f = examFilter(request.query, 'er')
    const rows = await query<any>(
      `SELECT er.exam_name, er.exam_date, esr.section_name, esr.${metric}
       FROM exam_section_records esr JOIN exam_records er ON esr.exam_id=er.exam_id
       WHERE esr.user_id=$1 AND (esr.parent_section_name IS NULL OR esr.parent_section_name = '') ${f.sql}
       ORDER BY er.exam_date ASC`,
      [request.currentUser.id, ...f.params],
    )
    return { items: groupTrend(rows, metric) }
  })

  app.get<{ Querystring: any }>('/analysis/sections', { preHandler: app.authenticate }, async (request) => {
    const f = examFilter(request.query, 'er')
    const rows = await query<any>(
      `SELECT esr.section_name, COUNT(DISTINCT esr.exam_id) exam_count
       FROM exam_section_records esr JOIN exam_records er ON esr.exam_id=er.exam_id
       WHERE esr.user_id=$1 AND (esr.parent_section_name IS NULL OR esr.parent_section_name = '') ${f.sql}
       GROUP BY esr.section_name ORDER BY exam_count DESC`,
      [request.currentUser.id, ...f.params],
    )
    return { sections: rows.map((r) => r.section_name) }
  })
}
