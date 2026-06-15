/**
 * 计算正确率（%）
 * accuracy = correct_questions / total_questions * 100
 */
export function calcAccuracy(correct: number, total: number): number {
  if (!total || total <= 0) return 0
  return (correct / total) * 100
}

/**
 * 计算得分效率
 * score_efficiency = (correct_questions * per_question_score) / used_time
 */
export function calcScoreEfficiency(correct: number, perScore: number, usedTime: number): number {
  if (!usedTime || usedTime <= 0) return 0
  return (correct * perScore) / usedTime
}

/**
 * 用时占比（%）
 */
export function calcTimePercent(sectionTime: number, totalTime: number): number {
  if (!totalTime || totalTime <= 0) return 0
  return (sectionTime / totalTime) * 100
}

/**
 * 题量占比（%）
 */
export function calcQuestionPercent(sectionQuestions: number, totalQuestions: number): number {
  if (!totalQuestions || totalQuestions <= 0) return 0
  return (sectionQuestions / totalQuestions) * 100
}

/**
 * 比较实际值 vs 目标值
 * 返回差值（正数表示超过目标）
 */
export function compareToTarget(actual: number, target: number | null | undefined): number | null {
  if (target == null) return null
  return actual - target
}

// ============================================================
// Y 轴动态范围计算
// ============================================================

export interface YRange {
  min: number
  max: number
}

/**
 * 根据数据点动态计算 Y 轴范围
 * - 上下各预留 10% 留白
 * - 最小值 ≥ 0
 * - 数据全为 0 → [0, 10]
 * - 所有值相同 → ±10% 围绕该值
 * - 跨度 < 5 → 按最小跨度 5 计算留白
 */
export function computeYRange(data: number[]): YRange {
  if (data.length === 0) return { min: 0, max: 10 }

  const minData = Math.min(...data)
  const maxData = Math.max(...data)
  const span = maxData - minData

  // 全 0
  if (minData === 0 && maxData === 0) return { min: 0, max: 10 }

  // 所有值相同（非 0 常数）
  if (span === 0) {
    const pad = Math.abs(minData) * 0.1 || 1
    return { min: Math.max(0, minData - pad), max: maxData + pad }
  }

  // 跨度极小（< 5），按最小跨度 5 计算
  const effectiveSpan = span < 5 ? 5 : span
  const pad = effectiveSpan * 0.1

  return {
    min: Math.max(0, minData - pad),
    max: maxData + pad,
  }
}

/**
 * 从多个系列的 TrendPoint 数组中提取所有 value，计算 Y 轴范围
 */
export function computeYRangeFromTrends(
  trends: { dataPoints: { value: number }[] }[],
): YRange {
  const allValues = trends.flatMap((t) => t.dataPoints.map((p) => p.value))
  return computeYRange(allValues)
}
