import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { one, query } from '../db.js'
import type { AuthUser } from '../types.js'

interface LoginBody {
  username: string
  password: string
}

interface UserBody {
  username: string
  password?: string
  disabled?: boolean
}

function publicUser(user: AuthUser) {
  return {
    id: Number(user.id),
    username: user.username,
    role: user.role,
    disabled: user.disabled,
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>('/auth/login', async (request, reply) => {
    const username = String(request.body?.username || '').trim()
    const password = String(request.body?.password || '')
    const user = await one<AuthUser & { password_hash: string }>(
      'SELECT id, username, password_hash, role, disabled FROM users WHERE username = $1',
      [username],
    )
    if (!user || user.disabled || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ message: 'Invalid username or password' })
    }

    const token = app.jwt.sign({
      sub: Number(user.id),
      username: user.username,
      role: user.role,
    })
    return { token, user: publicUser(user) }
  })

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => {
    return { user: publicUser(request.currentUser) }
  })

  app.get('/auth/users', { preHandler: app.requireAdmin }, async () => {
    const users = await query<AuthUser>(
      'SELECT id, username, role, disabled FROM users ORDER BY role, username',
    )
    return { users: users.map(publicUser) }
  })

  app.post<{ Body: UserBody }>('/auth/users', { preHandler: app.requireAdmin }, async (request, reply) => {
    const username = String(request.body?.username || '').trim()
    const password = String(request.body?.password || '')
    if (!username || password.length < 6) {
      return reply.code(400).send({ message: 'Username and password with at least 6 characters are required' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await one<AuthUser>(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'user')
       RETURNING id, username, role, disabled`,
      [username, passwordHash],
    )
    return { user: user && publicUser(user) }
  })

  app.patch<{ Params: { id: string }; Body: UserBody }>('/auth/users/:id', { preHandler: app.requireAdmin }, async (request, reply) => {
    const id = Number(request.params.id)
    if (id === request.currentUser.id && request.body.disabled) {
      return reply.code(400).send({ message: 'Admin cannot disable self' })
    }

    const sets: string[] = []
    const params: unknown[] = []
    let idx = 1
    if (request.body.password) {
      sets.push(`password_hash = $${idx++}`)
      params.push(await bcrypt.hash(String(request.body.password), 10))
    }
    if (request.body.disabled !== undefined) {
      sets.push(`disabled = $${idx++}`)
      params.push(Boolean(request.body.disabled))
    }
    if (sets.length === 0) return reply.code(400).send({ message: 'No changes' })
    sets.push('updated_at = now()')
    params.push(id)
    const user = await one<AuthUser>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} AND role <> 'admin'
       RETURNING id, username, role, disabled`,
      params,
    )
    if (!user) return reply.code(404).send({ message: 'User not found' })
    return { user: publicUser(user) }
  })

  app.delete('/auth/me/data', { preHandler: app.authenticate }, async (request) => {
    const userId = request.currentUser.id
    await query('DELETE FROM idiom_records WHERE user_id = $1', [userId])
    await query('DELETE FROM practice_tasks WHERE user_id = $1', [userId])
    await query('DELETE FROM practice_records WHERE user_id = $1', [userId])
    await query('DELETE FROM exam_records WHERE user_id = $1', [userId])
    return { ok: true }
  })
}
