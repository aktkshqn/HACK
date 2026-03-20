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

// データベースの内容を確認（全レコード取得）
dev.get('/all', async (c) => {
  const { results } = await c.env.D1_DB.prepare("SELECT * FROM exercise_records ORDER BY id DESC").all();
  return c.json({ records: results || [] });
});

// 特定のレコードを削除
dev.delete('/record/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.D1_DB.prepare("DELETE FROM exercise_records WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// 全運動データをリセット
dev.delete('/clear', async (c) => {
  await c.env.D1_DB.prepare("DELETE FROM exercise_records").run();
  return c.json({ success: true });
});

export default dev
