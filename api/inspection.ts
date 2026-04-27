import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFile } from './_lib/github'
import type { GitHubTreeResponse } from './_lib/github'

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

// ── Parsers ──────────────────────────────────────────────────────────────────

function parsePendingReview(index: string) {
  const section = index.match(/## Pending Review\n([\s\S]+?)(?=\n## )/)?.[1] || ''
  return section.match(/^- .+$/gm)?.map(line => {
    const slug  = line.match(/\[\[([^\]]+)\]\]/)?.[1] || ''
    const desc  = line.replace(/^- \[\[[^\]]+\]\]\s*[—-]*\s*/, '').trim()
    return { slug, description: desc }
  }).filter(i => i.slug) || []
}

function parseRecentCompile(index: string, tree: { path: string }[]) {
  // Take the most recent block under ## Recent Additions
  const section = index.match(/## Recent Additions\n\n([\s\S]+?)(?=\n## |\Z)/)?.[1] || ''
  const firstBlock = section.match(/\*([\s\S]+?)\n([\s\S]+?)(?=\n\*|\Z)/)?.[0] || section
  const dateCtx = firstBlock.match(/\*([^*]+)\*/)?.[1]?.trim() || ''

  return (firstBlock.match(/^- \[\[([^\]]+)\]\](.*)$/gm) || []).map(line => {
    const slug = line.match(/\[\[([^\]]+)\]\]/)?.[1] || ''
    const desc = line.replace(/^- \[\[[^\]]+\]\]\s*[—-]*\s*/, '').trim()
    const match = tree.find(f => f.path.endsWith(`/${slug}.md`) || f.path.endsWith(`/${slug}.md`))
    return { slug, description: desc, path: match?.path || '', context: dateCtx }
  }).filter(i => i.slug)
}

function parseFrontmatter(content: string) {
  const block = content.match(/^---\n([\s\S]+?)\n---/)?.[1] || ''
  const get = (k: string) => block.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim() || ''
  return { title: get('title'), project: get('project'), date: get('date'), status: get('status') }
}

function sourceType(path: string) {
  if (path.includes('/ideas/'))   return 'idea'
  if (path.includes('/inbox/'))   return 'inbox'
  if (path.includes('/session/')) return 'session'
  if (path.includes('/notes/'))   return 'note'
  return 'general'
}

