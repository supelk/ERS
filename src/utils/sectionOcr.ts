import { invoke } from '@tauri-apps/api/core'
import {
  SECTION_HIERARCHY,
  SECTION_SCORE_PRESETS,
  getParentSectionName,
} from '@/utils/constants'
import type { ExamType1 } from '@/types/exam'

export interface RecognizedSectionDraft {
  id: string
  rawName: string
  section_name: string
  parent_section_name: string | null
  total_questions: number | null
  correct_questions: number | null
  used_time: number | null
  score: number | null
  duplicate: boolean
  ignored?: boolean
}

interface OcrApiDebugInfo {
  status?: number
  ok?: boolean
  contentType?: string
  responsePreview?: string
  extractedTextPreview?: string
}

interface PaddleOcrCommandResponse {
  status: number
  content_type: string
  body: string
}

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
const OCR_API_URL_KEY = 'ers-paddle-ocr-api-url'
const OCR_API_KEY_KEY = 'ers-paddle-ocr-api-key'

const SECTION_NAMES = SECTION_HIERARCHY.flatMap((section) => [
  section.name,
  ...(section.children ?? []),
])

const REPORT_SECTION_ALIASES: Array<[string, string[]]> = [
  ['政治理论', ['政治理论', '政治']],
  ['常识判断', ['常识判断', '常识']],
  ['言语理解', ['言语理解与表达', '言语理解', '言语']],
  ['逻辑填空',['逻辑填空']],
  ['数量关系', ['数量关系', '数量']],
  ['数字推理',['数字']],
  ['数学运算', ['运算']],
  ['判断推理', ['判断推理']],
  ['图形推理',['图形']],
  ['逻辑判断',['逻辑判断']],
  ['定义判断',['定义']],
  ['类比推理',['类比']],
  ['科学推理',['科学']],
  ['资料分析', ['资料分析', '资料']],
]

export function validateOcrImage(file: File): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return '仅支持 JPG、PNG、WebP 图片'
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return '图片不能超过 8MB'
  }
  return null
}

export function getStoredPaddleOcrApiUrl(): string {
  return localStorage.getItem(OCR_API_URL_KEY) || ''
}

export function getStoredPaddleOcrApiKey(): string {
  return localStorage.getItem(OCR_API_KEY_KEY) || ''
}

export function setPaddleOcrConfig(apiUrl: string, apiKey: string): void {
  localStorage.setItem(OCR_API_URL_KEY, apiUrl.trim())
  localStorage.setItem(OCR_API_KEY_KEY, apiKey.trim())
}

export async function recognizeSectionImage(file: File): Promise<RecognizedSectionDraft[]> {
  const text = await callPaddleOcrApi(file)
  const rows = parseSectionOcrText(text)
  console.info('[OCR] Parsed section rows:', rows.map((row) => ({
    section: row.section_name,
    total: row.total_questions,
    correct: row.correct_questions,
    time: row.used_time,
    raw: row.rawName,
  })))
  if (rows.length === 0) {
    console.warn('[OCR] API returned text, but no valid section rows were parsed:', text.slice(0, 1000))
  }
  return rows
}

async function callPaddleOcrApi(file: File): Promise<string> {
  const apiUrl = getStoredPaddleOcrApiUrl()
  const apiKey = getStoredPaddleOcrApiKey()

  if (!apiUrl) {
    throw new Error('请先在设置页配置 PaddleOCR API 地址')
  }

  if (!apiKey) {
    throw new Error('请先在设置页配置 PaddleOCR API Key')
  }

  const fileBase64 = await fileToBase64(file)

  console.info('[OCR] PaddleOCR request:', {
    apiUrl,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    hasApiKey: Boolean(apiKey),
  })

  let response: PaddleOcrCommandResponse
  try {
    response = await invoke<PaddleOcrCommandResponse>('call_paddle_ocr', {
      request: {
        api_url: apiUrl,
        api_key: apiKey,
        file_base64: fileBase64,
        file_name: file.name || 'exam-score.png',
      },
    })
  } catch (e) {
    console.error('[OCR] PaddleOCR request failed before response:', e)
    throw new Error(String(e))
  }

  const contentType = response.content_type || ''
  const responseText = response.body || ''
  const debugInfo: OcrApiDebugInfo = {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    contentType,
    responsePreview: responseText.slice(0, 1200),
  }
  console.info('[OCR] PaddleOCR response:', debugInfo)

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`PaddleOCR API 调用失败 (${response.status})${responseText ? `: ${responseText.slice(0, 300)}` : ''}`)
  }

  if (contentType.includes('application/json')) {
    try {
      const extractedText = extractTextFromOcrResponse(JSON.parse(responseText))
      console.info('[OCR] Extracted text preview:', extractedText.slice(0, 1200))
      return extractedText
    } catch (e) {
      throw new Error(`PaddleOCR API 返回了非标准 JSON：${String(e)}`)
    }
  }

  return responseText
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
  const commaIndex = dataUrl.indexOf(',')
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl
}

