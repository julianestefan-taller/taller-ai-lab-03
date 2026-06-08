import { GoogleGenAI } from '@google/genai'

let genai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!genai) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
    genai = new GoogleGenAI({ apiKey })
  }
  return genai
}

export async function generateJson(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await getClient().models.generateContent({
    model: 'gemini-2.5-flash-lite',
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
    contents: userMessage,
  })

  const text = response.text
  if (!text) throw new Error('Empty response from Gemini')
  return text
}
