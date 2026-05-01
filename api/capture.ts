import type { VercelRequest, VercelResponse } from '@vercel/node'
import { commitRawNote } from './_lib/github'

const IDEA_PREFIX = /^idea[.:]\s*/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { content, domain } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

  const isIdea = IDEA_PREFIX.test(content.trim())
  const body = isIdea ? content.trim().replace(IDEA_PREFIX, '') : content

  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const time = now.toISOString().split('T')[1].slice(0, 8).replace(/:/g, '')

  let fileDomain: string
  let filename: string
  let markdown: string

  if (isIdea) {
    fileDomain = 'inbox/ideas'
    filename = `${date}-${time}-idea.md`
    const title = body.split('\n')[0].slice(0, 80)
    markdown = `---\ntitle: ${title}\ntype: idea\nproject: general/ideas\ndate: ${date}\nstatus: captured\n---\n\n${body}\n`
  } else {
    const project = domain || 'general'
    const month = date.slice(0, 7)
    fileDomain = `inbox/${month}`
    filename = `${date}-${time}-capture.md`
    markdown = `---\ntitle: Quick capture ${date}\ntype: capture\nproject: ${project}\ndate: ${date}\ntags: [${project}/capture]\nstatus: draft\n---\n\n## What We Worked On\n${body}\n\n## Decisions Made\n\n\n## Open Threads\n\n`
  }

  try {
    await commitRawNote(filename, markdown, fileDomain)
    res.status(200).json({ success: true, filename, isIdea, domain: fileDomain })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