export function parseSectionOcrText(text: string): RecognizedSectionDraft[] {
  const reportRows = parseNearbySectionMetrics(text)
  if (reportRows.length > 0) {
    return markDuplicateRows(reportRows)
  }
  const titleRows = parseReportMarkdown(text)
  if (titleRows.length > 0) {
    return markDuplicateRows(titleRows)
  }

  const compactLines = text
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean)

  const drafts: RecognizedSectionDraft[] = []
  const seen = new Set<string>()

  for (const line of compactLines) {
    const matchedName = matchSectionName(line)
    if (!matchedName) continue

    const metrics = extractMetrics(line)
    if (!hasUsefulMetric(metrics)) continue

    const duplicate = seen.has(matchedName)
    seen.add(matchedName)

    drafts.push({
      id: `ocr-${Date.now()}-${drafts.length}`,
      rawName: line,
      section_name: matchedName,
      parent_section_name: getParentSectionName(matchedName),
      total_questions: metrics.total_questions,
      correct_questions: metrics.correct_questions,
      used_time: metrics.used_time,
      score: metrics.score,
      duplicate,
      ignored: duplicate,
    })
  }

  return markDuplicateRows(drafts)
}

export function getPresetScore(type1: ExamType1, sectionName: string): number {
  return SECTION_SCORE_PRESETS[type1]?.[sectionName] ?? 1
}

export function normalizeRecognizedScore(
  type1: ExamType1,
  sectionName: string,
  score: number | null,
  correctQuestions: number | null,
): number {
  if (score != null && correctQuestions != null && correctQuestions > 0) {
    return Number((score / correctQuestions).toFixed(3))
  }
  return getPresetScore(type1, sectionName)
}

function normalizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .replace(/[|｜]/g, ' ')
    .replace(/[，。；：]/g, ' ')
    .trim()
}

function matchSectionName(line: string): string | null {
  const alias = matchSectionAlias(line)
  if (alias) return alias

  const normalizedLine = normalizeComparable(line)
  let best: { name: string; score: number } | null = null

  for (const name of SECTION_NAMES) {
    const normalizedName = normalizeComparable(name)
    const score = normalizedLine.includes(normalizedName)
      ? 1
      : similarity(normalizedLine, normalizedName)
    if (!best || score > best.score) {
      best = { name, score }
    }
  }

  return best && best.score >= 0.48 ? best.name : null
}

function parseReportMarkdown(text: string): RecognizedSectionDraft[] {
  const logicalLines = normalizeReportText(text)
  const rows: RecognizedSectionDraft[] = []
  let pendingSection: string | null = null
  let pendingRawTitle = ''

  for (const line of logicalLines) {
    const title = parseMarkdownTitle(line)
    if (title) {
      const matched = matchSectionName(title)
      if (matched) {
        pendingSection = matched
        pendingRawTitle = title
      }
      continue
    }

    if (!pendingSection || !isMetricLine(line)) continue

    const metrics = extractMetrics(line)
    if (!hasUsefulMetric(metrics)) continue

    rows.push({
      id: `ocr-report-${Date.now()}-${rows.length}`,
      rawName: `${pendingRawTitle} ${line}`,
      section_name: pendingSection,
      parent_section_name: getParentSectionName(pendingSection),
      total_questions: metrics.total_questions,
      correct_questions: metrics.correct_questions,
      used_time: metrics.used_time,
      score: metrics.score,
      duplicate: false,
    })
    pendingSection = null
    pendingRawTitle = ''
  }

  return rows
}

function parseNearbySectionMetrics(text: string): RecognizedSectionDraft[] {
  const spanRows = parseSectionMetricSpans(text)
  if (spanRows.length > 0) {
    return spanRows
  }

  const logicalLines = normalizeReportText(text)
  const rows: RecognizedSectionDraft[] = []
  const matchedSections = new Set<string>()

  for (let i = 0; i < logicalLines.length; i++) {
    const line = logicalLines[i]
    const title = parseMarkdownTitle(line) ?? line
    const matchedSection = matchStrongSectionName(title)
    if (!matchedSection) continue
    if (matchedSections.has(matchedSection)) continue

    const nearby = findNearestMetrics(logicalLines, i + 1)
    if (!nearby) continue

    matchedSections.add(matchedSection)
    rows.push({
      id: `ocr-nearby-${Date.now()}-${rows.length}`,
      rawName: `${title} ${nearby.line}`,
      section_name: matchedSection,
      parent_section_name: getParentSectionName(matchedSection),
      total_questions: nearby.metrics.total_questions,
      correct_questions: nearby.metrics.correct_questions,
      used_time: nearby.metrics.used_time,
      score: nearby.metrics.score,
      duplicate: false,
    })
  }

  return rows
}

