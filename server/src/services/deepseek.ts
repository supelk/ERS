import { env } from '../env.js'

export async function callDeepSeek(systemPrompt: string, userMessage: string, maxTokens = 1200): Promise<string> {
  if (!env.deepseekApiKey) {
    throw new Error('DeepSeek API key is not configured on the server')
  }
  const resp = await fetch(env.deepseekApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: env.deepseekModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  })
  if (!resp.ok) {
    throw new Error(`DeepSeek API failed (${resp.status}): ${await resp.text()}`)
  }
  const data = await resp.json() as any
  return data.choices?.[0]?.message?.content || ''
}
