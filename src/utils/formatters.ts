/**
 * 百分比格式化
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '--'
  return `${value.toFixed(decimals)}%`
}

/**
 * 数字格式化，保留指定小数位
 */
export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '--'
  return value.toFixed(decimals)
}

/**
 * 日期格式化：YYYY-MM-DD
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '--'
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 获取今天日期字符串 YYYY-MM-DD
 */
export function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 差分显示文本（如 +5.2 / -3.1）
 */
export function formatDiff(value: number, decimals = 1): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}`
}

/**
 * 状态文本映射
 */
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    not_started: '未开始',
    in_progress: '进行中',
    completed: '已完成',
    overdue: '逾期',
  }
  return map[status] || status
}