function parseSectionMetricSpans(text: string): RecognizedSectionDraft[] {
  const plainText = normalizeReportPlainText(text)
  const spans = findSectionSpans(plainText)
  const rows: RecognizedSectionDraft[] = []
  const matchedSections = new Set<string>()

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]
    if (matchedSections.has(span.sectionName)) continue

    const nextSpan = spans.slice(i + 1).find((item) => item.index > span.index)
    const segmentEnd = nextSpan ? nextSpan.index : plainText.length
    const segment = plainText.slice(span.end, segmentEnd)
    const metrics = extractMetrics(segment)

    if (!hasUsefulMetric(metrics)) continue

    matchedSections.add(span.sectionName)
    rows.push({
      id: `ocr-span-${Date.now()}-${rows.length}`,
      rawName: `${span.rawName} ${segment.slice(0, 120)}`.trim(),
      section_name: span.sectionName,
      parent_section_name: getParentSectionName(span.sectionName),
      total_questions: metrics.total_questions,
      correct_questions: metrics.correct_questions,
      used_time: metrics.used_time,
      score: metrics.score,
      duplicate: false,
    })
  }

  return rows
}

function findSectionSpans(text: string): Array<{
  sectionName: string
  rawName: string
  index: number
  end: number
}> {
  const spans: Array<{
    sectionName: string
    rawName: string
    index: number
    end: number
  }> = []

  for (const [sectionName, aliases] of REPORT_SECTION_ALIASES) {
    for (const alias of aliases) {
      const pattern = new RegExp(escapeRegExp(alias).split('').join('\\s*'), 'g')
      let match: RegExpExecArray | null
      while ((match = pattern.exec(text))) {
        spans.push({
          sectionName,
          rawName: match[0].replace(/\s+/g, ''),
          index: match.index,
          end: match.index + match[0].length,
        })
        if (match[0].length === 0) pattern.lastIndex++
      }
    }
  }

  for (const name of SECTION_NAMES) {
    const pattern = new RegExp(escapeRegExp(name).split('').join('\\s*'), 'g')
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text))) {
      spans.push({
        sectionName: name,
        rawName: match[0].replace(/\s+/g, ''),
        index: match.index,
        end: match.index + match[0].length,
      })
      if (match[0].length === 0) pattern.lastIndex++
    }
  }

  return dedupeSectionSpans(spans)
}

function dedupeSectionSpans(
  spans: Array<{ sectionName: string; rawName: string; index: number; end: number }>,
): Array<{ sectionName: string; rawName: string; index: number; end: number }> {
  return spans
    .sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index
      return b.rawName.length - a.rawName.length
    })
    .filter((span, index, sorted) => {
      const previous = sorted[index - 1]
      if (!previous) return true
      const overlaps = span.index < previous.end && span.end > previous.index
      return !(overlaps && span.sectionName === previous.sectionName)
    })
}

