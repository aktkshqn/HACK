import { GoogleGenerativeAI } from '@google/generative-ai'

export const getGeminiModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })
}
