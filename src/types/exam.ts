// ============================================================
// 考试主表
// ============================================================
export interface ExamRecord {
  exam_id: number
  exam_name: string
  exam_date: string               // ISO date string
  exam_type_1: ExamType1          // 国考 | 省考
  exam_type: ExamType             // 模考 | 真题 | 专项练习 | 自测
  total_score: number
  full_score: number              // 默认 100
  current_target_score: number | null
  next_target_score: number | null
  total_time: number | null       // 总用时（分钟）
  notes: string | null
  created_at?: string
  updated_at?: string
}

export type ExamType1 = '国考' | '省考'
export type ExamType = '模考' | '真题' | '专项练习' | '自测'

// ============================================================
// 板块记录表
// ============================================================
export interface ExamSectionRecord {
  section_id: number
  exam_id: number
  section_name: string
  parent_section_name: string | null  // 所属一级板块，null 表示本身即为一级板块
  total_questions: number
  correct_questions: number
  per_question_score: number      // 每题分值，默认 1
  used_time: number               // 用时（分钟）
  unattempted_questions: number   // 未作答数
  accuracy: number                // 自动计算：正确率%
  score_efficiency: number        // 自动计算：得分效率
  analysis: string | null         // 问题分析
  plan: string | null             // 下一步计划
  next_target_accuracy: number | null
  next_target_time: number | null
  next_target_efficiency: number | null
}

// ============================================================
// 练习任务表
// ============================================================
export interface PracticeTask {
  task_id: number
  task_name: string
  status: TaskStatus
  created_at?: string
}

export type TaskStatus = '未开始' | '进行中' | '已完成'

// ============================================================
// 前端表单专用（合并考试 + 板块，用于录入/编辑）
// ============================================================
export interface ExamFormData {
  // 考试主表字段（exam_id 为 0 表示新增）
  exam_id: number
  exam_name: string
  exam_date: string
  exam_type_1: ExamType1
  exam_type: ExamType
  total_score: number
  full_score: number
  current_target_score: number | null
  next_target_score: number | null
  total_time: number | null
  notes: string | null
  // 板块列表
  sections: ExamSectionFormData[]
  // 复盘题目列表（三个 Tab）
  wrong_questions: ReviewQuestionFormData[]
  speed_questions: ReviewQuestionFormData[]
  fast_correct_questions: ReviewQuestionFormData[]
}

export interface ExamSectionFormData {
  // 客户端临时 ID（新增行用，如 'temp-1'）
  client_id: string
  section_id: number              // 0 表示新增
  section_name: string
  parent_section_name: string | null  // 所属一级板块
  total_questions: number
  correct_questions: number
  per_question_score: number
  used_time: number
  unattempted_questions: number
  analysis: string | null
  plan: string | null
  next_target_accuracy: number | null
  next_target_time: number | null
  next_target_efficiency: number | null
}

// ============================================================
// 复盘题目类型
// ============================================================
export type ReviewQuestionType = 'wrong' | 'speed' | 'fast'

// ============================================================
// 复盘题目记录（DB 查询结果 / 前端表单共用字段）
// ============================================================
export interface ReviewQuestionRecord {
  id: number
  exam_id: number
  question_type: ReviewQuestionType
  section_name: string
  question_number: string
  time_spent: number | null
  knowledge_point: string
  analysis: string
  improvement_plan: string
  solving_insight: string
  sort_order: number
}

// ============================================================
// 复盘题目（前端表单用）
// ============================================================
export interface ReviewQuestionFormData {
  client_id: string               // 客户端临时 ID
  id: number                      // 0 表示新增
  section_name: string            // 所属一级板块名称
  question_number: string         // 题号（字符串，支持 "5" / "5-8" 等灵活输入）
  time_spent: number | null       // 单题用时（分钟）
  knowledge_point: string         // 考点
  analysis: string                // 分析评价（错因复盘）
  improvement_plan: string        // 下一步计划（改进方案）
  solving_insight: string         // 破题点与解题思路（仅「又快又对的题」使用）
}

// ============================================================
// 查询/筛选参数
// ============================================================
export interface ExamFilters {
  keyword?: string                // 考试名称模糊搜索
  exam_type_1?: ExamType1 | ''
  exam_type?: ExamType | ''
  date_from?: string
  date_to?: string
}

// ============================================================
// 专项练习记录表（独立于考试系统）
// ============================================================
export interface PracticeRecord {
  id: number
  section_name: string
  practice_date: string
  total_questions: number
  correct_questions: number
  accuracy: number                    // 自动计算：正确率%
  used_time: number
  avg_time_per_question: number       // 自动计算：每题平均用时（分）
  notes: string | null
  created_at?: string
}

export interface PracticeFormData {
  id: number                          // 0 表示新增
  section_name: string
  practice_date: string
  total_questions: number
  correct_questions: number
  used_time: number
  notes: string | null
}

export interface PracticeFilters {
  keyword?: string
  section_name?: string
  date_from?: string
  date_to?: string
}

// ============================================================
// 图表数据接口
// ============================================================
export interface TrendPoint {
  label: string                   // X 轴标签（日期/考试名）
  value: number                   // Y 轴值
}

export interface SectionComparison {
  section_name: string
  actual: number
  target: number
  diff: number                    // actual - target
  isAboveTarget: boolean
}

export interface TimeDistribution {
  section_name: string
  time_percent: number            // 用时占总用时百分比
  question_percent: number        // 题数占总题数百分比
}

export interface MultiExamSectionTrend {
  section_name: string
  dataPoints: TrendPoint[]        // 每场考试该板块的数据
}
