import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFile, updateFile, deleteFile } from './_lib/github'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, path, slug, title } = req.body
  if (!action || !slug) return res.status(400).json({ error: 'action and slug required' })

  try {
    if (action === 'flag') {
      // Add to INDEX.md ## Pending Review
      const indexFile = await getFile('wiki/_index/INDEX.md')
      const date = new Date().toISOString().slice(0, 10)
      const entry = `- [[${slug}]] — ${title || slug} · flagged for review ${date}\n`

      let content = indexFile.content
      if (content.includes('## Pending Review\n')) {
        content = content.replace('## Pending Review\n', `## Pending Review\n${entry}`)
      } else {
        // Insert section before first ## after frontmatter/header
        content = content.replace(/^(# .+\n)/, `$1\n## Pending Review\n${entry}\n`)
      }

      await updateFile('wiki/_index/INDEX.md', content, indexFile.sha, `review: flag [[${slug}]] for pending review`)
      res.status(200).json({ ok: true, action: 'flagged' })

    } else if (action === 'delete') {
      if (!path) return res.status(400).json({ error: 'path required for delete' })
      const file = await getFile(path)
      await deleteFile(path, file.sha, `review: reject + delete [[${slug}]] — queued for recompile`)
      res.status(200).json({ ok: true, action: 'deleted' })

    } else {
      res.status(400).json({ error: `unknown action: ${action}` })
    }
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
