import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEFAULT_CHARACTER_INSTRUCTIONS = {
  Neo: 'You are Neo. Be emotionally aware, warm, and thoughtful. Keep responses natural and conversational.',
  Echo: 'You are Echo. Be direct, sharp, and concise while staying respectful and emotionally intelligent.',
  Nova: 'You are Nova. Be curious, energetic, and playful with futuristic/cyberpunk flavor.',
}

function normalizeCharacterName(name) {
  const normalized = typeof name === 'string' ? name.trim().toLowerCase() : ''
  if (normalized === 'neon') return 'Neo'
  if (normalized === 'neo') return 'Neo'
  if (normalized === 'echo') return 'Echo'
  if (normalized === 'nova') return 'Nova'
  return 'Neo'
}

function readPersonaFile() {
  const candidates = [
    resolve(process.cwd(), 'persona.txt'),
    resolve(__dirname, '../../persona.txt'),
  ]

  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      return readFileSync(path, 'utf8')
    } catch {
      return ''
    }
  }

  return ''
}

function parsePersonaSections(rawText) {
  if (!rawText || typeof rawText !== 'string') return {}

  const sections = {}
  const regex = /(?:^|\n)\s*(?:\[)?(Neo|Echo|Nova)(?:\])?\s*:\s*([\s\S]*?)(?=\n\s*(?:\[)?(?:Neo|Echo|Nova)(?:\])?\s*:|\s*$)/gi

  let match = regex.exec(rawText)
  while (match) {
    const key = match[1]
    const value = match[2]?.trim()
    if (value) sections[key] = value
    match = regex.exec(rawText)
  }

  return sections
}

const PERSONA_TEXT = readPersonaFile()
const PERSONA_SECTIONS = parsePersonaSections(PERSONA_TEXT)

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(payload),
  }
}

function toGeminiRole(role) {
  return role === 'assistant' ? 'model' : 'user'
}

function getPersonaInstruction(persona) {
  const personaMap = {
    spicy: 'Use a bold, teasing, high-energy tone with sharp lines but do not be rude.',
    cool: 'Use a calm, confident, smooth tone. Keep it chill and clear.',
    funny: 'Use a playful, witty tone with light humor.',
    nonchalant: 'Use a detached, minimal, nonchalant tone with short responses.',
  }
  return personaMap[persona] || personaMap.cool
}

function getCharacterInstruction(character) {
  const normalizedCharacter = normalizeCharacterName(character)
  return PERSONA_SECTIONS[normalizedCharacter] || DEFAULT_CHARACTER_INSTRUCTIONS[normalizedCharacter]
}

function buildGeminiContents(history, message, character, persona) {
  const safeHistory = Array.isArray(history) ? history : []
  const content = []
  const normalizedCharacter = normalizeCharacterName(character)
  const characterInstruction = getCharacterInstruction(normalizedCharacter)

  content.push({
    role: 'user',
    parts: [
      {
        text: `SYSTEM INSTRUCTION: You are ${normalizedCharacter}, a character in a cyberpunk chat app. Follow this character definition exactly: ${characterInstruction} Tone modifier: ${getPersonaInstruction(persona)} Stay in character, be conversational, and keep answers concise unless asked for detail.`,
      },
    ],
  })

  for (const item of safeHistory) {
    if (!item || typeof item.text !== 'string') continue
    content.push({
      role: toGeminiRole(item.role),
      parts: [{ text: item.text }],
    })
  }

  content.push({
    role: 'user',
    parts: [{ text: message }],
  })

  return content
}

async function chatWithGemini({ message, history, character, persona }) {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY. Add it in Netlify environment variables.')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`

  const payload = {
    contents: buildGeminiContents(history, message, character, persona, nsfw),
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
    },
  }

  // Retry helper to handle transient 503 / 429 responses
  async function fetchWithRetry(url, options, retries = 4, backoff = 500) {
    let attempt = 0
    while (true) {
      attempt++
      const resp = await fetch(url, options)
      if (resp.ok) return resp
      if ((resp.status === 503 || resp.status === 429) && attempt <= retries) {
        const wait = backoff * Math.pow(2, attempt - 1)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      return resp
    }
  }

  // Route NSFW requests to an explicit endpoint if configured
  const explicitUrl = process.env.EXPLICIT_API_URL
  const explicitKey = process.env.EXPLICIT_API_KEY
  if (nsfw && explicitUrl) {
    const explicitResp = await fetchWithRetry(explicitUrl, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, explicitKey ? { Authorization: `Bearer ${explicitKey}` } : {}),
      body: JSON.stringify({ message, history, character, persona, nsfw }),
    })
    const explicitData = await explicitResp.json().catch(() => null)
    if (explicitResp.ok) {
      const explicitReply = explicitData?.reply || explicitData?.result || explicitData?.output || explicitData?.text
      if (explicitReply && typeof explicitReply === 'string') {
        return jsonResponse(200, { reply: explicitReply.trim() })
      }
      if (explicitReply && typeof explicitReply === 'object') {
        return jsonResponse(200, { reply: JSON.stringify(explicitReply) })
      }
      // otherwise fall through to Gemini
    }
    // if explicit endpoint failed, try Gemini below
  }

  const finalResponse = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await finalResponse.json()
  if (!finalResponse.ok) {
    const apiMessage = data?.error?.message || `Gemini API request failed with status ${finalResponse.status}.`
    throw new Error(apiMessage)
  }

  const parts = data?.candidates?.[0]?.content?.parts
  const reply = Array.isArray(parts) ? parts.map((part) => part?.text || '').join('').trim() : ''
  if (!reply) {
    throw new Error('Gemini returned an empty response.')
  }

  return reply
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {})
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const history = Array.isArray(body.history) ? body.history : []
    const character = normalizeCharacterName(body.character)
    const persona = typeof body.persona === 'string' ? body.persona.toLowerCase() : 'cool'
    const nsfw = Boolean(body.nsfw)

    if (!message) {
      return jsonResponse(400, { error: 'Message is required.' })
    }

    const reply = await chatWithGemini({ message, history, character, persona, nsfw })
    return jsonResponse(200, { reply })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error.'
    return jsonResponse(500, { error: errorMessage })
  }
}
