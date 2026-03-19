import { Hono } from 'hono'
import { Env } from '../types'

const exercise = new Hono<{ Bindings: Env }>()

// 運動記録の取得
exercise.get('', async (c) => {
  const userId = c.req.query('user_id')
  if (!userId) return c.json({ error: 'user_id is required' }, 400)
  const { results } = await c.env.D1_DB.prepare('SELECT * FROM exercise_records WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all()
  return c.json({ records: results || [] })
})

// 運動記録の保存
exercise.post('', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const start = new Date(body.start_time), end = new Date(body.end_time)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return c.json({ error: 'invalid time' }, 400)

  const dur = (end.getTime() - start.getTime()) / 60000
  const sync = await c.env.D1_DB.prepare('INSERT INTO exercise_records (user_id, activity_type, start_time, end_time, duration_minutes, calories_burned, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(body.user_id, body.activity_type, start.toISOString(), end.toISOString(), dur, body.calories_burned || null, body.notes || null, Math.floor(Date.now() / 1000))
    .run()

  return c.json({ success: true, id: sync?.meta?.last_row_id })
})

export default exercise
