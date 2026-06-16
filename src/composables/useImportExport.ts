import { useDatabaseStore } from '@/stores/database'
import type { ExamRecord, ExamSectionRecord } from '@/types/exam'

export interface ExportData {
  version: string
  exported_at: string
  exams: ExamExportItem[]
}

export interface ExamExportItem {
  exam: ExamRecord
  sections: ExamSectionRecord[]
}

/**
 * 导出考试数据为 JSON
 */
export async function exportToJSON(examIds?: number[]): Promise<ExportData> {
  const db = useDatabaseStore().getDb()

  let examRows: any[]
  if (examIds && examIds.length > 0) {
    const placeholders = examIds.map((_, i) => `$${i + 1}`).join(',')
    examRows = await db.select<any[]>(
      `SELECT * FROM exam_records WHERE exam_id IN (${placeholders}) ORDER BY exam_date DESC`,
      examIds
    )
  } else {
    examRows = await db.select<any[]>(
      'SELECT * FROM exam_records ORDER BY exam_date DESC'
    )
  }

  const exams: ExamExportItem[] = []
  for (const exam of examRows) {
    const sectionRows = await db.select<any[]>(
      'SELECT * FROM exam_section_records WHERE exam_id = $1 ORDER BY section_id',
      [exam.exam_id]
    )
    exams.push({
      exam: cleanExam(exam),
      sections: sectionRows.map(cleanSection),
    })
  }

  return {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    exams,
  }
}

/**
 * 导入 JSON 数据
 */
export async function importFromJSON(data: ExportData): Promise<{ imported: number; skipped: number }> {
  const db = useDatabaseStore().getDb()
  let imported = 0
  let skipped = 0

  if (!data.exams || !Array.isArray(data.exams)) {
    throw new Error('无效的 JSON 格式：缺少 exams 数组')
  }

  for (const item of data.exams) {
    const exam = item.exam
    if (!exam.exam_name || !exam.exam_date) {
      skipped++
      continue
    }

    await db.execute('BEGIN TRANSACTION')
    try {
      // 插入考试
      const result = await db.execute(
        `INSERT INTO exam_records
          (exam_name, exam_date, exam_type_1, exam_type, total_score, full_score,
           current_target_score, next_target_score, total_time, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          exam.exam_name,
          exam.exam_date,
          exam.exam_type_1 || '省考',
          exam.exam_type || '模考',
          exam.total_score ?? 0,
          exam.full_score ?? 100,
          exam.current_target_score ?? null,
          exam.next_target_score ?? null,
          exam.total_time ?? null,
          exam.notes ?? null,
        ]
      )
      const examId = result.lastInsertId

      // 插入板块
      if (item.sections && Array.isArray(item.sections)) {
        for (const s of item.sections) {
          await db.execute(
            `INSERT INTO exam_section_records
              (exam_id, section_name, parent_section_name, total_questions, correct_questions,
               per_question_score, used_time, unattempted_questions,
               analysis, plan, next_target_accuracy, next_target_time,
               next_target_efficiency)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              examId,
              s.section_name,
              s.parent_section_name ?? null,
              s.total_questions ?? 0,
              s.correct_questions ?? 0,
              s.per_question_score ?? 1,
              s.used_time ?? 0,
              s.unattempted_questions ?? 0,
              s.analysis ?? null,
              s.plan ?? null,
              s.next_target_accuracy ?? null,
              s.next_target_time ?? null,
              s.next_target_efficiency ?? null,
            ]
          )
        }
      }

      await db.execute('COMMIT')
      imported++
    } catch (e) {
      await db.execute('ROLLBACK')
      console.error('Import failed for exam:', exam.exam_name, e)
      skipped++
    }
  }

  return { imported, skipped }
}

/**
 * 导出板块数据为 CSV 字符串
 */
