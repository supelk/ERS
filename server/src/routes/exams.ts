import type { FastifyInstance } from 'fastify'
import type pg from 'pg'
import { one, query, transaction } from '../db.js'
import type { ExamFormData } from '../types.js'

function reviewList(data: ExamFormData, type: 'wrong' | 'speed' | 'fast') {
  if (type === 'wrong') return data.wrong_questions || []
  if (type === 'speed') return data.speed_questions || []
  return data.fast_correct_questions || []
}

async function insertReviewQuestions(client: pg.PoolClient, userId: number, examId: number, type: 'wrong' | 'speed' | 'fast', questions: any[]) {
  let order = 0
  for (const q of questions) {
    if (![q.question_number, q.knowledge_point, q.analysis, q.improvement_plan, q.solving_insight].some((v) => String(v || '').trim())) continue
    await client.query(
      `INSERT INTO review_question_records
       (user_id, exam_id, question_type, section_name, question_number, time_spent, knowledge_point, analysis, improvement_plan, solving_insight, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [userId, examId, type, q.section_name || '', q.question_number || '', q.time_spent ?? null, q.knowledge_point || '', q.analysis || '', q.improvement_plan || '', q.solving_insight || '', order++],
    )
  }
}

async function loadExam(userId: number, examId: number) {
  const exam = await one('SELECT * FROM exam_records WHERE user_id = $1 AND exam_id = $2', [userId, examId])
  if (!exam) return null
  const sections = await query('SELECT * FROM exam_section_records WHERE user_id = $1 AND exam_id = $2 ORDER BY section_id', [userId, examId])
  const reviewQuestions = await query('SELECT * FROM review_question_records WHERE user_id = $1 AND exam_id = $2 ORDER BY sort_order, id', [userId, examId])
  return {
    exam,
    sections,
    wrong_questions: reviewQuestions.filter((q: any) => q.question_type === 'wrong'),
    speed_questions: reviewQuestions.filter((q: any) => q.question_type === 'speed'),
    fast_correct_questions: reviewQuestions.filter((q: any) => q.question_type === 'fast'),
  }
}

export async function examRoutes(app: FastifyInstance) {
  app.get('/exams', { preHandler: app.authenticate }, async (request) => {
    const exams = await query('SELECT * FROM exam_records WHERE user_id = $1 ORDER BY exam_date DESC, exam_id DESC', [request.currentUser.id])
    return { exams }
  })

  app.get<{ Params: { id: string } }>('/exams/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const data = await loadExam(request.currentUser.id, Number(request.params.id))
    if (!data) return reply.code(404).send({ message: 'Exam not found' })
    return data
  })

  app.post<{ Body: ExamFormData }>('/exams', { preHandler: app.authenticate }, async (request) => {
    const userId = request.currentUser.id
    const data = request.body
    const examId = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO exam_records
         (user_id, exam_name, exam_date, exam_type_1, exam_type, total_score, full_score, current_target_score, next_target_score, total_time, question_order, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING exam_id`,
        [userId, data.exam_name, data.exam_date, data.exam_type_1, data.exam_type, data.total_score ?? 0, data.full_score ?? 100, data.current_target_score ?? null, data.next_target_score ?? null, data.total_time ?? null, data.question_order ?? null, data.notes ?? null],
      )
      const id = Number(result.rows[0].exam_id)
      for (const s of (data.sections || []) as any[]) {
        await client.query(
          `INSERT INTO exam_section_records
           (user_id, exam_id, section_name, parent_section_name, total_questions, correct_questions, per_question_score, used_time, unattempted_questions, analysis, plan, next_target_accuracy, next_target_time, next_target_efficiency)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [userId, id, s.section_name, s.parent_section_name ?? null, s.total_questions ?? 0, s.correct_questions ?? 0, s.per_question_score ?? 1, s.used_time ?? 0, s.unattempted_questions ?? 0, s.analysis ?? null, s.plan ?? null, s.next_target_accuracy ?? null, s.next_target_time ?? null, s.next_target_efficiency ?? null],
        )
      }
      await insertReviewQuestions(client, userId, id, 'wrong', reviewList(data, 'wrong'))
      await insertReviewQuestions(client, userId, id, 'speed', reviewList(data, 'speed'))
      await insertReviewQuestions(client, userId, id, 'fast', reviewList(data, 'fast'))
      return id
    })
    return { exam_id: examId }
  })

  app.put<{ Params: { id: string }; Body: ExamFormData }>('/exams/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.currentUser.id
    const examId = Number(request.params.id)
    const exists = await one('SELECT exam_id FROM exam_records WHERE user_id = $1 AND exam_id = $2', [userId, examId])
    if (!exists) return reply.code(404).send({ message: 'Exam not found' })
    const data = request.body
    await transaction(async (client) => {
      await client.query(
        `UPDATE exam_records SET exam_name=$1, exam_date=$2, exam_type_1=$3, exam_type=$4, total_score=$5, full_score=$6,
         current_target_score=$7, next_target_score=$8, total_time=$9, question_order=$10, notes=$11, updated_at=now()
         WHERE user_id=$12 AND exam_id=$13`,
        [data.exam_name, data.exam_date, data.exam_type_1, data.exam_type, data.total_score ?? 0, data.full_score ?? 100, data.current_target_score ?? null, data.next_target_score ?? null, data.total_time ?? null, data.question_order ?? null, data.notes ?? null, userId, examId],
      )
      await client.query('DELETE FROM exam_section_records WHERE user_id = $1 AND exam_id = $2', [userId, examId])
      await client.query('DELETE FROM review_question_records WHERE user_id = $1 AND exam_id = $2', [userId, examId])
      for (const s of (data.sections || []) as any[]) {
        await client.query(
          `INSERT INTO exam_section_records
           (user_id, exam_id, section_name, parent_section_name, total_questions, correct_questions, per_question_score, used_time, unattempted_questions, analysis, plan, next_target_accuracy, next_target_time, next_target_efficiency)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [userId, examId, s.section_name, s.parent_section_name ?? null, s.total_questions ?? 0, s.correct_questions ?? 0, s.per_question_score ?? 1, s.used_time ?? 0, s.unattempted_questions ?? 0, s.analysis ?? null, s.plan ?? null, s.next_target_accuracy ?? null, s.next_target_time ?? null, s.next_target_efficiency ?? null],
        )
      }
      await insertReviewQuestions(client, userId, examId, 'wrong', reviewList(data, 'wrong'))
      await insertReviewQuestions(client, userId, examId, 'speed', reviewList(data, 'speed'))
      await insertReviewQuestions(client, userId, examId, 'fast', reviewList(data, 'fast'))
    })
    return { ok: true }
  })

  app.delete<{ Params: { id: string } }>('/exams/:id', { preHandler: app.authenticate }, async (request) => {
    await query('DELETE FROM exam_records WHERE user_id = $1 AND exam_id = $2', [request.currentUser.id, Number(request.params.id)])
    return { ok: true }
  })

  app.get<{ Params: { id: string } }>('/exams/:id/previous-sections', { preHandler: app.authenticate }, async (request) => {
    const userId = request.currentUser.id
    const examId = Number(request.params.id)
    const exam = await one<any>('SELECT * FROM exam_records WHERE user_id = $1 AND exam_id = $2', [userId, examId])
    if (!exam) return { sections: [] }
    const prev = await one<any>(
      `SELECT exam_id FROM exam_records
       WHERE user_id=$1 AND exam_id <> $2 AND exam_type_1=$3 AND exam_type=$4 AND exam_date <= $5
       ORDER BY exam_date DESC, exam_id DESC LIMIT 1`,
      [userId, examId, exam.exam_type_1, exam.exam_type, exam.exam_date],
    )
    if (!prev) return { sections: [] }
    const sections = await query('SELECT * FROM exam_section_records WHERE user_id = $1 AND exam_id = $2 ORDER BY section_id', [userId, prev.exam_id])
    return { sections }
  })

  app.patch<{ Params: { id: string }; Body: any }>('/sections/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const s = request.body as any
    const row = await one(
      `UPDATE exam_section_records SET section_name=$1, parent_section_name=$2, total_questions=$3, correct_questions=$4,
       per_question_score=$5, used_time=$6, unattempted_questions=$7, analysis=$8, plan=$9, next_target_accuracy=$10,
       next_target_time=$11, next_target_efficiency=$12
       WHERE user_id=$13 AND section_id=$14 RETURNING *`,
      [s.section_name, s.parent_section_name ?? null, s.total_questions ?? 0, s.correct_questions ?? 0, s.per_question_score ?? 1, s.used_time ?? 0, s.unattempted_questions ?? 0, s.analysis ?? null, s.plan ?? null, s.next_target_accuracy ?? null, s.next_target_time ?? null, s.next_target_efficiency ?? null, request.currentUser.id, Number(request.params.id)],
    )
    if (!row) return reply.code(404).send({ message: 'Section not found' })
    return { section: row }
  })
}