function findNearestMetrics(
  lines: string[],
  startIndex: number,
): {
  index: number
  line: string
  metrics: ReturnType<typeof extractMetrics>
} | null {
  const windowEnd = Math.min(lines.length, startIndex + 12)
  for (let i = startIndex; i < windowEnd; i++) {
    const candidates = [
      lines[i],
      [lines[i], lines[i + 1]].filter(Boolean).join(' '),
      [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(' '),
      [lines[i], lines[i + 1], lines[i + 2], lines[i + 3]].filter(Boolean).join(' '),
    ]

    for (const candidate of candidates) {
      const metrics = extractMetrics(candidate)
      if (metrics.total_questions != null && metrics.correct_questions != null) {
        return { index: i, line: candidate, metrics }
      }
    }
  }
  return null
}

function matchStrongSectionName(line: string): string | null {
  const normalized = normalizeComparable(parseMarkdownTitle(line) ?? line)

  for (const [sectionName, names] of REPORT_SECTION_ALIASES) {
    if (names.some((name) => normalized === normalizeComparable(name) || normalized.includes(normalizeComparable(name)))) {
      return sectionName
    }
  }

  for (const name of SECTION_NAMES) {
    const normalizedName = normalizeComparable(name)
    if (normalized === normalizedName || normalized.includes(normalizedName)) {
      return name
    }
  }

  return null
}

function normalizeReportText(text: string): string[] {
  return text
    .replace(/<table[\s\S]*?<\/table>/gi, '\n')
    .replace(/<div[\s\S]*?<\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function normalizeReportPlainText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[|｜]/g, ' ')
    .replace(/[，。；：,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseMarkdownTitle(line: string): string | null {
  const match = line.match(/^#{1,6}\s*(.+?)\s*$/)
  if (!match) return null
  return match[1].trim()
}

function isMetricLine(line: string): boolean {
  return /(?:共|总题数)\s*\d+(?:\.\d+)?\s*题/.test(line) && /答对\s*\d+(?:\.\d+)?\s*(?:题|道)/.test(line)
}

function matchSectionAlias(line: string): string | null {
  const normalized = normalizeComparable(line)

  for (const [sectionName, names] of REPORT_SECTION_ALIASES) {
    if (names.some((name) => normalized.includes(normalizeComparable(name)))) {
      return sectionName
    }
  }
  return null
}

function markDuplicateRows(rows: RecognizedSectionDraft[]): RecognizedSectionDraft[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    const duplicate = seen.has(row.section_name)
    seen.add(row.section_name)
    return {
      ...row,
      duplicate,
      ignored: row.ignored ?? duplicate,
    }
  })
}

function normalizeComparable(value: string): string {
  return value.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase()
}

function similarity(source: string, target: string): number {
  if (!source || !target) return 0
  let hits = 0
  for (const char of target) {
    if (source.includes(char)) hits++
  }
  return hits / target.length
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractMetrics(line: string): Omit<
  RecognizedSectionDraft,
  'id' | 'rawName' | 'section_name' | 'parent_section_name' | 'duplicate' | 'ignored'
> {
  const numbers = [...line.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
  const correctPair = line.match(/(\d+)\s*[\/／]\s*(\d+)/)
  const totalMatch = line.match(/(?:共|总题数)\s*(\d+(?:\.\d+)?)\s*题/)
  const correctMatch = line.match(/答对\s*(\d+(?:\.\d+)?)\s*(?:题|道)/)
  const timeMatch = line.match(/(?:用时|耗时|时长|时间)[^\d]*(\d+(?:\.\d+)?)(?:\s*(秒|分钟|分|min|s))?/i)
  const scoreMatch = line.match(/(?:得分|分数|成绩)[^\d]*(\d+(?:\.\d+)?)/)

  let correct: number | null = correctMatch
    ? Number(correctMatch[1])
    : correctPair ? Number(correctPair[1]) : null
  let total: number | null = totalMatch
    ? Number(totalMatch[1])
    : correctPair ? Number(correctPair[2]) : null
  const usedTime = timeMatch
    ? normalizeTimeToMinutes(Number(timeMatch[1]), timeMatch[2])
    : null
  const score = scoreMatch ? Number(scoreMatch[1]) : null

  if ((correct == null || total == null) && numbers.length >= 2) {
    const integerNumbers = numbers.filter(Number.isInteger)
    if (integerNumbers.length >= 2) {
      total = Math.max(integerNumbers[0], integerNumbers[1])
      correct = Math.min(integerNumbers[0], integerNumbers[1])
    }
  }

  return {
    total_questions: total,
    correct_questions: correct,
    used_time: usedTime,
    score,
  }
}

function normalizeTimeToMinutes(value: number, unit?: string): number {
  if (!unit) return value
  const normalizedUnit = unit.toLowerCase()
  if (normalizedUnit === '秒' || normalizedUnit === 's') {
    return Number((value / 60).toFixed(2))
  }
  return value
}

function hasUsefulMetric(
  metrics: Pick<RecognizedSectionDraft, 'total_questions' | 'correct_questions' | 'used_time' | 'score'>,
): boolean {
  return Object.values(metrics).some((value) => value != null)
}

function extractTextFromOcrResponse(payload: unknown): string {
  const chunks: string[] = []

  function visit(value: unknown) {
    if (value == null) return
    if (typeof value === 'string') {
      chunks.push(value)
      return
    }
    if (Array.isArray(value)) {
      if (typeof value[0] === 'string') {
        chunks.push(value[0])
      }
      if (Array.isArray(value[1]) && typeof value[1][0] === 'string') {
        chunks.push(value[1][0])
      }
      value.forEach(visit)
      return
    }
    if (typeof value !== 'object') return

    const record = value as Record<string, unknown>
    if (record.markdown && typeof record.markdown === 'object') {
      const markdown = record.markdown as Record<string, unknown>
      if (typeof markdown.text === 'string') {
        chunks.push(markdown.text)
      }
    }

    for (const key of ['text', 'words', 'word', 'transcription', 'rec_text', 'label']) {
      if (typeof record[key] === 'string') {
        chunks.push(record[key] as string)
      }
    }
    for (const key of [
      'result',
      'results',
      'data',
      'layoutParsingResults',
      'prunedResult',
      'output',
      'ocr',
      'ocrResult',
      'ocr_result',
      'lines',
      'items',
      'words_result',
      'words_result_list',
      'prism_wordsInfo',
    ]) {
      visit(record[key])
    }
  }

  visit(payload)
  return chunks.join('\n')
}
