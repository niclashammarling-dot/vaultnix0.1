import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFile } from './_lib/github'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { path } = req.query
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'path required' })
  }

  try {
    const file = await getFile(path)
    res.status(200).json({ name: file.name, content: file.content, path: file.path })
  } catch (e) {
    res.status(404).json({ error: String(e) })
  }
}
