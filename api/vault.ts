import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getIndex } from './_lib/github'

const VAULT_OWNER = process.env.GITHUB_OWNER!
const VAULT_REPO  = process.env.GITHUB_REPO!
const COMPILE_TOKEN = process.env.VAULTNIX_COMPILE_TOKEN!

function parsePendingReview(index: string): string[] {
  const match = index.match(/## Pending Review[\s\S]*?(?=\n## |\n---|\Z)/m)
  if (!match) return []
  const section = match[0]
  const items = section.match(/^[-*]\s+\[\[([^\]]+)\]\]/gm) || []
  return items.map(i => i.replace(/^[-*]\s+\[\[/, '').replace(/\]\].*/, '').trim())
}

function parseSuggestedNext(index: string): string[] {
  const match = index.match(/## Recent Additions[\s\S]*?(?=\n## |\Z)/m)
  if (!match) return []
  const links = [...match[0].matchAll(/\[\[([^\]|]+)\]\]/g)]
    .map(m => m[1].trim())
    .filter(s => !s.startsWith('_'))
    .slice(0, 3)
  return links
}

async function triggerCompile(depth: 'light' | 'full'): Promise<void> {
  const url = `https://api.github.com/repos/${VAULT_OWNER}/${VAULT_REPO}/actions/workflows/compile.yml/dispatches`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COMPILE_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'master', inputs: { depth } }),
  })
  if (!res.ok) {
    const err = await res.json() as { message: string }
    throw new Error(`Workflow dispatch failed: ${err.message}`)
  }
}

async function handleTranscribe(req: VercelRequest, res: VercelResponse): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'OPENAI_API_KEY not configured' }); return }

  const { audio, mimeType, filename } = req.body as { audio: string; mimeType: string; filename: string }
  if (!audio || !mimeType || !filename) {
    res.status(400).json({ error: 'Missing audio, mimeType, or filename' }); return
  }

  const audioBuffer = Buffer.from(audio, 'base64')
  const boundary = `----VaultBoundary${Date.now()}`
  const CRLF = '\r\n'
  const body = Buffer.concat([
    Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}Content-Type: ${mimeType}${CRLF}${CRLF}`),
    audioBuffer,
    Buffer.from(`${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="model"${CRLF}${CRLF}whisper-1${CRLF}--${boundary}--${CRLF}`),
  ])

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })

  if (!whisperRes.ok) {
    console.error('Whisper error:', await whisperRes.text())
    res.status(502).json({ error: 'Transcription failed' }); return
  }

  const data = await whisperRes.json() as { text: string }
  res.status(200).json({ text: data.text })
}

const OCR_PROMPT = 'Extract all text from this image exactly as written. If the image contains no text, describe what you see in one sentence. Return only the extracted content, no preamble.'

async function ocrViaOllama(image: string, model: string): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: OCR_PROMPT, images: [image], stream: false }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json() as { response: string }
  return data.response
}

async function ocrViaOpenAI(image: string, mimeType: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}`, detail: 'high' } },
        ],
      }],
      max_tokens: 2000,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0].message.content
}

async function handleOcr(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { image, mimeType } = req.body as { image: string; mimeType: string }
  if (!image || !mimeType) { res.status(400).json({ error: 'Missing image or mimeType' }); return }

  const ollamaModel = process.env.OLLAMA_OCR_MODEL
  try {
    const text = ollamaModel
      ? await ocrViaOllama(image, ollamaModel)
      : await ocrViaOpenAI(image, mimeType, process.env.OPENAI_API_KEY ?? '')
    res.status(200).json({ text })
  } catch (e) {
    console.error('OCR error:', e)
    res.status(502).json({ error: 'Image extraction failed' })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'POST') {
    const action = req.query.action as string
    if (action === 'trigger-compile') {
      try {
        await triggerCompile('light')
        res.status(200).json({ ok: true, depth: 'light' })
      } catch (e) {
        res.status(500).json({ error: String(e) })
      }
      return
    }
    if (action === 'transcribe') {
      try { await handleTranscribe(req, res) } catch (e) { res.status(500).json({ error: String(e) }) }
      return
    }
    if (action === 'ocr') {
      try { await handleOcr(req, res) } catch (e) { res.status(500).json({ error: String(e) }) }
      return
    }
    return res.status(400).json({ error: 'unknown action' })
  }

  if (req.method !== 'GET') return res.status(405).end()

  try {
    const index = await getIndex()
    const pendingItems = parsePendingReview(index)
    const suggestedNext = parseSuggestedNext(index)

    res.status(200).json({
      pendingReview: pendingItems.length,
      pendingItems,
      suggestedNext,
    })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
