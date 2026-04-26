import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFile, updateFile } from './_lib/github'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { path } = req.body
  if (!path) return res.status(400).json({ error: 'path required' })

  try {
    const file = await getFile(path)

    if (file.content.includes('status: retired')) {
      return res.status(200).json({ ok: true, alreadyRetired: true })
    }

    let content: string
    if (/^status:/m.test(file.content)) {
      content = file.content.replace(/^status:.+$/m, 'status: retired')
    } else {
      content = file.content.replace(/^(date:.+)$/m, '$1\nstatus: retired')
    }

    await updateFile(path, content, file.sha,
      `ideas: retire ${path.split('/').pop()?.replace('.md', '')}`)

    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
