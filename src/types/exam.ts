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
  section_id: number | null
  task_name: string
  total_questions: number
  completed_questions: number
  status: TaskStatus
  deadline: string | null
  created_at?: string
}

export type TaskStatus = '未开始' | '进行中' | '已完成' | '逾期'

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
