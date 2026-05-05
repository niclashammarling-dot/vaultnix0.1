import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getWikiTree, getFile } from './_lib/github'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const tree = await getWikiTree()
    const ideaFiles = tree.filter(f =>
      f.path.startsWith('wiki/domains/general/ideas/') && f.path.endsWith('.md')
    )

    const fileResults = await Promise.allSettled(ideaFiles.map(f => getFile(f.path)))

    const ideas = fileResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => {
        const { path, content } = r.value
        const slug = path.split('/').pop()!.replace('.md', '')
        const title = content.match(/^title:\s*(.+)$/m)?.[1]?.trim() || slug
        const date  = content.match(/^date:\s*(.+)$/m)?.[1]?.trim() || ''
        const status = content.match(/^status:\s*(.+)$/m)?.[1]?.trim() || 'active'
        const tagsRaw = content.match(/^tags:\s*\[(.+)\]$/m)?.[1] || ''
        const tags = tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
        const summaryBlock = content.match(/## Summary\n\n([\s\S]+?)(?=\n## )/)?.[1]?.trim() || ''
        const summary = summaryBlock.length > 220 ? summaryBlock.slice(0, 220) + '…' : summaryBlock
        const openQs = (content.match(/^- .+$/gm) || [])
          .filter((_: string, i: number) => {
            const oqIdx = content.indexOf('## Open Questions')
            const lineIdx = content.indexOf(_)
            return oqIdx > -1 && lineIdx > oqIdx
          })
          .slice(0, 3)
        return { path, slug, title, date, status, tags, summary, openQs }
      })
      .filter(idea => idea.status !== 'retired')
      .sort((a, b) => b.date.localeCompare(a.date))

    res.status(200).json({ ideas })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
