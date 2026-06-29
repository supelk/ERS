import type { FastifyInstance } from 'fastify'
import { callDeepSeek } from '../services/deepseek.js'

export async function aiRoutes(app: FastifyInstance) {
  app.post<{ Body: { systemPrompt: string; userMessage: string; maxTokens?: number } }>('/ai/deepseek', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const text = await callDeepSeek(request.body.systemPrompt, request.body.userMessage, request.body.maxTokens)
      return { text }
    } catch (error) {
      return reply.code(502).send({ message: String(error) })
    }
  })

  app.post<{ Body: { word: string } }>('/ai/definition', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const text = await callDeepSeek(
        '你是一位专业的汉语词典编辑。请用简洁、准确的中文解释用户输入的成语或词语，总字数控制在200字以内。',
        `请解释成语/词语：${request.body.word}`,
      )
      return { text }
    } catch (error) {
      return reply.code(502).send({ message: String(error) })
    }
  })

  app.post<{ Body: { word1: string; word2: string } }>('/ai/synonyms', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const text = await callDeepSeek(
        '你是一位专业的汉语语言学家。请从语义、语境、感情色彩、搭配习惯和例句角度辨析两个词语，总字数控制在400字以内。',
        `请辨析“${request.body.word1}”和“${request.body.word2}”的异同`,
      )
      return { text }
    } catch (error) {
      return reply.code(502).send({ message: String(error) })
    }
  })
}
