import { Hono } from 'hono'
import { Env } from '../types'
import { getGeminiModel } from '../utils/gemini'

const gemini = new Hono<{ Bindings: Env }>()

// チャットボット呼び出し
gemini.post('/chat', async (c) => {
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
gemini.get('/test', async (c) => {
  if (!c.env.API_KEY) return c.text('API_KEY not set', 500)
  try {
    const model = getGeminiModel(c.env.API_KEY)
    const result = await model.generateContent("Gemini APIのテストです。一言挨拶してください。")
    return c.text(`Gemini Response: ${(await result.response).text()}`)
  } catch (error) {
    return c.text(`Error: ${String(error)}`, 500)
  }
})

export default gemini
