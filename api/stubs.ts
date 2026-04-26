import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getWikiTree, getFile } from './_lib/github'

interface Stub {
  id: string
  inbound: number
  domains: string[]
  description: string
  score: number
}

const DOMAIN_MAP: Record<string, string[]> = {
  'cross-domain': ['knowledge-work', 'vault', 'apex', 'teaching'],
  'teaching': ['teaching'],
  'apex': ['apex'],
  'knowledge-work': ['knowledge-work'],
  'inspiration': ['inspiration'],
  'philosophy': ['knowledge-work'],
}

function parseStubs(content: string): Stub[] {
  const stubSection = content.match(/### Stub links[^\n]*\n([\s\S]+?)(?=\n---|\n## )/)?.[1] || ''
  const stubs: Stub[] = []
  let currentCategory = 'general'

  for (const line of stubSection.split('\n')) {
    // Category header e.g. **Cross-domain / _concepts/ candidates:**
    const catMatch = line.match(/^\*\*([^*]+)\*\*/)
    if (catMatch) {
      const cat = catMatch[1].toLowerCase()
      if (cat.includes('cross-domain')) currentCategory = 'cross-domain'
      else if (cat.includes('teaching')) currentCategory = 'teaching'
      else if (cat.includes('apex')) currentCategory = 'apex'
      else if (cat.includes('knowledge-work') || cat.includes('philosophy')) currentCategory = 'knowledge-work'
      else if (cat.includes('inspiration')) currentCategory = 'inspiration'
      else currentCategory = 'general'
      continue
    }

    // Stub line e.g. - `[[moc-as-argument]]` — 8 inbound (per INDEX); description
    const stubMatch = line.match(/^- `\[\[([^\]]+)\]\]`\s*[—-]+\s*(\d+)\s*(?:refs?|inbound)[^;]*;(.+)$/)
    if (stubMatch) {
      const id = stubMatch[1].trim()
      const inbound = parseInt(stubMatch[2], 10)
      const description = stubMatch[3].trim().replace(/;$/, '')
      const domains = DOMAIN_MAP[currentCategory] || ['general']
      const crossDomainBonus = currentCategory === 'cross-domain' ? 25 : 0
      const score = Math.min(100, inbound * 6 + crossDomainBonus + (domains.length > 1 ? 10 : 0))
      stubs.push({ id, inbound, domains, description, score })
    }
  }

  return stubs.sort((a, b) => b.score - a.score)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const tree = await getWikiTree()

    // Find lint files — they live at lint/lint-check/*.md (not under wiki/)
    // getWikiTree only returns wiki/ paths, so we need a separate fetch
    const GITHUB_API = 'https://api.github.com'
    const OWNER = process.env.GITHUB_OWNER!
    const REPO  = process.env.GITHUB_REPO!
    const BRANCH = process.env.GITHUB_BRANCH || 'master'
    const TOKEN  = process.env.GITHUB_TOKEN!

    const treeRes = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
      { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github.v3+json' } }
    )
    const treeData = await treeRes.json()
    const lintFiles = (treeData.tree as { path: string }[])
      .filter(f => f.path.startsWith('lint/lint-check/') && f.path.endsWith('-lint.md'))
      .map(f => f.path)
      .sort()
      .reverse()

    if (lintFiles.length === 0) return res.status(200).json({ stubs: [], lintDate: null })

    const latestLint = lintFiles[0]
    const lintDate = latestLint.match(/lint\/(\d{4}-\d{2}-\d{2})/)?.[1] || null

    const lintFile = await getFile(latestLint)
    const stubs = parseStubs(lintFile.content)

    res.status(200).json({ stubs, lintDate, source: latestLint })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
