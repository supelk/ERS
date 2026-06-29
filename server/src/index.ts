import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { env } from './env.js'
import { migrate } from './db.js'
import authPlugin from './plugins/auth.js'
import { authRoutes } from './routes/auth.js'
import { examRoutes } from './routes/exams.js'
import { practiceRoutes } from './routes/practices.js'
import { idiomRoutes } from './routes/idioms.js'
import { aiRoutes } from './routes/ai.js'
import { ocrRoutes } from './routes/ocr.js'
import { analysisRoutes } from './routes/analysis.js'
import { importExportRoutes } from './routes/importExport.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })
await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } })
await app.register(authPlugin)

app.get('/health', async () => ({ ok: true }))

await app.register(authRoutes, { prefix: '/api' })
await app.register(examRoutes, { prefix: '/api' })
await app.register(practiceRoutes, { prefix: '/api' })
await app.register(idiomRoutes, { prefix: '/api' })
await app.register(aiRoutes, { prefix: '/api' })
await app.register(ocrRoutes, { prefix: '/api' })
await app.register(analysisRoutes, { prefix: '/api' })
await app.register(importExportRoutes, { prefix: '/api' })

await migrate()
await app.listen({ host: env.host, port: env.port })
