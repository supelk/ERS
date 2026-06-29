import { api } from '@/utils/api'

export function setApiKey(_key: string): void {
  // Cloud mode keeps API keys on the server.
}

export function getStoredApiKey(): string {
  return ''
}

export async function callDeepSeek(systemPrompt: string, userMessage: string, maxTokens = 1200): Promise<string> {
  return (await api.post<{ text: string }>('/ai/deepseek', { systemPrompt, userMessage, maxTokens })).text
}

export async function fetchDefinition(word: string): Promise<string> {
  return (await api.post<{ text: string }>('/ai/definition', { word })).text
}

export async function compareSynonyms(word1: string, word2: string): Promise<string> {
  return (await api.post<{ text: string }>('/ai/synonyms', { word1, word2 })).text
}
