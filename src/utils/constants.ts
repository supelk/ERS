import type { ExamType, ExamType1, TaskStatus } from '@/types/exam'

// ============================================================
// 板块层级结构定义
// ============================================================
export interface SectionDef {
  name: string
  children?: string[] // 二级板块名称
}

export const SECTION_HIERARCHY: SectionDef[] = [
  { name: '政治理论' },
  { name: '常识判断' },
  {
    name: '言语理解',
    children: ['逻辑填空', '片段阅读', '语句表达'],
  },
  {
    name: '数量关系',
    children: ['数字推理', '数学运算'],
  },
  {
    name: '判断推理',
    children: ['图形推理', '逻辑判断', '定义判断', '类比推理', '科学推理'],
  },
  { name: '资料分析' },
]

// 一级板块列表（供下拉选择）
export const PARENT_SECTIONS = SECTION_HIERARCHY.map((s) => ({
  label: s.name,
  value: s.name,
}))

// 所有板块（一级 + 二级，扁平化，供下拉选择）
export const ALL_SECTIONS = SECTION_HIERARCHY.flatMap((s) => {
  const items = [{ label: s.name, value: s.name }]
  if (s.children) {
    items.push(
      ...s.children.map((c) => ({
        label: `  └ ${c}`,
        value: c,
      }))
    )
  }
  return items
})

// 根据板块名获取其父级名称
export function getParentSectionName(sectionName: string): string | null {
  for (const s of SECTION_HIERARCHY) {
    if (s.children && s.children.includes(sectionName)) {
      return s.name
    }
  }
  return null
}

// 检查是否为一级板块
export function isParentSection(name: string): boolean {
  return SECTION_HIERARCHY.some((s) => s.name === name)
}

// 获取一级板块下的二级板块列表
export function getChildrenOf(parentName: string): string[] {
  const parent = SECTION_HIERARCHY.find((s) => s.name === parentName)
  return parent?.children ?? []
}

// ============================================================
// 预设板块（兼容旧代码，保留 ALL_SECTIONS 的扁平列表）
// ============================================================
export const PRESET_SECTIONS = ALL_SECTIONS

// ============================================================
// 板块题数预设（按考试分类）
// ============================================================
export const SECTION_QUESTION_PRESETS: Record<ExamType1, Record<string, number>> = {
  '国考': {
    '政治理论': 20,
    '常识判断': 15,
    '言语理解': 30,
    '逻辑填空': 15,
    '片段阅读': 9,
    '语句表达': 6,
    '数量关系': 10,
    '数学运算': 10,
    '判断推理': 35,
    '图形推理': 10,
    '定义判断': 10,
    '类比推理': 5,
    '逻辑判断': 10,
    '资料分析': 20,
  },
  '省考': {
    '政治理论': 10,
    '常识判断': 5,
    '言语理解': 15,
    '逻辑填空': 5,
    '片段阅读': 7,
    '语句表达': 3,
    '数量关系': 15,
    '数字推理': 5,
    '数学运算': 10,
    '判断推理': 25,
    '图形推理': 5,
    '逻辑判断': 15,
    '科学推理': 5,
    '资料分析': 20,
  },
}

// ============================================================
// 板块分值预设（按考试分类）
// ============================================================
export const SECTION_SCORE_PRESETS: Record<ExamType1, Record<string, number>> = {
  '国考': {
    '政治理论': 0.5,
    '常识判断': 0.5,
    '言语理解': 0.8,
    '逻辑填空': 0.8,
    '片段阅读': 0.8,
    '语句表达': 0.8,
    '数量关系': 1,
    '数学运算': 1,
    '判断推理': 0.814,
    '图形推理': 0.8,
    '定义判断': 0.8,
    '类比推理': 0.9,
    '逻辑判断': 0.8,
    '资料分析': 1,
  },
  '省考': {
    '政治理论': 1,
    '常识判断': 1.4,
    '言语理解': 1,
    '逻辑填空': 1,
    '片段阅读': 1,
    '语句表达': 1,
    '数量关系': 1,
    '数字推理': 1,
    '数学运算': 1,
    '判断推理': 1.16,
    '图形推理': 1,
    '逻辑判断': 1.2,
    '科学推理': 1.2,
    '资料分析': 1.2,
  },
}

// ============================================================
// 枚举选项
// ============================================================
export const EXAM_TYPE_1_OPTIONS: { label: string; value: ExamType1 }[] = [
  { label: '国考', value: '国考' },
  { label: '省考', value: '省考' },
]

export const EXAM_TYPE_OPTIONS: { label: string; value: ExamType }[] = [
  { label: '模考', value: '模考' },
  { label: '真题', value: '真题' },
  { label: '专项练习', value: '专项练习' },
  { label: '自测', value: '自测' },
]

export const TASK_STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: '未开始', value: '未开始' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
]

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  '未开始': '#9CA3AF',
  '进行中': '#5B8DEF',
  '已完成': '#10B981',
}

// ============================================================
// 问题标签
// ============================================================
export const PROBLEM_TAGS = [
  '超时',
  '正确率低',
  '没时间写',
  '粗心失误',
  '知识点不熟',
  '做题顺序问题',
  '心态影响',
  '蒙题过多',
  '未作答',
  '薄弱题型',
] as const

// ============================================================
// 计划模板
// ============================================================
export const PLAN_TEMPLATES = [
  '遇难则跳',
  '专项练习',
  '复盘错题',
  '提速训练',
  '知识点复习',
  '模拟实战',
  '调整做题顺序',
  '专项突破弱项',
] as const
