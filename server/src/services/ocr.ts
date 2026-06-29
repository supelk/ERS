import FormData from 'form-data'
import { env } from '../env.js'

export async function callPaddleOcr(file: { buffer: Buffer; filename: string }): Promise<{ status: number; content_type: string; body: string }> {
  if (!env.paddleOcrApiUrl || !env.paddleOcrApiKey) {
    throw new Error('PaddleOCR API is not configured on the server')
  }
  const token = env.paddleOcrApiKey.replace(/^(token|bearer)\s+/i, '').trim()
  const model = env.paddleOcrModel
  const optionalPayload = {
    useDocOrientationClassify: false,
    useDocUnwarping: false,
    useTextlineOrientation: false,
  }
  const form = new FormData()
  form.append('model', model)
  form.append('optionalPayload', JSON.stringify(optionalPayload))
  form.append('file', file.buffer, { filename: file.filename || 'exam-score.png' })

  const submit = await fetch(env.paddleOcrApiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
    body: form as any,
  })
  const submitBody = await submit.text()
  if (!submit.ok) return { status: submit.status, content_type: 'application/json', body: submitBody }
  const submitJson = JSON.parse(submitBody)
  if (submitJson.code !== 0) return { status: 400, content_type: 'application/json', body: submitBody }
  const jobId = submitJson?.data?.jobId
  if (!jobId) throw new Error(`PaddleOCR response missing jobId: ${submitBody}`)

  const jobUrl = `${env.paddleOcrApiUrl.replace(/\/+$/, '')}/${jobId}`
  let resultUrl = ''
  let lastPollBody = ''
  for (let i = 0; i < 36; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const poll = await fetch(jobUrl, { headers: { Authorization: `Bearer ${token}` } })
    const pollBody = await poll.text()
    lastPollBody = pollBody
    if (!poll.ok) return { status: poll.status, content_type: 'application/json', body: pollBody }
    const pollJson = JSON.parse(pollBody)
    const state = pollJson?.data?.state || ''
    if (state === 'done') {
      resultUrl = pollJson?.data?.resultUrl?.jsonUrl || ''
      break
    }
    if (state === 'failed') throw new Error(pollJson?.data?.errorMsg || 'PaddleOCR task failed')
    if (state !== 'pending' && state !== 'running') throw new Error(`Unknown PaddleOCR state: ${state}`)
  }
  if (!resultUrl) throw new Error(`PaddleOCR task timed out: ${lastPollBody}`)
  const result = await fetch(resultUrl)
  return {
    status: result.status,
    content_type: result.headers.get('content-type') || '',
    body: await result.text(),
  }
}
