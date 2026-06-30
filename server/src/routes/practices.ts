import type { FastifyInstance } from 'fastify'
import { one, query } from '../db.js'

const PRACTICE_SECTION_GROUPS: Record<string, string[]> = {
  '政治理论': ['政治理论'],
  '常识判断': ['常识判断'],
  '言语理解': ['言语理解', '逻辑填空', '片段阅读', '语句表达', '片段&表达'],
  '数量关系': ['数量关系', '数字推理', '数学运算'],
  '判断推理': ['判断推理', '图形推理', '逻辑判断', '定义判断', '类比推理', '科学推理'],
  '资料分析': ['资料分析'],
}

const PRACTICE_PARENT_SECTIONS = Object.keys(PRACTICE_SECTION_GROUPS)

export async function practiceRoutes(app: FastifyInstance) {
  app.get('/practice-records', { preHandler: app.authenticate }, async (request) => {
    const records = await query('SELECT * FROM practice_records WHERE user_id = $1 ORDER BY practice_date DESC, id DESC', [request.currentUser.id])
    return { records }
  })

  app.get<{ Params: { id: string } }>('/practice-records/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const record = await one('SELECT * FROM practice_records WHERE user_id = $1 AND id = $2', [request.currentUser.id, Number(request.params.id)])
    if (!record) return reply.code(404).send({ message: 'Practice record not found' })
    return { record }
  })

  app.post<{ Body: any }>('/practice-records', { preHandler: app.authenticate }, async (request) => {
    const data = request.body as any
    const record = await one(
      `INSERT INTO practice_records (user_id, section_name, practice_date, total_questions, correct_questions, used_time, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [request.currentUser.id, data.section_name, data.practice_date, data.total_questions ?? 0, data.correct_questions ?? 0, data.used_time ?? 0, data.notes ?? null],
    )
    return { record }
  })

  app.put<{ Params: { id: string }; Body: any }>('/practice-records/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const data = request.body as any
    const record = await one(
      `UPDATE practice_records SET section_name=$1, practice_date=$2, total_questions=$3, correct_questions=$4, used_time=$5, notes=$6
       WHERE user_id=$7 AND id=$8 RETURNING *`,
      [data.section_name, data.practice_date, data.total_questions ?? 0, data.correct_questions ?? 0, data.used_time ?? 0, data.notes ?? null, request.currentUser.id, Number(request.params.id)],
    )
    if (!record) return reply.code(404).send({ message: 'Practice record not found' })
    return { record }
  })

  app.delete<{ Params: { id: string } }>('/practice-records/:id', { preHandler: app.authenticate }, async (request) => {
    await query('DELETE FROM practice_records WHERE user_id=$1 AND id=$2', [request.currentUser.id, Number(request.params.id)])
    return { ok: true }
  })

  app.get<{ Querystring: { section_name?: string } }>('/practice-records/trends', { preHandler: app.authenticate }, async (request) => {
    const params: unknown[] = [request.currentUser.id]
    let where = 'WHERE user_id = $1'
    if (request.query.section_name) {
      const sectionNames = getPracticeSectionGroup(request.query.section_name)
      params.push(sectionNames)
      where += ' AND section_name = ANY($2)'
    }
    const rows = await query<any>(`SELECT * FROM practice_records ${where} ORDER BY practice_date ASC`, params)
    return {
      xLabels: rows.map((r) => r.practice_date),
      accuracyData: rows.map((r) => r.accuracy ?? 0),
      avgTimeData: rows.map((r) => r.avg_time_per_question ?? 0),
      totalQuestionsData: rows.map((r) => r.total_questions ?? 0),
    }
  })

  app.get('/practice-records/sections', { preHandler: app.authenticate }, async () => {
    return { sections: PRACTICE_PARENT_SECTIONS }
  })

  app.get('/practice-tasks', { preHandler: app.authenticate }, async (request) => {
    const tasks = await query('SELECT * FROM practice_tasks WHERE user_id = $1 ORDER BY created_at DESC, task_id DESC', [request.currentUser.id])
    return { tasks }
  })

  app.post<{ Body: any }>('/practice-tasks', { preHandler: app.authenticate }, async (request) => {
    const task = await one(
      'INSERT INTO practice_tasks (user_id, task_name, status) VALUES ($1,$2,$3) RETURNING *',
      [request.currentUser.id, (request.body as any).task_name, (request.body as any).status],
    )
    return { task }
  })

  app.patch<{ Params: { id: string }; Body: any }>('/practice-tasks/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const sets: string[] = []
    const params: unknown[] = []
    let idx = 1
    const body = request.body as any
    if (body.task_name !== undefined) {
      sets.push(`task_name = $${idx++}`)
      params.push(body.task_name)
    }
    if (body.status !== undefined) {
      sets.push(`status = $${idx++}`)
      params.push(body.status)
    }
    if (!sets.length) return reply.code(400).send({ message: 'No changes' })
    params.push(request.currentUser.id, Number(request.params.id))
    const task = await one(`UPDATE practice_tasks SET ${sets.join(', ')} WHERE user_id=$${idx++} AND task_id=$${idx} RETURNING *`, params)
    if (!task) return reply.code(404).send({ message: 'Task not found' })
    return { task }
  })

  app.delete<{ Params: { id: string } }>('/practice-tasks/:id', { preHandler: app.authenticate }, async (request) => {
    await query('DELETE FROM practice_tasks WHERE user_id=$1 AND task_id=$2', [request.currentUser.id, Number(request.params.id)])
    return { ok: true }
  })
}

function getPracticeSectionGroup(sectionName: string): string[] {
  return PRACTICE_SECTION_GROUPS[sectionName] ?? [sectionName]
}
