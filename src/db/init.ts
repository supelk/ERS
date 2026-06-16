import type Database from '@tauri-apps/plugin-sql'

/**
 * 初始化数据库表结构
 * 在 Database.load() 之后调用
 */
export async function initDatabase(db: Database): Promise<void> {
  // ============================================================
  // 考试主表
  // ============================================================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS exam_records (
      exam_id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_name TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      exam_type_1 TEXT NOT NULL CHECK(exam_type_1 IN ('国考','省考')),
      exam_type TEXT NOT NULL CHECK(exam_type IN ('模考','真题','专项练习','自测')),
      total_score REAL NOT NULL DEFAULT 0,
      full_score REAL NOT NULL DEFAULT 100,
      current_target_score REAL,
      next_target_score REAL,
      total_time REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // ============================================================
  // 板块记录表（含自动计算列 + 二级板块支持）
  // ============================================================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS exam_section_records (
      section_id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      section_name TEXT NOT NULL,
      parent_section_name TEXT,
      total_questions INTEGER NOT NULL DEFAULT 0,
      correct_questions INTEGER NOT NULL DEFAULT 0,
      per_question_score REAL NOT NULL DEFAULT 1,
      used_time REAL DEFAULT 0,
      unattempted_questions INTEGER DEFAULT 0,
      accuracy REAL GENERATED ALWAYS AS (
        CASE WHEN total_questions > 0
          THEN CAST(correct_questions AS REAL) / total_questions * 100
          ELSE 0 END
      ) STORED,
      score_efficiency REAL GENERATED ALWAYS AS (
        CASE WHEN used_time > 0 AND used_time IS NOT NULL
          THEN CAST(correct_questions AS REAL) * per_question_score / used_time
          ELSE 0 END
      ) STORED,
      analysis TEXT,
      plan TEXT,
      next_target_accuracy REAL,
      next_target_time REAL,
      next_target_efficiency REAL,
      FOREIGN KEY (exam_id) REFERENCES exam_records(exam_id) ON DELETE CASCADE
    )
  `)

  // 迁移：为已有数据库添加 parent_section_name 列
  try {
    await db.execute(
      `ALTER TABLE exam_section_records ADD COLUMN parent_section_name TEXT`
    )
    console.log('[DB] Migration: added parent_section_name column')
  } catch {
    // 列已存在，忽略
  }

  // ============================================================
  // 复盘题目表（统一存储：做错的题 / 做对但慢的题 / 又快又对的题）
  // ============================================================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS review_question_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('wrong','speed','fast')),
      section_name TEXT NOT NULL,
      question_number TEXT NOT NULL DEFAULT '',
      time_spent REAL,
      knowledge_point TEXT NOT NULL DEFAULT '',
      analysis TEXT NOT NULL DEFAULT '',
      improvement_plan TEXT NOT NULL DEFAULT '',
      solving_insight TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (exam_id) REFERENCES exam_records(exam_id) ON DELETE CASCADE
    )
  `)

  // 迁移：删除旧的 wrong_question_records 表（如存在）
  try {
    await db.execute('DROP TABLE IF EXISTS wrong_question_records')
    console.log('[DB] Migration: dropped old wrong_question_records table')
  } catch {
    // 忽略
  }

  // ============================================================
  // 练习任务表（定性方向看板：不定量、不定截止、用户自主判定完成）
  // ============================================================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS practice_tasks (
      task_id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '未开始'
        CHECK(status IN ('未开始','进行中','已完成')),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 迁移：清理旧版 practice_tasks 的废弃列（section_id / total_questions / completed_questions / deadline）
  for (const col of ['section_id', 'total_questions', 'completed_questions', 'deadline']) {
    try {
      await db.execute(`ALTER TABLE practice_tasks DROP COLUMN ${col}`)
      console.log(`[DB] Migration: dropped practice_tasks.${col}`)
    } catch { /* 列不存在或已删除，忽略 */ }
  }
  // 迁移：将存量 '逾期' 状态转为 '进行中'（新模型无逾期概念）
  try {
    const result = await db.execute(
      "UPDATE practice_tasks SET status = '进行中' WHERE status = '逾期'"
    )
    if (result.rowsAffected > 0) {
      console.log(`[DB] Migration: reset ${result.rowsAffected} overdue tasks to 进行中`)
    }
  } catch { /* 忽略 */ }

  // ============================================================
  // 专项练习记录表（独立于考试模块）
  // ============================================================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS practice_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_name TEXT NOT NULL,
      practice_date TEXT NOT NULL,
      total_questions INTEGER NOT NULL DEFAULT 0,
      correct_questions INTEGER NOT NULL DEFAULT 0,
      accuracy REAL GENERATED ALWAYS AS (
        CASE WHEN total_questions > 0
          THEN CAST(correct_questions AS REAL) / total_questions * 100
          ELSE 0 END
      ) STORED,
      used_time REAL NOT NULL DEFAULT 0,
      avg_time_per_question REAL GENERATED ALWAYS AS (
        CASE WHEN total_questions > 0 AND used_time > 0
          THEN used_time / CAST(total_questions AS REAL)
          ELSE 0 END
      ) STORED,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 迁移：删除旧版 practice_records 中的 task_id 列
  try {
    await db.execute('ALTER TABLE practice_records DROP COLUMN task_id')
    console.log('[DB] Migration: dropped practice_records.task_id')
  } catch { /* 列不存在或已删除，忽略 */ }

  // ============================================================
  // 更新触发器（updated_at 自动更新时间戳）
  // ============================================================
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_exam_records_updated_at
    AFTER UPDATE ON exam_records
    BEGIN
      UPDATE exam_records SET updated_at = datetime('now','localtime')
      WHERE exam_id = NEW.exam_id;
    END
  `)

  console.log('[DB] Database tables initialized successfully')
}
