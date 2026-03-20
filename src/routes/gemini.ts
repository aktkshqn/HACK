import { Hono } from 'hono'
import { Env } from '../types'
import { getGeminiModel } from '../utils/gemini'

const gemini = new Hono<{ Bindings: Env }>()

// チャットボット・応援・賞賛・ご褒美提案エンドポイント (JSON形式)
gemini.post('/chat', async (c) => {
  if (!c.env.API_KEY) return c.json({ error: 'API_KEY is not set' }, 500)
  const { message } = await c.req.json().catch(() => ({}))
  if (!message) return c.json({ error: 'message is required' }, 400)

  try {
    const model = getGeminiModel(c.env.API_KEY)
    
    // 構造化データのためのシステム命令
    const systemPrompt = `
      あなたは運動を全力でサポートするAIトレーナーです。
      以下の JSON 構造で返答してください：
      {
        "message": "ユーザーへの力強い賞賛や励まし（1行）",
        "items": [
          {
            "name": "おすすめの商品名",
            "info": "短いカロリー情報や理由",
            "link": "https://www.google.com/search?q=コンビニ+近く+商品名"
          }
        ]
      }
      商品は最大3つ提案してください。
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nユーザー状況: " + message }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    })

    const responseText = (await result.response).text()
    const jsonData = JSON.parse(responseText)

    return c.json(jsonData)
  } catch (error) {
    console.error("Gemini Error:", error)
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
