import { Hono } from 'hono'
import { Env } from '../types'

const googleFit = new Hono<{ Bindings: Env }>()

// OAuth 認証URLの取得
googleFit.get('/auth-url', (c) => {
  const scope = encodeURIComponent('https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.activity.write')
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(c.env.GOOGLE_FIT_CLIENT_ID)}&redirect_uri=${encodeURIComponent(c.env.GOOGLE_FIT_REDIRECT_URI)}&scope=${scope}&access_type=offline&prompt=consent`
  return c.json({ authorizationUrl: url })
})

// OAuth トークンの取得と保存
googleFit.post('/token', async (c) => {
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

// ログアウト処理: データベースからトークンを削除
googleFit.post('/logout', async (c) => {
  const { user_id } = await c.req.json().catch(() => ({}))
  if (!user_id) return c.json({ error: 'user_id is required' }, 400)
  
  await c.env.D1_DB.prepare('DELETE FROM google_fit_tokens WHERE user_id = ?')
    .bind(user_id).run()
    
  return c.json({ success: true, message: 'Logged out successfully' })
})

// 保存されたトークンを使って Google Fit からカロリーデータを取得する
googleFit.get('/calories', async (c) => {
  const userId = c.req.query('user_id') || 'test_user'
  const startTimeMillis = Number(c.req.query('startTimeMillis'))
  const endTimeMillis = Number(c.req.query('endTimeMillis'))

  if (!startTimeMillis || !endTimeMillis) return c.json({ error: 'startTimeMillis and endTimeMillis are required' }, 400)

  // 1. データベースからトークンを取得
  const token = await c.env.D1_DB.prepare('SELECT access_token FROM google_fit_tokens WHERE user_id = ?')
    .bind(userId).first() as { access_token: string } | null
  
  if (!token) return c.json({ error: 'OAuth required', detail: 'no_token_found' }, 401)

  // 2. Google Fit API (Aggregate) を実行
  const requestBody = {
    aggregateBy: [{ dataTypeName: "com.google.calories.expended" }],
    bucketByTime: { durationMillis: (endTimeMillis - startTimeMillis) },
    startTimeMillis: startTimeMillis,
    endTimeMillis: endTimeMillis
  }

  try {
    const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      if (res.status === 401) return c.json({ error: 'Token expired, please login again' }, 401)
      throw new Error(`Google Fit API error: ${await res.text()}`)
    }

    const data = await res.json() as any
    const point = data?.bucket?.[0]?.dataset?.[0]?.point?.[0]
    const calories = point?.value?.[0]?.fpVal || 0

    return c.json({ calories })
  } catch (error) {
    return c.json({ error: 'Failed to fetch from Google Fit', detail: String(error) }, 500)
  }
})

export default googleFit
