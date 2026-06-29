// ============================================================
// 历史输入记忆 — 按考试分类缓存最近一次提交的目标字段值
// ============================================================
import { useExamStore } from '@/stores/exam'

export interface ExamMemory {
  current_target_score: number | null
  next_target_score: number | null
  total_time: number | null
  sections: Record<
    string,
    {
      next_target_accuracy: number | null
      next_target_time: number | null
    }
  >
}

const STORAGE_PREFIX = 'exam_memory_'

function storageKey(type1: string): string {
  return STORAGE_PREFIX + type1
}

// ============================================================
// localStorage 缓存读写
// ============================================================

export function loadMemoryFromCache(type1: string): ExamMemory | null {
  try {
    const raw = localStorage.getItem(storageKey(type1))
    if (!raw) return null
    return JSON.parse(raw) as ExamMemory
  } catch {
    return null
  }
}

export function saveMemoryToCache(type1: string, memory: ExamMemory): void {
  try {
    localStorage.setItem(storageKey(type1), JSON.stringify(memory))
  } catch {
    // quota exceeded or localStorage disabled — silent ignore
  }
}

// ============================================================
// 从数据库查询最近一次考试记录，提取记忆字段
// ============================================================

export async function fetchMemoryFromDB(
  type1: string,
): Promise<ExamMemory | null> {
  try {
    const examStore = useExamStore()
    await examStore.fetchExams()
    const exam = examStore.exams.find((item) => item.exam_type_1 === type1)
    if (!exam) return null
    await examStore.fetchExamById(exam.exam_id)

    const sectionMap: ExamMemory['sections'] = {}
    for (const s of examStore.currentSections) {
      if (s.next_target_accuracy != null || s.next_target_time != null) {
        sectionMap[s.section_name] = {
          next_target_accuracy: s.next_target_accuracy ?? null,
          next_target_time: s.next_target_time ?? null,
        }
      }
    }

    const memory: ExamMemory = {
      current_target_score: exam.current_target_score ?? null,
      next_target_score: exam.next_target_score ?? null,
      total_time: exam.total_time ?? null,
      sections: sectionMap,
    }

    // 同步写入 localStorage 缓存
    saveMemoryToCache(type1, memory)
    return memory
  } catch {
    // DB 查询失败（如未初始化）→ 返回 null，不影响表单正常使用
    return null
  }
}

// ============================================================
// 统一入口：优先读缓存，未命中则查库
// ============================================================

export async function getMemory(type1: string): Promise<ExamMemory | null> {
  const cached = loadMemoryFromCache(type1)
  if (cached) return cached
  return fetchMemoryFromDB(type1)
}

// ============================================================
// 提交后更新记忆（仅写 localStorage，下次查库会自动同步）
// ============================================================

export function saveMemory(type1: string, memory: ExamMemory): void {
  saveMemoryToCache(type1, memory)
}
