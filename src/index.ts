import { Hono } from 'hono'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { serveStatic } from 'hono/cloudflare-workers'
// @ts-ignore
import manifest from '__STATIC_CONTENT_MANIFEST'

type Env = {
  D1_DB: D1Database
  GOOGLE_FIT_CLIENT_ID: string
  GOOGLE_FIT_CLIENT_SECRET: string
  GOOGLE_FIT_REDIRECT_URI: string
  API_KEY: string
  __STATIC_CONTENT: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

// --- 共通ヘルパー: Gemini モデルの取得 ---
const getGeminiModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })
}

// --- データベース初期化 ---
app.get('/api/migrate', async (c) => {
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

// デバッグ用: 利用可能なモデルを一覧表示する
app.get('/api/list-models', async (c) => {
  if (!c.env.API_KEY) return c.text('API_KEY not set', 500)
  try {
    // REST API を直接叩いてモデル一覧を取得
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${c.env.API_KEY}`)
    const data = await res.json()
    return c.json(data)
  } catch (error) {
    return c.text(`Error listing models: ${String(error)}`, 500)
  }
})

// --- Google Fit OAuth 連携 ---
app.get('/api/google-fit/auth-url', (c) => {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.activity.write')
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(c.env.GOOGLE_FIT_CLIENT_ID)}&redirect_uri=${encodeURIComponent(c.env.GOOGLE_FIT_REDIRECT_URI)}&scope=${scope}&access_type=offline&prompt=consent`
  return c.json({ authorizationUrl: url })
})

app.post('/api/google-fit/token', async (c) => {
  const { user_id, code } = await c.req.json().catch(() => ({}))
  if (!user_id || !code) return c.json({ error: 'user_id and code are required' }, 400)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: c.env.GOOGLE_FIT_CLIENT_ID, client_secret: c.env.GOOGLE_FIT_CLIENT_SECRET,
      redirect_uri: c.env.GOOGLE_FIT_REDIRECT_URI, grant_type: 'authorization_code'
    })
  })

  if (!res.ok) return c.json({ error: 'Token exchange failed', detail: await res.text() }, 502)

  const data = await res.json() as any
  const expiresAt = data.expires_in ? Math.floor(Date.now() / 1000) + Number(data.expires_in) : null

  await c.env.D1_DB.prepare(`INSERT OR REPLACE INTO google_fit_tokens VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(user_id, data.access_token, data.refresh_token ?? '', data.scope ?? '', data.token_type ?? '', expiresAt, Math.floor(Date.now() / 1000))
    .run()

  return c.json({ success: true, token: data })
})

// --- 運動記録 API ---
app.get('/api/exercise-records', async (c) => {
  const userId = c.req.query('user_id')
  if (!userId) return c.json({ error: 'user_id is required' }, 400)
  const { results } = await c.env.D1_DB.prepare('SELECT * FROM exercise_records WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all()
  return c.json({ records: results || [] })
})

app.post('/api/exercise-records', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const start = new Date(body.start_time), end = new Date(body.end_time)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return c.json({ error: 'invalid time' }, 400)

  const dur = (end.getTime() - start.getTime()) / 60000
  const sync = await c.env.D1_DB.prepare('INSERT INTO exercise_records (user_id, activity_type, start_time, end_time, duration_minutes, calories_burned, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(body.user_id, body.activity_type, start.toISOString(), end.toISOString(), dur, body.calories_burned || null, body.notes || null, Math.floor(Date.now() / 1000))
    .run()

  return c.json({ success: true, id: sync?.meta?.last_row_id })
})

// --- Gemini API 連携 ---
app.post('/api/gemini/chat', async (c) => {
  if (!c.env.API_KEY) return c.json({ error: 'API_KEY is not set' }, 500)
  const { message } = await c.req.json().catch(() => ({}))
  if (!message) return c.json({ error: 'message is required' }, 400)

  try {
    const model = getGeminiModel(c.env.API_KEY)
    const result = await model.generateContent(message)
    return c.json({ response: (await result.response).text() })
  } catch (error) {
    return c.json({ error: 'Gemini API Error', details: String(error) }, 500)
  }
})

// テスト用エンドポイント
app.get('/api/ai', async (c) => {
  if (!c.env.API_KEY) return c.text('API_KEY not set', 500)
  try {
    const model = getGeminiModel(c.env.API_KEY)
    const result = await model.generateContent("Gemini APIのテストです。一言挨拶してください。")
    return c.text(`Gemini Response: ${(await result.response).text()}`)
  } catch (error) {
    return c.text(`Error: ${String(error)}`, 500)
  }
})

// --- 静的ファイルとルーティング ---
app.use('/*', serveStatic({ root: './', manifest }))
app.get('/', (c) => c.redirect('/startmenu.html'))

export default app
