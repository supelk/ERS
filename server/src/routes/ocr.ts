import type { FastifyInstance } from 'fastify'
import { callPaddleOcr } from '../services/ocr.js'

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

export async function ocrRoutes(app: FastifyInstance) {
  app.post('/ocr/recognize', { preHandler: app.authenticate }, async (request, reply) => {
    const file = await request.file()
    if (!file) return reply.code(400).send({ message: 'Image file is required' })
    if (!IMAGE_TYPES.has(file.mimetype)) return reply.code(400).send({ message: 'Only JPG, PNG and WebP images are supported' })
    const buffer = await file.toBuffer()
    if (buffer.length > MAX_IMAGE_SIZE) return reply.code(400).send({ message: 'Image must be smaller than 8MB' })
    try {
      return await callPaddleOcr({ buffer, filename: file.filename })
    } catch (error) {
      return reply.code(502).send({ message: String(error) })
    }
  })
}
