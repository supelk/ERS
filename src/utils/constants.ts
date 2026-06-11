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
    children: ['逻辑填空', '片段&表达'],
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
  { label: '逾期', value: '逾期' },
]

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  '未开始': '#808080',
  '进行中': '#2080f0',
  '已完成': '#18a058',
  '逾期': '#d03050',
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
