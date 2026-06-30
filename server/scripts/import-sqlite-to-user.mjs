#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const args = parseArgs(process.argv.slice(2))
const inputPath = args.input || args.i
const username = args.user || 'zy'
const apply = Boolean(args.apply)
const databaseUrl = args.databaseUrl || process.env.DATABASE_URL

if (!inputPath) fail('Missing --input <sqlite-export.json>')
if (!databaseUrl) fail('Missing DATABASE_URL or --database-url <url>')

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const pool = new pg.Pool({ connectionString: databaseUrl })

try {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query('SELECT id, username, disabled FROM users WHERE username = $1', [username])
    const user = userResult.rows[0]
    if (!user) throw new Error(`Target user not found: ${username}`)
    if (user.disabled) throw new Error(`Target user is disabled: ${username}`)

    validatePayload(payload)
    const counts = countPayload(payload)
    const mapping = {
      user: { id: Number(user.id), username: user.username },
      exams: {},
      sections: {},
      practiceTasks: {},
      reviewQuestions: {},
      practiceRecords: {},
      idioms: {},
    }

    if (apply) {
      await importPayload(client, Number(user.id), payload, mapping)
    }

    if (apply) {
      await client.query('COMMIT')
    } else {
      await client.query('ROLLBACK')
    }

    const summary = {
      mode: apply ? 'apply' : 'dry-run',
      inputPath,
      importedAt: new Date().toISOString(),
      targetUser: mapping.user,
      counts,
      mapping,
    }
    const outputPath = writeSummary(summary)
    console.log(JSON.stringify({ ok: true, mode: summary.mode, counts, outputPath }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
} finally {
  await pool.end()
}

function parseArgs(argv) {
  const result = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    if (key === 'apply' || key === 'dry-run') {
      result[key] = true
    } else {
      const value = argv[++i]
      if (!value) fail(`Missing value for --${key}`)
      result[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value
    }
  }
  return result
}

function validatePayload(data) {
  const requiredArrays = [
    'exam_records',
    'exam_section_records',
    'review_question_records',
    'practice_tasks',
    'practice_records',
    'idiom_records',
  ]
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) throw new Error(`Invalid export: ${key} must be an array`)
  }
  for (const exam of data.exam_records) {
    requireFields(exam, ['exam_id', 'exam_name', 'exam_date', 'exam_type_1', 'exam_type'], 'exam_records')
  }
  for (const section of data.exam_section_records) {
    requireFields(section, ['section_id', 'exam_id', 'section_name'], 'exam_section_records')
  }
  for (const review of data.review_question_records) {
    requireFields(review, ['id', 'exam_id', 'question_type', 'section_name'], 'review_question_records')
  }
  for (const task of data.practice_tasks) {
    requireFields(task, ['task_id', 'task_name', 'status'], 'practice_tasks')
  }
  for (const practice of data.practice_records) {
    requireFields(practice, ['id', 'section_name', 'practice_date'], 'practice_records')
  }
  for (const idiom of data.idiom_records) {
    requireFields(idiom, ['id', 'word', 'definition'], 'idiom_records')
  }
}

function requireFields(row, fields, table) {
  for (const field of fields) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      throw new Error(`${table}.${field} is required; row=${JSON.stringify(row)}`)
    }
  }
}

function countPayload(data) {
  return {
    exam_records: data.exam_records.length,
    exam_section_records: data.exam_section_records.length,
    review_question_records: data.review_question_records.length,
    practice_tasks: data.practice_tasks.length,
    practice_records: data.practice_records.length,
    idiom_records: data.idiom_records.length,
  }
}

