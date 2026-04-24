import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getWikiTree } from './_lib/github'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { slug } = req.query
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug required' })
  }

  try {
    const tree = await getWikiTree()
    const normalized = slug.toLowerCase().replace(/\s+/g, '-')

    // Exact filename match first, then partial
    const exact = tree.find(f => f.path.endsWith(`/${normalized}.md`))
    if (exact) return res.status(200).json({ path: exact.path })

    const partial = tree.find(f => f.path.includes(normalized))
    if (partial) return res.status(200).json({ path: partial.path })

    res.status(404).json({ error: `No article found for slug: ${slug}` })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
