import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getIndex } from './_lib/github'

function parsePendingReview(index: string): string[] {
  const match = index.match(/## Pending Review[\s\S]*?(?=\n## |\n---|\Z)/m)
  if (!match) return []
  const section = match[0]
  const items = section.match(/^[-*]\s+\[\[([^\]]+)\]\]/gm) || []
  return items.map(i => i.replace(/^[-*]\s+\[\[/, '').replace(/\]\].*/, '').trim())
}

function parseSuggestedNext(index: string): string[] {
  // Grab the three most-recent wikilinks from Recent Additions
  const match = index.match(/## Recent Additions[\s\S]*?(?=\n## |\Z)/m)
  if (!match) return []
  const links = [...match[0].matchAll(/\[\[([^\]|]+)\]\]/g)]
    .map(m => m[1].trim())
    .filter(s => !s.startsWith('_'))
    .slice(0, 3)
  return links
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