async function importPayload(client, userId, data, mapping) {
  for (const exam of data.exam_records) {
    const result = await client.query(
      `INSERT INTO exam_records
       (user_id, exam_name, exam_date, exam_type_1, exam_type, total_score, full_score, current_target_score, next_target_score, total_time, question_order, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING exam_id`,
      [
        userId,
        exam.exam_name,
        exam.exam_date,
        exam.exam_type_1,
        exam.exam_type,
        numberOrDefault(exam.total_score, 0),
        numberOrDefault(exam.full_score, 100),
        nullableNumber(exam.current_target_score),
        nullableNumber(exam.next_target_score),
        nullableNumber(exam.total_time),
        nullableString(exam.question_order),
        nullableString(exam.notes),
        nullableDate(exam.created_at),
        nullableDate(exam.updated_at),
      ],
    )
    mapping.exams[String(exam.exam_id)] = Number(result.rows[0].exam_id)
  }

  for (const section of data.exam_section_records) {
    const newExamId = mapping.exams[String(section.exam_id)]
    if (!newExamId) throw new Error(`Missing mapped exam_id for section ${section.section_id}`)
    const result = await client.query(
      `INSERT INTO exam_section_records
       (user_id, exam_id, section_name, parent_section_name, total_questions, correct_questions, per_question_score, used_time, unattempted_questions, analysis, plan, next_target_accuracy, next_target_time, next_target_efficiency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING section_id`,
      [
        userId,
        newExamId,
        section.section_name,
        nullableString(section.parent_section_name),
        numberOrDefault(section.total_questions, 0),
        numberOrDefault(section.correct_questions, 0),
        numberOrDefault(section.per_question_score, 1),
        numberOrDefault(section.used_time, 0),
        numberOrDefault(section.unattempted_questions, 0),
        nullableString(section.analysis),
        nullableString(section.plan),
        nullableNumber(section.next_target_accuracy),
        nullableNumber(section.next_target_time),
        nullableNumber(section.next_target_efficiency),
      ],
    )
    mapping.sections[String(section.section_id)] = Number(result.rows[0].section_id)
  }

  for (const review of data.review_question_records) {
    const newExamId = mapping.exams[String(review.exam_id)]
    if (!newExamId) throw new Error(`Missing mapped exam_id for review question ${review.id}`)
    const result = await client.query(
      `INSERT INTO review_question_records
       (user_id, exam_id, question_type, section_name, question_number, time_spent, knowledge_point, analysis, improvement_plan, solving_insight, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        userId,
        newExamId,
        review.question_type,
        review.section_name,
        review.question_number ?? '',
        nullableNumber(review.time_spent),
        review.knowledge_point ?? '',
        review.analysis ?? '',
        review.improvement_plan ?? '',
        review.solving_insight ?? '',
        numberOrDefault(review.sort_order, 0),
      ],
    )
    mapping.reviewQuestions[String(review.id)] = Number(result.rows[0].id)
  }

  for (const task of data.practice_tasks) {
    const result = await client.query(
      'INSERT INTO practice_tasks (user_id, task_name, status, created_at) VALUES ($1,$2,$3,$4) RETURNING task_id',
      [userId, task.task_name, task.status, nullableDate(task.created_at)],
    )
    mapping.practiceTasks[String(task.task_id)] = Number(result.rows[0].task_id)
  }

  for (const practice of data.practice_records) {
    const result = await client.query(
      `INSERT INTO practice_records
       (user_id, section_name, practice_date, total_questions, correct_questions, used_time, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        userId,
        practice.section_name,
        practice.practice_date,
        numberOrDefault(practice.total_questions, 0),
        numberOrDefault(practice.correct_questions, 0),
        numberOrDefault(practice.used_time, 0),
        nullableString(practice.notes),
        nullableDate(practice.created_at),
      ],
    )
    mapping.practiceRecords[String(practice.id)] = Number(result.rows[0].id)
  }

  for (const idiom of data.idiom_records) {
    const result = await client.query(
      'INSERT INTO idiom_records (user_id, word, definition, notes, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [userId, idiom.word, idiom.definition, nullableString(idiom.notes), nullableDate(idiom.created_at)],
    )
    mapping.idioms[String(idiom.id)] = Number(result.rows[0].id)
  }
}

function nullableString(value) {
  return value === undefined || value === null || value === '' ? null : String(value)
}

function nullableDate(value) {
  return value === undefined || value === null || value === '' ? null : value
}

function nullableNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function numberOrDefault(value, fallback) {
  const number = nullableNumber(value)
  return number ?? fallback
}

function writeSummary(summary) {
  const outputDir = path.resolve(process.cwd(), 'migration-output')
  fs.mkdirSync(outputDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')
  const outputPath = path.join(outputDir, `${summary.targetUser.username}-import-${stamp}.json`)
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`)
  return outputPath
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
