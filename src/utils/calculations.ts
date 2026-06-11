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
