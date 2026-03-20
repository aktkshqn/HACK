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
      あなたは「Gohan-Fit」のAIコンシェルジュです。
      運動後のユーザーに、その努力（消費カロリー）に見合った最高の「ご褒美レストランや具体的なメニュー」を最大3つ提案してください。
      
      返答は以下の JSON 構造に厳密に従ってください：
      {
        "message": "ユーザーの努力を熱く、具体的に賞賛するメッセージ（50文字程度）",
        "items": [
          {
            "name": "店名 または 具体的なご褒美メニュー名",
            "info": "なぜ今日の運動量に対して、この美味しい食事が最高のご褒美なのかの評価コメント（美味しさと健康のバランスから）",
            "link": "https://www.google.com/search?q=近くの店名+メニュー名"
          }
        ]
      }
      必ず有効な JSON のみを返してください。
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
