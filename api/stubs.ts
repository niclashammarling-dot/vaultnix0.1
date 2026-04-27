import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFile } from './_lib/github'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Stub {
  id:          string
  inbound:     number
  domains:     string[]
  domainCount: number
  description: string
  score:       number
  ageDays:     number        // days since earliest lint file containing this stub
  ageLabel:    string        // "≥Nd" — ≥ prefix makes the approximation visible
}

// ── Domain map — category header → project domains ───────────────────────────

const DOMAIN_MAP: Record<string, string[]> = {
  'cross-domain':   ['knowledge-work', 'vault', 'apex', 'teaching'],
  'teaching':       ['teaching'],
  'apex':           ['apex'],
  'knowledge-work': ['knowledge-work'],
  'vault':          ['vault'],
  'inspiration':    ['inspiration'],
  'philosophy':     ['knowledge-work'],
}

// ── Format detection ──────────────────────────────────────────────────────────
//
// Three formats observed in lint history:
//   structured  — `[[slug]]` — N refs (...); description       (2026-04-26 format)
//   linked-from — `[[slug]]` — linked from: source1, source2   (2026-04-07 format)
//   prose       — **[[slug]]** (mentioned in ...) or `[[slug]]` (mentioned ...) (2026-04-27 format)

type LintFormat = 'structured' | 'linked-from' | 'prose'

function detectFormat(content: string): LintFormat {
  if (/`\[\[[^\]]+\]\]`\s*[—-]+\s*\d+\s*refs?/m.test(content))       return 'structured'
  if (/`\[\[[^\]]+\]\]`\s*[—-]+\s*linked from:/im.test(content))      return 'linked-from'
  return 'prose'
}

// ── Section extraction ────────────────────────────────────────────────────────
// Returns everything under "### Stub" or "**Stub" headers until the next section.

function extractStubSections(content: string): string {
  // Match any section starting with "Stub links" at any heading level
  const sections: string[] = []
  const pattern = /(?:^#{1,4}\s+Stub[^\n]*|^\*\*Stub[^\n]*\*\*)\n([\s\S]+?)(?=\n#{1,4}\s|\n\*\*[A-Z]|\n---|\Z)/gm
  let m: RegExpExecArray | null
  while ((m = pattern.exec(content)) !== null) {
    sections.push(m[1])
  }
  return sections.join('\n')
}

// ── Category header tracking (shared across parsers) ─────────────────────────

function categoryFromLine(line: string): string | null {
  const m = line.match(/^\*\*([^*]+)\*\*/)
  if (!m) return null
  const cat = m[1].toLowerCase()
  if (cat.includes('cross-domain') || cat.includes('cross domain')) return 'cross-domain'
  if (cat.includes('teaching'))      return 'teaching'
  if (cat.includes('apex'))          return 'apex'
  if (cat.includes('knowledge-work') || cat.includes('philosophy')) return 'knowledge-work'
  if (cat.includes('vault'))         return 'vault'
  if (cat.includes('inspiration'))   return 'inspiration'
  return null
}

// ── Parser: structured ────────────────────────────────────────────────────────
// `[[slug]]` — N refs (source1, ...); description

function parseStructured(stubSection: string): Stub[] {
  const stubs: Stub[] = []
  let currentCategory = 'general'

  for (const line of stubSection.split('\n')) {
    const cat = categoryFromLine(line)
    if (cat) { currentCategory = cat; continue }

    const m = line.match(/^[-*]\s+`\[\[([^\]]+)\]\]`\s*[—-]+\s*(\d+)\s*(?:refs?|inbound)[^;]*;(.+)$/)
    if (!m) continue

    const id          = m[1].trim()
    const inbound     = parseInt(m[2], 10)
    const description = m[3].trim()
    const domains     = DOMAIN_MAP[currentCategory] || ['general']
    const crossBonus  = currentCategory === 'cross-domain' ? 25 : 0
    const score       = Math.min(100, inbound * 6 + crossBonus + (domains.length > 1 ? 10 : 0))
    stubs.push({ id, inbound, domains, domainCount: domains.length, description, score, ageDays: 0, ageLabel: '≥0d' })
  }
  return stubs.sort((a, b) => b.score - a.score)
}

// ── Parser: linked-from ───────────────────────────────────────────────────────
// `[[slug]]` — linked from: source1, source2, ...

function parseLinkedFrom(stubSection: string): Stub[] {
  const stubs: Stub[] = []
  let currentCategory = 'general'

  for (const line of stubSection.split('\n')) {
    const cat = categoryFromLine(line)
    if (cat) { currentCategory = cat; continue }

    const m = line.match(/^[-*]\s+`\[\[([^\]]+)\]\]`\s*[—-]+\s*linked from:\s*(.+)$/i)
    if (!m) continue

    const id       = m[1].trim()
    const sources  = m[2].split(',').map(s => s.trim()).filter(Boolean)
    const inbound  = sources.length
    const description = `referenced from: ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? '…' : ''}`
    const domains  = DOMAIN_MAP[currentCategory] || ['general']
    const crossBonus = currentCategory === 'cross-domain' ? 25 : 0
    const score    = Math.min(100, inbound * 6 + crossBonus + (domains.length > 1 ? 10 : 0))
    stubs.push({ id, inbound, domains, domainCount: domains.length, description, score, ageDays: 0, ageLabel: '≥0d' })
  }
  return stubs.sort((a, b) => b.score - a.score)
}

// ── Parser: prose ─────────────────────────────────────────────────────────────
// **[[slug]]** (mentioned in ...) or `[[slug]]` (mentioned in ...)

function parseProse(stubSection: string): Stub[] {
  const stubs: Stub[] = []
  let currentCategory = 'general'

  for (const line of stubSection.split('\n')) {
    const cat = categoryFromLine(line)
    if (cat) { currentCategory = cat; continue }

    // Match **[[slug]]** (...) or `[[slug]]` (...) or  - [[slug]] (...)
    const m = line.match(/^[-*\s]+(?:\*\*`?\[\[([^\]]+)\]\]`?\*\*|`\[\[([^\]]+)\]\]`|\[\[([^\]]+)\]\])\s*(.*)$/)
    if (!m) continue

    const id = (m[1] || m[2] || m[3])?.trim()
    if (!id) continue

    const rest = m[4] || ''

    // Count mentions: items in (mentioned in X, Y, Z) or (from X, Y, Z) lists
    const mentionMatch = rest.match(/\((?:mentioned in|from|linked from)\s+([^)]+)\)/i)
    const inbound = mentionMatch
      ? mentionMatch[1].split(',').filter(Boolean).length
      : 1

    // Description: colon-separated suffix or stripped rest
    const descMatch = rest.match(/[):]\s+(.+)$/)
    const description = descMatch
      ? descMatch[1].trim()
      : rest.replace(/\([^)]*\)/, '').trim() || 'stub — no description in prose lint'

    const domains    = DOMAIN_MAP[currentCategory] || ['general']
    const crossBonus = currentCategory === 'cross-domain' ? 25 : 0
    const score      = Math.min(100, inbound * 6 + crossBonus + (domains.length > 1 ? 10 : 0))
    stubs.push({ id, inbound, domains, domainCount: domains.length, description, score, ageDays: 0, ageLabel: '≥0d' })
  }
  return stubs.sort((a, b) => b.score - a.score)
}

