import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getWikiTree } from './_lib/github'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { domain } = req.query
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'domain required' })
  }

  try {
    const tree = await getWikiTree()

    // Match wiki/domains/{domain}/ and wiki/_mocs/{domain}-moc.md
    const domainFiles = tree.filter(f =>
      f.path.startsWith(`wiki/domains/${domain}/`) ||
      f.path === `wiki/_mocs/${domain}-moc.md`
    )

    const articles = domainFiles.map(f => {
      const name = f.path.split('/').pop()!.replace('.md', '')
      const slug = name
      const title = slug.split('-').map((w: string) => w[0]?.toUpperCase() + w.slice(1)).join(' ')
      return { path: f.path, slug, title }
    }).slice(0, 8) // cap at 8

    res.status(200).json({ articles })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
