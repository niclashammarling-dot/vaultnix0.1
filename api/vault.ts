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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'POST') {
    const action = req.query.action as string
    if (action !== 'trigger-compile') return res.status(400).json({ error: 'unknown action' })
    try {
      await triggerCompile('light')
      res.status(200).json({ ok: true, depth: 'light' })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
    return
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
