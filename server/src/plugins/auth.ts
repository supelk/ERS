import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../env.js'
import { one } from '../db.js'
import type { AuthUser, JwtPayload } from '../types.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: AuthUser
  }
}

export default fp(async (app) => {
  await app.register(jwt, { secret: env.jwtSecret })

  app.decorate('authenticate', async (request, reply) => {
    try {
      const token = await request.jwtVerify<JwtPayload>()
      const user = await one<AuthUser>(
        'SELECT id, username, role, disabled FROM users WHERE id = $1',
        [token.sub],
      )
      if (!user || user.disabled) {
        reply.code(401).send({ message: 'Unauthorized' })
        return
      }
      request.currentUser = user
    } catch {
      reply.code(401).send({ message: 'Unauthorized' })
    }
  })

  app.decorate('requireAdmin', async (request, reply) => {
    await app.authenticate(request, reply)
    if (reply.sent) return
    if (request.currentUser.role !== 'admin') {
      reply.code(403).send({ message: 'Admin required' })
    }
  })
})
