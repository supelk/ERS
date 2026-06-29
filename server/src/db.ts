import pg from 'pg'
import bcrypt from 'bcryptjs'
import { env } from './env.js'

export const pool = new pg.Pool({ connectionString: env.databaseUrl })

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}

export async function one<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const value = await fn(client)
    await client.query('COMMIT')
    return value
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
      disabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS exam_records (
      exam_id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exam_name TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      exam_type_1 TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      total_score REAL NOT NULL DEFAULT 0,
      full_score REAL NOT NULL DEFAULT 100,
      current_target_score REAL,
      next_target_score REAL,
      total_time REAL,
      question_order TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS exam_section_records (
      section_id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exam_id BIGINT NOT NULL REFERENCES exam_records(exam_id) ON DELETE CASCADE,
      section_name TEXT NOT NULL,
      parent_section_name TEXT,
      total_questions INTEGER NOT NULL DEFAULT 0,
      correct_questions INTEGER NOT NULL DEFAULT 0,
      per_question_score REAL NOT NULL DEFAULT 1,
      used_time REAL DEFAULT 0,
      unattempted_questions INTEGER DEFAULT 0,
      accuracy REAL GENERATED ALWAYS AS (
        CASE WHEN total_questions > 0 THEN correct_questions::REAL / total_questions * 100 ELSE 0 END
      ) STORED,
      score_efficiency REAL GENERATED ALWAYS AS (
        CASE WHEN used_time > 0 THEN correct_questions::REAL * per_question_score / used_time ELSE 0 END
      ) STORED,
      analysis TEXT,
      plan TEXT,
      next_target_accuracy REAL,
      next_target_time REAL,
      next_target_efficiency REAL
    );

    CREATE TABLE IF NOT EXISTS review_question_records (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exam_id BIGINT NOT NULL REFERENCES exam_records(exam_id) ON DELETE CASCADE,
      question_type TEXT NOT NULL CHECK (question_type IN ('wrong','speed','fast')),
      section_name TEXT NOT NULL,
      question_number TEXT NOT NULL DEFAULT '',
      time_spent REAL,
      knowledge_point TEXT NOT NULL DEFAULT '',
      analysis TEXT NOT NULL DEFAULT '',
      improvement_plan TEXT NOT NULL DEFAULT '',
      solving_insight TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS practice_tasks (
      task_id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS practice_records (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      section_name TEXT NOT NULL,
      practice_date TEXT NOT NULL,
      total_questions INTEGER NOT NULL DEFAULT 0,
      correct_questions INTEGER NOT NULL DEFAULT 0,
      accuracy REAL GENERATED ALWAYS AS (
        CASE WHEN total_questions > 0 THEN correct_questions::REAL / total_questions * 100 ELSE 0 END
      ) STORED,
      used_time REAL NOT NULL DEFAULT 0,
      avg_time_per_question REAL GENERATED ALWAYS AS (
        CASE WHEN total_questions > 0 AND used_time > 0 THEN used_time / total_questions::REAL ELSE 0 END
      ) STORED,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS idiom_records (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      definition TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  const existingAdmin = await one('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin'])
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(env.adminPassword, 10)
    await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
      [env.adminUsername, passwordHash, 'admin'],
    )
  }
}
