import { callDeepSeek } from '@/utils/llm'
import type {
  ExamRecord,
  ExamSectionRecord,
  ReviewQuestionRecord,
  MultiExamSectionTrend,
  TrendPoint,
} from '@/types/exam'

export interface SingleExamAiResult {
  overall: string
  strengths: string[]
  weaknesses: string[]
  sectionTags: Array<{
    section: string
    tag: string
    change: string
    note: string
  }>
  errorStats: Array<{
    category: string
    count: number
    note: string
  }>
  suggestions: string[]
  problemSummary: string
  taskSuggestions: string[]
}

export interface HistoryAiResult {
  trendSummary: string
  quantitativeChanges: string[]
  progressSections: string[]
  bottleneckSections: string[]
  commonProblems: string[]
  priorities: string[]
  targetTasks: string[]
  focusSection?: string
}

export interface HistoryAiInput {
  filterLabel: string
  selectedSection: string
  scoreTrend: TrendPoint[]
  sectionTimeTrends: MultiExamSectionTrend[]
  sectionEfficiencyTrends: MultiExamSectionTrend[]
  sectionAccuracyTrends: MultiExamSectionTrend[]
}

export async function analyzeSingleExam(input: {
  exam: ExamRecord
  sections: ExamSectionRecord[]
  previousSameTypeSections: ExamSectionRecord[]
  wrongQuestions: ReviewQuestionRecord[]
  speedQuestions: ReviewQuestionRecord[]
  fastCorrectQuestions: ReviewQuestionRecord[]
}): Promise<SingleExamAiResult> {
  const payload = {
    exam: input.exam,
    sections: input.sections.map(sectionSummary),
    previousSameTypeSections: input.previousSameTypeSections.map(sectionSummary),
    reviewQuestions: {
      wrong: input.wrongQuestions.map(reviewSummary),
      slowCorrect: input.speedQuestions.map(reviewSummary),
      fastCorrect: input.fastCorrectQuestions.map(reviewSummary),
    },
  }

  const text = await callDeepSeek(
    [
      '你是公务员行测考试复盘教练。',
      '只基于用户提供的数据分析，不编造不存在的错题或分数。',
      '输出严格 JSON，不要 Markdown，不要代码块。',
      '所有建议必须具体、可执行、偏轻量。',
    ].join('\n'),
    [
      '请生成单场考试智能复盘。',
      '字段要求：overall:string, strengths:string[], weaknesses:string[], sectionTags:{section,tag,change,note}[], errorStats:{category,count,note}[], suggestions:string[3], problemSummary:string, taskSuggestions:string[].',
      'sectionTags 的 change 对比 previousSameTypeSections，若无历史则写“暂无同类型历史对比”。',
      'errorStats 从 wrong/slowCorrect 的 knowledge_point、analysis、improvement_plan 中归类统计。',
      JSON.stringify(payload),
    ].join('\n'),
    1600,
  )

  return normalizeSingleResult(parseJsonObject(text))
}

export async function analyzeHistory(input: HistoryAiInput): Promise<HistoryAiResult> {
  const text = await callDeepSeek(
    [
      '你是考试趋势诊断助手。',
      '只基于提供的趋势数据分析，数据不足时明确说明限制。',
      '输出严格 JSON，不要 Markdown，不要代码块。',
    ].join('\n'),
    [
      '请根据当前筛选条件生成历史数据智能诊断。',
      '字段要求：trendSummary:string, quantitativeChanges:string[], progressSections:string[], bottleneckSections:string[], commonProblems:string[], priorities:string[], targetTasks:string[], focusSection?:string。',
      'focusSection 必须从当前数据中的板块名称选择，用于跳转板块趋势详情；如果没有明确板块可为空。',
      JSON.stringify(input),
    ].join('\n'),
    1600,
  )

  return normalizeHistoryResult(parseJsonObject(text))
}

function sectionSummary(section: ExamSectionRecord) {
  return {
    section: section.parent_section_name
      ? `${section.parent_section_name}/${section.section_name}`
      : section.section_name,
    section_name: section.section_name,
    parent_section_name: section.parent_section_name,
    total_questions: section.total_questions,
    correct_questions: section.correct_questions,
    accuracy: Number((section.accuracy ?? 0).toFixed(1)),
    used_time: section.used_time,
    score_efficiency: Number((section.score_efficiency ?? 0).toFixed(3)),
    analysis: section.analysis,
    plan: section.plan,
  }
}

function reviewSummary(question: ReviewQuestionRecord) {
  return {
    section_name: question.section_name,
    question_number: question.question_number,
    time_spent: question.time_spent,
    knowledge_point: question.knowledge_point,
    analysis: question.analysis,
    improvement_plan: question.improvement_plan,
    solving_insight: question.solving_insight,
  }
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI 返回内容不是有效 JSON')
    return JSON.parse(match[0])
  }
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : []
}

function normalizeSingleResult(value: Record<string, unknown>): SingleExamAiResult {
  return {
    overall: String(value.overall || ''),
    strengths: toStringArray(value.strengths),
    weaknesses: toStringArray(value.weaknesses),
    sectionTags: Array.isArray(value.sectionTags)
      ? value.sectionTags.map((item: any) => ({
        section: String(item.section || ''),
        tag: String(item.tag || ''),
        change: String(item.change || ''),
        note: String(item.note || ''),
      })).filter((item) => item.section || item.tag || item.note)
      : [],
    errorStats: Array.isArray(value.errorStats)
      ? value.errorStats.map((item: any) => ({
        category: String(item.category || ''),
        count: Number(item.count || 0),
        note: String(item.note || ''),
      })).filter((item) => item.category)
      : [],
    suggestions: toStringArray(value.suggestions).slice(0, 3),
    problemSummary: String(value.problemSummary || ''),
    taskSuggestions: toStringArray(value.taskSuggestions),
  }
}

function normalizeHistoryResult(value: Record<string, unknown>): HistoryAiResult {
  return {
    trendSummary: String(value.trendSummary || ''),
    quantitativeChanges: toStringArray(value.quantitativeChanges),
    progressSections: toStringArray(value.progressSections),
    bottleneckSections: toStringArray(value.bottleneckSections),
    commonProblems: toStringArray(value.commonProblems),
    priorities: toStringArray(value.priorities),
    targetTasks: toStringArray(value.targetTasks),
    focusSection: typeof value.focusSection === 'string' ? value.focusSection : '',
  }
}