export async function exportToCSV(examIds?: number[]): Promise<string> {
  const db = useDatabaseStore().getDb()

  let rows: any[]
  if (examIds && examIds.length > 0) {
    const placeholders = examIds.map((_, i) => `$${i + 1}`).join(',')
    rows = await db.select<any[]>(
      `SELECT er.exam_name, er.exam_date, er.exam_type_1, er.exam_type,
              esr.section_name, esr.total_questions, esr.correct_questions,
              esr.per_question_score, esr.used_time, esr.unattempted_questions,
              esr.accuracy, esr.score_efficiency, esr.analysis, esr.plan
       FROM exam_section_records esr
       JOIN exam_records er ON esr.exam_id = er.exam_id
       ${examIds.length ? `WHERE er.exam_id IN (${placeholders})` : ''}
       ORDER BY er.exam_date DESC, esr.section_id`,
      examIds.length ? examIds : undefined
    )
  } else {
    rows = await db.select<any[]>(
      `SELECT er.exam_name, er.exam_date, er.exam_type_1, er.exam_type,
              esr.section_name, esr.total_questions, esr.correct_questions,
              esr.per_question_score, esr.used_time, esr.unattempted_questions,
              esr.accuracy, esr.score_efficiency, esr.analysis, esr.plan
       FROM exam_section_records esr
       JOIN exam_records er ON esr.exam_id = er.exam_id
       ORDER BY er.exam_date DESC, esr.section_id`
    )
  }

  // CSV 表头
  const header = [
    'exam_name', 'exam_date', 'exam_type_1', 'exam_type',
    'section_name', 'total_questions', 'correct_questions',
    'per_question_score', 'used_time', 'unattempted_questions',
    'accuracy', 'score_efficiency', 'analysis', 'plan',
  ].join(',')

  // CSV 行
  const csvRows = rows.map((r: any) =>
    header
      .split(',')
      .map((col) => csvEscape(r[col]))
      .join(',')
  )

  return [header, ...csvRows].join('\n')
}

/**
 * 从 CSV 字符串导入板块数据
 * CSV 格式：exam_name,exam_date,exam_type_1,exam_type,section_name,total_questions,...
 */
export async function importFromCSV(csvContent: string): Promise<{ imported: number; skipped: number }> {
  const db = useDatabaseStore().getDb()
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    throw new Error('CSV 文件为空或只有表头')
  }

  const header = lines[0].split(',').map((h) => h.trim())
  let imported = 0
  let skipped = 0

  // 按考试分组
  const examMap = new Map<string, { exam: any; sections: any[] }>()

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < header.length) {
      skipped++
      continue
    }

    const row: any = {}
    header.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? ''
    })

    const key = `${row.exam_name}||${row.exam_date}`
    if (!examMap.has(key)) {
      examMap.set(key, {
        exam: {
          exam_name: row.exam_name,
          exam_date: row.exam_date,
          exam_type_1: row.exam_type_1 || '省考',
          exam_type: row.exam_type || '模考',
        },
        sections: [],
      })
    }
    examMap.get(key)!.sections.push(row)
  }

  for (const [_, group] of examMap) {
    if (!group.exam.exam_name || !group.exam.exam_date) {
      skipped++
      continue
    }

    await db.execute('BEGIN TRANSACTION')
    try {
      const result = await db.execute(
        `INSERT INTO exam_records (exam_name, exam_date, exam_type_1, exam_type)
         VALUES ($1,$2,$3,$4)`,
        [group.exam.exam_name, group.exam.exam_date, group.exam.exam_type_1, group.exam.exam_type]
      )
      const examId = result.lastInsertId

      for (const s of group.sections) {
        await db.execute(
          `INSERT INTO exam_section_records
            (exam_id, section_name, total_questions, correct_questions,
             per_question_score, used_time, unattempted_questions, analysis, plan)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            examId,
            s.section_name,
            parseInt(s.total_questions) || 0,
            parseInt(s.correct_questions) || 0,
            parseFloat(s.per_question_score) || 1,
            parseFloat(s.used_time) || 0,
            parseInt(s.unattempted_questions) || 0,
            s.analysis || null,
            s.plan || null,
          ]
        )
      }

      await db.execute('COMMIT')
      imported++
    } catch (e) {
      await db.execute('ROLLBACK')
      console.error('CSV import failed:', e)
      skipped++
    }
  }

  return { imported, skipped }
}

// ============================================================
// Helpers
// ============================================================
function cleanExam(r: any): ExamRecord {
  return {
    exam_id: r.exam_id,
    exam_name: r.exam_name,
    exam_date: r.exam_date,
    exam_type_1: r.exam_type_1,
    exam_type: r.exam_type,
    total_score: r.total_score,
    full_score: r.full_score,
    current_target_score: r.current_target_score,
    next_target_score: r.next_target_score,
    total_time: r.total_time,
    notes: r.notes,
  }
}

function cleanSection(r: any): ExamSectionRecord {
  return {
    section_id: r.section_id,
    exam_id: r.exam_id,
    section_name: r.section_name,
    parent_section_name: r.parent_section_name ?? null,
    total_questions: r.total_questions,
    correct_questions: r.correct_questions,
    per_question_score: r.per_question_score,
    used_time: r.used_time,
    unattempted_questions: r.unattempted_questions,
    accuracy: r.accuracy,
    score_efficiency: r.score_efficiency,
    analysis: r.analysis,
    plan: r.plan,
    next_target_accuracy: r.next_target_accuracy,
    next_target_time: r.next_target_time,
    next_target_efficiency: r.next_target_efficiency,
  }
}

function csvEscape(val: any): string {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}