// ── Parse dispatch ────────────────────────────────────────────────────────────

function parseStubs(content: string): Stub[] {
  const section = extractStubSections(content)
  const fmt     = detectFormat(content)
  if (fmt === 'structured')   return parseStructured(section)
  if (fmt === 'linked-from')  return parseLinkedFrom(section)
  return parseProse(section)
}

// ── Slug extraction (format-agnostic, for cross-lint age) ────────────────────

function extractSlugs(content: string): Set<string> {
  const slugs = new Set<string>()
  const stubSection = extractStubSections(content)
  for (const m of stubSection.matchAll(/\[\[([^\]]+)\]\]/g)) {
    slugs.add(m[1].trim())
  }
  return slugs
}

// ── Age computation ───────────────────────────────────────────────────────────
// Reads last N lint files, finds earliest containing each slug.
// Returns map: slug → ageDays.

async function computeAges(
  allLintPaths: string[],
  currentSlugs: Set<string>
): Promise<Map<string, number>> {
  // Take last 5 lint files sorted ascending (oldest first) for age window
  const window = allLintPaths.slice(-5)
  const today  = Date.now()

  const dateFromPath = (p: string): number => {
    const m = p.match(/(\d{4}-\d{2}-\d{2})/)
    return m ? new Date(m[1]).getTime() : today
  }

  // Read all window files in parallel
  const results = await Promise.allSettled(window.map(p => getFile(p)))

  // For each file: extract slugs present, record file date
  const fileSlugs: Array<{ date: number; slugs: Set<string> }> = results
    .map((r, i) => ({
      date:  dateFromPath(window[i]),
      slugs: r.status === 'fulfilled' ? extractSlugs(r.value.content) : new Set<string>(),
    }))

  // For each current stub slug: find the oldest file containing it
  const ages = new Map<string, number>()
  for (const slug of currentSlugs) {
    let earliest = today
    for (const { date, slugs } of fileSlugs) {
      if (slugs.has(slug) && date < earliest) earliest = date
    }
    ages.set(slug, Math.floor((today - earliest) / 86_400_000))
  }
  return ages
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const GITHUB_API = 'https://api.github.com'
    const OWNER  = process.env.GITHUB_OWNER!
    const REPO   = process.env.GITHUB_REPO!
    const BRANCH = process.env.GITHUB_BRANCH || 'master'
    const TOKEN  = process.env.GITHUB_TOKEN!

    const treeRes = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
      { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github.v3+json' } }
    )
    const treeData = await treeRes.json()
    const lintPaths: string[] = (treeData.tree as { path: string }[])
      .filter(f => f.path.startsWith('lint/lint-check/') && f.path.endsWith('-lint.md'))
      .map(f => f.path)
      .sort()  // ascending: oldest first

    if (lintPaths.length === 0) {
      return res.status(200).json({ stubs: [], lintDate: null, format: null })
    }

    const latestPath = lintPaths[lintPaths.length - 1]
    const lintDate   = latestPath.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null

    const lintFile = await getFile(latestPath)
    const stubs    = parseStubs(lintFile.content)
    const format   = detectFormat(lintFile.content)

    // Age: cross-lint comparison against last 5 reports
    const currentSlugs = new Set(stubs.map(s => s.id))
    const ages = await computeAges(lintPaths, currentSlugs)

    for (const stub of stubs) {
      const days    = ages.get(stub.id) ?? 0
      stub.ageDays  = days
      stub.ageLabel = `≥${days}d`
    }

    res.status(200).json({ stubs, lintDate, format, source: latestPath })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
