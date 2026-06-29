import type { FastifyInstance } from 'fastify'
import { query, transaction } from '../db.js'

export async function importExportRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { ids?: string; format?: string } }>('/export/exams', { preHandler: app.authenticate }, async (request, reply) => {
    const ids = String(request.query.ids || '').split(',').map(Number).filter(Boolean)
    const params: unknown[] = [request.currentUser.id]
    const idWhere = ids.length ? `AND exam_id = ANY($2::bigint[])` : ''
    if (ids.length) params.push(ids)
    const exams = await query<any>(`SELECT * FROM exam_records WHERE user_id=$1 ${idWhere} ORDER BY exam_date DESC`, params)
    if (request.query.format === 'csv') {
      const rows = await query<any>(
        `SELECT er.exam_name, er.exam_date, er.exam_type_1, er.exam_type, esr.section_name, esr.total_questions,
         esr.correct_questions, esr.per_question_score, esr.used_time, esr.unattempted_questions, esr.accuracy,
         esr.score_efficiency, esr.analysis, esr.plan
         FROM exam_section_records esr JOIN exam_records er ON esr.exam_id=er.exam_id
         WHERE er.user_id=$1 ${ids.length ? 'AND er.exam_id = ANY($2::bigint[])' : ''}
         ORDER BY er.exam_date DESC, esr.section_id`,
        params,
      )
      const header = ['exam_name','exam_date','exam_type_1','exam_type','section_name','total_questions','correct_questions','per_question_score','used_time','unattempted_questions','accuracy','score_efficiency','analysis','plan']
      const esc = (v: any) => {
        if (v == null) return ''
        const s = String(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      return reply.type('text/csv').send([header.join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n'))
    }
    const data = []
    for (const exam of exams) {
      const sections = await query('SELECT * FROM exam_section_records WHERE user_id=$1 AND exam_id=$2 ORDER BY section_id', [request.currentUser.id, exam.exam_id])
      data.push({ exam, sections })
    }
    return { version: '1.0.0-cloud', exported_at: new Date().toISOString(), exams: data }
  })

  app.post<{ Body: any }>('/import/exams', { preHandler: app.authenticate }, async (request) => {
    const userId = request.currentUser.id
    const data = request.body as any
    let imported = 0
    let skipped = 0
    for (const item of data.exams || []) {
      const exam = item.exam
      if (!exam?.exam_name || !exam?.exam_date) { skipped++; continue }
      try {
        await transaction(async (client) => {
          const result = await client.query(
            `INSERT INTO exam_records (user_id, exam_name, exam_date, exam_type_1, exam_type, total_score, full_score, current_target_score, next_target_score, total_time, question_order, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING exam_id`,
            [userId, exam.exam_name, exam.exam_date, exam.exam_type_1 || '', exam.exam_type || '', exam.total_score ?? 0, exam.full_score ?? 100, exam.current_target_score ?? null, exam.next_target_score ?? null, exam.total_time ?? null, exam.question_order ?? null, exam.notes ?? null],
          )
          const examId = Number(result.rows[0].exam_id)
          for (const s of item.sections || []) {
            await client.query(
              `INSERT INTO exam_section_records (user_id, exam_id, section_name, parent_section_name, total_questions, correct_questions, per_question_score, used_time, unattempted_questions, analysis, plan, next_target_accuracy, next_target_time, next_target_efficiency)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
              [userId, examId, s.section_name, s.parent_section_name ?? null, s.total_questions ?? 0, s.correct_questions ?? 0, s.per_question_score ?? 1, s.used_time ?? 0, s.unattempted_questions ?? 0, s.analysis ?? null, s.plan ?? null, s.next_target_accuracy ?? null, s.next_target_time ?? null, s.next_target_efficiency ?? null],
            )
          }
        })
        imported++
      } catch {
        skipped++
      }
    }
    return { imported, skipped }
  })
}
