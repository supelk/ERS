import type { FastifyInstance } from 'fastify'
import { one, query } from '../db.js'

export async function idiomRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { keyword?: string; random?: string; count?: string } }>('/idioms', { preHandler: app.authenticate }, async (request) => {
    if (request.query.random === '1') {
      const count = Math.max(1, Math.min(100, Number(request.query.count || 10)))
      const records = await query('SELECT * FROM idiom_records WHERE user_id = $1 ORDER BY random() LIMIT $2', [request.currentUser.id, count])
      return { records }
    }
    const keyword = String(request.query.keyword || '').trim()
    const records = keyword
      ? await query('SELECT * FROM idiom_records WHERE user_id = $1 AND word ILIKE $2 ORDER BY created_at DESC, id DESC', [request.currentUser.id, `%${keyword}%`])
      : await query('SELECT * FROM idiom_records WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [request.currentUser.id])
    return { records }
  })

  app.get<{ Params: { id: string } }>('/idioms/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const record = await one('SELECT * FROM idiom_records WHERE user_id = $1 AND id = $2', [request.currentUser.id, Number(request.params.id)])
    if (!record) return reply.code(404).send({ message: 'Idiom not found' })
    return { record }
  })

  app.post<{ Body: any }>('/idioms', { preHandler: app.authenticate }, async (request) => {
    const record = await one(
      'INSERT INTO idiom_records (user_id, word, definition, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [request.currentUser.id, (request.body as any).word, (request.body as any).definition, (request.body as any).notes ?? null],
    )
    return { record }
  })

  app.patch<{ Params: { id: string }; Body: any }>('/idioms/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const sets: string[] = []
    const params: unknown[] = []
    let idx = 1
    const body = request.body as any
    for (const key of ['word', 'definition', 'notes']) {
      if (body[key] !== undefined) {
        sets.push(`${key} = $${idx++}`)
        params.push(body[key] ?? null)
      }
    }
    if (!sets.length) return reply.code(400).send({ message: 'No changes' })
    params.push(request.currentUser.id, Number(request.params.id))
    const record = await one(`UPDATE idiom_records SET ${sets.join(', ')} WHERE user_id=$${idx++} AND id=$${idx} RETURNING *`, params)
    if (!record) return reply.code(404).send({ message: 'Idiom not found' })
    return { record }
  })

  app.delete<{ Params: { id: string } }>('/idioms/:id', { preHandler: app.authenticate }, async (request) => {
    await query('DELETE FROM idiom_records WHERE user_id=$1 AND id=$2', [request.currentUser.id, Number(request.params.id)])
    return { ok: true }
  })
}
