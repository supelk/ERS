/**
 * DeepSeek API 工具函数
 * 用于成语释义、同义词辨析等 LLM 调用
 *
 * API Key 配置：在设置页「API 配置」中输入，存储在 localStorage 'ers-api-key'
 */

const API_URL = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'

function getApiKey(): string {
  return localStorage.getItem('ers-api-key') || ''
}

export function setApiKey(key: string): void {
  localStorage.setItem('ers-api-key', key)
}

export function getStoredApiKey(): string {
  return getApiKey()
}

/**
 * 通用 DeepSeek 调用
 */
export async function callDeepSeek(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1200,
): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('请先在设置页配置 DeepSeek API Key')
  }

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`API 调用失败 (${resp.status}): ${err}`)
  }

  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * 获取成语/词语释义
 */
export async function fetchDefinition(word: string): Promise<string> {
  return callDeepSeek(
    '你是一位专业的汉语词典编纂专家。请用简洁、准确的中文解释用户输入的成语或词语。格式要求：\n1. 先给出注音（拼音）\n2. 解释字面意思\n3. 说明引申义或常用语境\n4. 如有典故出处，简要说明\n总字数控制在200字以内。',
    `请解释成语/词语：「${word}」`,
  )
}

/**
 * 同义词辨析
 */
export async function compareSynonyms(word1: string, word2: string): Promise<string> {
  return callDeepSeek(
    '你是一位专业的汉语语言学家。请从以下几个维度辨析用户输入的两个词语：\n1. 语义侧重差异\n2. 使用语境区别\n3. 感情色彩（褒义/贬义/中性）\n4. 搭配习惯\n5. 典型例句对比\n格式清晰，分点列出，总字数控制在400字以内。',
    `请辨析「${word1}」和「${word2}」的异同`,
  )
}
