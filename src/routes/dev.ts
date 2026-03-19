import { Hono } from 'hono'
import { Env } from '../types'

const dev = new Hono<{ Bindings: Env }>()

// データベースマイグレーション
dev.get('/migrate', async (c) => {
  await c.env.D1_DB.exec(`
    CREATE TABLE IF NOT EXISTS google_fit_tokens (
      user_id TEXT PRIMARY KEY, access_token TEXT, refresh_token TEXT, scope TEXT, token_type TEXT, expiry_ts INTEGER, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS exercise_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, activity_type TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
      duration_minutes REAL NOT NULL, calories_burned REAL, notes TEXT, created_at INTEGER NOT NULL
    );
  `)
  return c.text('Migration completed')
})

// 利用可能なモデルの一覧表示
dev.get('/list-models', async (c) => {
  if (!c.env.API_KEY) return c.text('API_KEY not set', 500)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${c.env.API_KEY}`)
    const data = await res.json()
    return c.json(data)
  } catch (error) {
    return c.text(`Error listing models: ${String(error)}`, 500)
  }
})

export default dev
