import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFile } from './_lib/github'

const GITHUB_API = 'https://api.github.com'
const OWNER  = process.env.GITHUB_OWNER!
const REPO   = process.env.GITHUB_REPO!
const BRANCH = process.env.GITHUB_BRANCH || 'master'
const TOKEN  = process.env.GITHUB_TOKEN!

const ghHeaders = () => ({
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

function parseFrontmatter(content: string) {
  const block = content.match(/^---\n([\s\S]+?)\n---/)?.[1] || ''
  const get = (key: string) => block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || ''
  return {
    title:   get('title'),
    project: get('project'),
    date:    get('date'),
    status:  get('status'),
    type:    get('type'),
  }
}

function sourceType(path: string): string {
  if (path.includes('/ideas/'))       return 'idea'
  if (path.includes('/inbox/'))       return 'inbox'
  if (path.includes('/session/'))     return 'session'
  if (path.includes('/notes/'))       return 'note'
  if (path.includes('/inspiration/')) return 'inspiration'
  return 'general'
}

function excerpt(content: string): string {
  const body = content.replace(/^---[\s\S]+?---\n/, '').trim()
  const first = body.split('\n').find(l => l.trim() && !l.startsWith('#')) || ''
  return first.slice(0, 120)
}

// ── Hooks derived from lint report ──────────────────────────────────────────

function deriveHooks(lint: string) {
  const hooks = []

  // graph:no-orphans
  const orphanSection = lint.match(/### Orphaned articles[^\n]*\n([\s\S]+?)(?=\n###)/)?.[1] || ''
  const genuineOrphans = orphanSection.match(/^- `[^`]+`/gm) || []
  hooks.push({
    name: 'graph:no-orphans',
    status: genuineOrphans.length === 0 ? 'pass' : 'fail',
    note: genuineOrphans.length === 0
      ? '0 genuine orphans'
      : `${genuineOrphans.length} orphan(s) detected`,
  })

  // graph:weak-nodes
  const weakSection = lint.match(/### Weak nodes[^\n]*\n([\s\S]+?)(?=\n###)/)?.[1] || ''
  const weakItems = weakSection.match(/^- `[^`]+`/gm) || []
  hooks.push({
    name: 'quality:spreading-activation≥3',
    status: weakItems.length === 0 ? 'pass' : 'warn',
    note: weakItems.length === 0
      ? 'all articles ≥3 outbound links'
      : weakItems.map(l => l.match(/`([^`]+)`/)?.[1] || '').filter(Boolean).join(', ') + ` (${weakItems.length} weak)`,
  })

  // struct:domain-routing
  const misrouteMatch = lint.match(/domain routing:\s*(\d+)\s*misroute/)
  const misroutes = misrouteMatch ? parseInt(misrouteMatch[1], 10) : 0
  hooks.push({
    name: 'struct:domain-routing',
    status: misroutes === 0 ? 'pass' : 'fail',
    note: misroutes === 0 ? 'all articles correctly routed' : `${misroutes} misroute(s) — see Mechanical Checks`,
  })

  // struct:formatting
  const fmtSection = lint.match(/### Structural formatting error[^\n]*\n([\s\S]+?)(?=\n###)/)?.[1] || ''
  const fmtItems = fmtSection.match(/^- `[^`]+`/gm) || []
  hooks.push({
    name: 'struct:formatting',
    status: fmtItems.length === 0 ? 'pass' : 'fail',
    note: fmtItems.length === 0
      ? 'no formatting errors'
      : fmtItems.map(l => l.match(/`([^`]+)`/)?.[1] || '').filter(Boolean).join(', '),
  })

  // quality:draft-articles
  const draftSection = lint.match(/### Draft articles\n([\s\S]+?)(?=\n###|\n---)/)?.[1] || ''
  const draftItems = draftSection.match(/^- `[^`]+`/gm) || []
  hooks.push({
    name: 'quality:draft-articles',
    status: draftItems.length === 0 ? 'pass' : 'warn',
    note: draftItems.length === 0
      ? 'no stalled drafts'
      : `${draftItems.length} draft(s) stalled — promote or retire`,
  })

  // topology:isolated-clusters
  const isolatedMatch = lint.match(/No isolated domain clusters detected/)
  hooks.push({
    name: 'topology:isolated-clusters',
    status: isolatedMatch ? 'pass' : 'warn',
    note: isolatedMatch ? 'all domains connected' : 'isolated cluster detected — see Topology Health',
  })

  return hooks
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    // Full tree (raw/ is gitignored locally but committed via API — shows in tree)
    const treeRes = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
      { headers: ghHeaders() }
    )
    const treeData = await treeRes.json()
    const allFiles: { path: string }[] = treeData.tree || []

    // Raw .md files, sorted newest-first by filename date
    const rawFiles = allFiles
      .filter(f => f.path.startsWith('raw/') && f.path.endsWith('.md'))
      .sort((a, b) => b.path.localeCompare(a.path))
      .slice(0, 24)

    // Latest lint file
    const lintFiles = allFiles
      .filter(f => f.path.startsWith('lint/') && f.path.endsWith('-lint.md'))
      .sort((a, b) => b.path.localeCompare(a.path))

    // Fetch raw files + lint in parallel
    const [fileResults, lintFile] = await Promise.all([
      Promise.allSettled(rawFiles.map(f => getFile(f.path))),
      lintFiles[0] ? getFile(lintFiles[0].path) : Promise.resolve(null),
    ])

    const files = fileResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => {
        const { path, content } = r.value
        const fm = parseFrontmatter(content)
        const compiled = fm.status === 'compiled'
        return {
          path,
          title:      fm.title || path.split('/').pop()!.replace('.md', ''),
          project:    fm.project,
          date:       fm.date,
          status:     compiled ? 'compiled' : 'pending',
          sourceType: sourceType(path),
          excerpt:    excerpt(content),
          lines:      content.split('\n').length,
        }
      })

    const hooks = lintFile ? deriveHooks(lintFile.content) : []
    const lintDate = lintFiles[0]?.path.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null

    const pending  = files.filter(f => f.status === 'pending').length
    const hookFail = hooks.filter(h => h.status === 'fail').length
    const hookWarn = hooks.filter(h => h.status === 'warn').length

    res.status(200).json({ files, hooks, lintDate, pending, hookFail, hookWarn })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
