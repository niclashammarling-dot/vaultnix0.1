import type { VercelRequest, VercelResponse } from '@vercel/node'
import { searchVault } from './_lib/github'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const q = req.query.q
  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.status(400).json({ error: 'q required (min 2 chars)' })
  }

  try {
    const results = await searchVault(q)
    res.status(200).json({ results })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
