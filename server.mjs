import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  const raw = readFileSync(envPath, 'utf8')
  const lines = raw.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvFile()

const PORT = Number(process.env.PORT || 3001)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(payload))
}

function collectBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        rejectBody(new Error('Request body is too large.'))
      }
    })
    req.on('end', () => resolveBody(body))
    req.on('error', rejectBody)
  })
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

function buildGeminiContents(history, message, character, persona) {
  const safeHistory = Array.isArray(history) ? history : []
  const content = []

  content.push({
    role: 'user',
    parts: [
      {
        text: `You are roleplaying as ${character || 'Neon'} in a cyberpunk chat app. ${getPersonaInstruction(persona)} Keep responses conversational and concise unless asked for detail.`,
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
    throw new Error('Missing GEMINI_API_KEY. Add it to your .env file.')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`

  const payload = {
    contents: buildGeminiContents(history, message, character, persona),
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 512,
    },
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    const apiMessage = data?.error?.message || 'Gemini API request failed.'
    throw new Error(apiMessage)
  }

  const parts = data?.candidates?.[0]?.content?.parts
  const reply = Array.isArray(parts)
    ? parts.map((part) => part?.text || '').join('').trim()
    : ''

  if (!reply) {
    throw new Error('Gemini returned an empty response.')
  }

  return reply
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {})
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const rawBody = await collectBody(req)
      const body = JSON.parse(rawBody || '{}')
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      const history = Array.isArray(body.history) ? body.history : []
      const character = typeof body.character === 'string' ? body.character : 'Neon'
      const persona = typeof body.persona === 'string' ? body.persona.toLowerCase() : 'cool'

      if (!message) {
        return sendJson(res, 400, { error: 'Message is required.' })
      }

      const reply = await chatWithGemini({ message, history, character, persona })
      return sendJson(res, 200, { reply })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown server error.'
      return sendJson(res, 500, { error: errorMessage })
    }
  }

  return sendJson(res, 404, { error: 'Not found.' })
})

server.listen(PORT, () => {
  console.log(`Gemini chat server listening on http://localhost:${PORT}`)
})