function deriveHooks(lint: string) {
  const hooks = []

  const orphanSection = lint.match(/### Orphaned articles[^\n]*\n([\s\S]+?)(?=\n###)/)?.[1] || ''
  const orphans = orphanSection.match(/^- `[^`]+`/gm) || []
  hooks.push({ name: 'graph:no-orphans', status: orphans.length === 0 ? 'pass' : 'fail',
    note: orphans.length === 0 ? '0 genuine orphans' : `${orphans.length} orphan(s) detected` })

  const weakSection = lint.match(/### Weak nodes[^\n]*\n([\s\S]+?)(?=\n###)/)?.[1] || ''
  const weak = weakSection.match(/^- `[^`]+`/gm) || []
  hooks.push({ name: 'quality:spreading-activation≥3', status: weak.length === 0 ? 'pass' : 'warn',
    note: weak.length === 0 ? 'all articles ≥3 outbound links'
      : weak.map(l => l.match(/`([^`]+)`/)?.[1] || '').filter(Boolean).join(', ') + ` (${weak.length} weak)` })

  const misrouteMatch = lint.match(/domain routing:\s*(\d+)\s*misroute/)
  const misroutes = misrouteMatch ? parseInt(misrouteMatch[1], 10) : 0
  hooks.push({ name: 'struct:domain-routing', status: misroutes === 0 ? 'pass' : 'fail',
    note: misroutes === 0 ? 'all articles correctly routed' : `${misroutes} misroute(s) — see Mechanical Checks` })

  const fmtSection = lint.match(/### Structural formatting error[^\n]*\n([\s\S]+?)(?=\n###)/)?.[1] || ''
  const fmt = fmtSection.match(/^- `[^`]+`/gm) || []
  hooks.push({ name: 'struct:formatting', status: fmt.length === 0 ? 'pass' : 'fail',
    note: fmt.length === 0 ? 'no formatting errors'
      : fmt.map(l => l.match(/`([^`]+)`/)?.[1] || '').filter(Boolean).join(', ') })

  const draftSection = lint.match(/### Draft articles\n([\s\S]+?)(?=\n###|\n---)/)?.[1] || ''
  const drafts = draftSection.match(/^- `[^`]+`/gm) || []
  hooks.push({ name: 'quality:draft-articles', status: drafts.length === 0 ? 'pass' : 'warn',
    note: drafts.length === 0 ? 'no stalled drafts' : `${drafts.length} draft(s) stalled` })

  hooks.push({ name: 'topology:isolated-clusters',
    status: lint.includes('No isolated domain clusters detected') ? 'pass' : 'warn',
    note: lint.includes('No isolated domain clusters detected') ? 'all domains connected' : 'isolated cluster — see Topology Health' })

  return hooks
}

function parseLintSections(lint: string) {
  const extract = (header: string) =>
    lint.match(new RegExp(`## ${header}\\n([\\s\\S]+?)(?=\\n## |\\Z)`))?.[1]?.trim() || ''

  return {
    mechanical:  extract('Mechanical Checks'),
    graph:       extract('Graph Health'),
    topology:    extract('Topology Health'),
    content:     extract('Content Health'),
    growth:      extract('Growth Suggestions'),
    fixes:       extract('Pending Fixes'),
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const treeRes = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
      { headers: ghHeaders() }
    )
    const treeData = await treeRes.json() as GitHubTreeResponse
    const allFiles: { path: string }[] = treeData.tree || []

    const lintFiles = allFiles
      .filter(f => f.path.startsWith('lint/lint-check/') && f.path.endsWith('-lint.md'))
      .sort((a, b) => b.path.localeCompare(a.path))

    const rawFiles = allFiles
      .filter(f => f.path.startsWith('raw/') && f.path.endsWith('.md'))
      .sort((a, b) => b.path.localeCompare(a.path))
      .slice(0, 30)

    const wikiFiles = allFiles.filter(f => f.path.startsWith('wiki/') && f.path.endsWith('.md'))

    const [indexFile, lintFile, rawResults] = await Promise.all([
      getFile('wiki/_index/INDEX.md'),
      lintFiles[0] ? getFile(lintFiles[0].path) : Promise.resolve(null),
      Promise.allSettled(rawFiles.map(f => getFile(f.path))),
    ])

    // Pending Review
    const pendingReview = parsePendingReview(indexFile.content)

    // Recent compile output
    const recentCompile = parseRecentCompile(indexFile.content, wikiFiles)

    // Raw queue
    const rawQueue = rawResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => {
        const { path, content } = r.value
        const fm = parseFrontmatter(content)
        const firstLine = content.replace(/^---[\s\S]+?---\n/, '').split('\n')
          .find((l: string) => l.trim() && !l.startsWith('#')) || ''
        return {
          path,
          title:      fm.title || path.split('/').pop()!.replace('.md', ''),
          project:    fm.project,
          date:       fm.date,
          sourceType: sourceType(path),
          excerpt:    firstLine.slice(0, 100),
          lines:      content.split('\n').length,
        }
      })

    // Hooks + lint sections
    const lintDate     = lintFiles[0]?.path.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null
    const hooks        = lintFile ? deriveHooks(lintFile.content) : []
    const lintSections = lintFile ? parseLintSections(lintFile.content) : {}

    const failCount = hooks.filter(h => h.status === 'fail').length
    const warnCount = hooks.filter(h => h.status === 'warn').length

    res.status(200).json({
      pendingReview,
      recentCompile,
      rawQueue,
      hooks,
      lintSections,
      lintDate,
      failCount,
      warnCount,
    })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
