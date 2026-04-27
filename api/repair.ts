import { getFile, updateFile } from './_lib/github'
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

interface RepairResult {
  fixed: number
  skipped: number
  errors: string[]
  log: string[]
  requiresManual?: string[]
}

async function getLatestLintFile(): Promise<{ path: string; content: string; sha: string } | null> {
  const treeRes = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
    { headers: ghHeaders() }
  )
  const treeData = await treeRes.json() as GitHubTreeResponse
  const lintFiles = (treeData.tree || [] as { path: string }[])
    .filter(f => f.path.startsWith('lint/lint-check/') && f.path.endsWith('-lint.md'))
    .sort((a, b) => b.path.localeCompare(a.path))

  if (!lintFiles[0]) return null
  const file = await getFile(lintFiles[0].path)
  return file
}

// ── Mechanical: domain routing ────────────────────────────────────────────────
// Parses entries like:
//   - `wiki/path/file.md`: `project: X` ... — fix: change to `project: Y`
//   - `wiki/path/file.md`: missing `project:` ... — fix: add `project: Y`

async function repairDomainRouting(lintContent: string): Promise<RepairResult> {
  const result: RepairResult = { fixed: 0, skipped: 0, errors: [], log: [] }

  const mechSection = lintContent.match(/## Mechanical Checks\n([\s\S]+?)(?=\n---|\n# |\Z)/)?.[1] || ''
  const lines = mechSection.match(/^\s+- `wiki\/[^`]+`:.+— fix:.+$/gm) || []

  for (const line of lines) {
    const pathMatch = line.match(/`(wiki\/[^`]+)`/)
    const fixMatch  = line.match(/— fix: (?:change to|lowercase to|add) `project: ([^`]+)`/)
    if (!pathMatch || !fixMatch) { result.skipped++; continue }

    const filePath  = pathMatch[1]
    const newProject = fixMatch[1].trim()

    try {
      const file = await getFile(filePath)

      // Only modify the frontmatter block
      const fmHasProject = /^project:/m.test(file.content.match(/^---\n([\s\S]+?)\n---/)?.[1] || '')
      let content: string

      if (fmHasProject) {
        content = file.content.replace(/^(project:).+$/m, `$1 ${newProject}`)
      } else {
        // Insert after title: line in frontmatter
        content = file.content.replace(/^(title:.+)$/m, `$1\nproject: ${newProject}`)
      }

      if (content === file.content) { result.skipped++; continue }

      await updateFile(filePath, content, file.sha,
        `lint-fix: correct project routing in ${filePath.split('/').pop()}`)
      result.fixed++
      result.log.push(`${filePath}: project → ${newProject}`)
    } catch (e: any) {
      // 404 = file no longer exists (already moved/deleted) — skip cleanly
      if (String(e).includes('404') || String(e).includes('Not Found')) {
        result.skipped++
        result.log.push(`${filePath}: skipped (file not found — likely already fixed)`)
      } else {
        result.errors.push(`${filePath}: ${String(e)}`)
      }
    }
  }

  return result
}

// ── Mechanical: structural formatting ────────────────────────────────────────
// Parses entries like:
//   - `wiki/path/file.md` line N: description: `bad string` — should be `good string`

async function repairFormatting(lintContent: string): Promise<RepairResult> {
  const result: RepairResult = { fixed: 0, skipped: 0, errors: [], log: [] }

  const section = lintContent.match(/### Structural formatting error[^\n]*\n([\s\S]+?)(?=\n###|\n---|\n## |\Z)/)?.[1] || ''
  const lines = section.match(/^- `wiki\/[^`]+`.+/gm) || []

  for (const line of lines) {
    const pathMatch = line.match(/`(wiki\/[^`]+)`/)
    // Pattern: `bad string` — should be `good string`
    const badMatch  = line.match(/:\s*`([^`]+)`\s*—\s*should be/)
    const goodMatch = line.match(/should be `([^`]+)`/)

    if (!pathMatch || !badMatch || !goodMatch) { result.skipped++; continue }

    const filePath = pathMatch[1]
    const badStr   = badMatch[1]
    const goodStr  = goodMatch[1]

    try {
      const file = await getFile(filePath)

      if (!file.content.includes(badStr)) {
        result.skipped++
        result.log.push(`${filePath}: already clean`)
        continue
      }

      const content = file.content.replace(badStr, goodStr)
      await updateFile(filePath, content, file.sha,
        `lint-fix: fix malformed wikilink in ${filePath.split('/').pop()}`)
      result.fixed++
      result.log.push(`${filePath}: "${badStr}" → "${goodStr}"`)
    } catch (e: any) {
      if (String(e).includes('404') || String(e).includes('Not Found')) {
        result.skipped++
      } else {
        result.errors.push(`${filePath}: ${String(e)}`)
      }
    }
  }

  return result
}

// ── Structural: flag to Pending Review ───────────────────────────────────────
// For hooks that need human+LLM judgment (orphans, weak nodes, drafts):
// adds each flagged article to ## Pending Review in INDEX.md

async function flagToReview(slugs: string[], reason: string): Promise<RepairResult> {
  const result: RepairResult = { fixed: 0, skipped: 0, errors: [], log: [] }
  if (slugs.length === 0) return result

  try {
    const indexFile = await getFile('wiki/_index/INDEX.md')
    const date = new Date().toISOString().slice(0, 10)
    let content = indexFile.content

    const entries = slugs
      .filter(s => !content.includes(`[[${s}]]`))
      .map(s => `- [[${s}]] — flagged for ${reason} · ${date}\n`)

    if (entries.length === 0) { result.skipped = slugs.length; return result }

    const block = entries.join('')
    if (content.includes('## Pending Review\n')) {
      content = content.replace('## Pending Review\n', `## Pending Review\n${block}`)
    } else {
      content = content.replace(/^(# .+\n)/, `$1\n## Pending Review\n${block}\n`)
    }

    await updateFile('wiki/_index/INDEX.md', content, indexFile.sha,
      `lint-fix: flag ${entries.length} article(s) for ${reason}`)
    result.fixed = entries.length
    result.skipped = slugs.length - entries.length
    entries.forEach(e => result.log.push(e.trim()))
  } catch (e) {
    result.errors.push(String(e))
  }

  return result
}

function parseSlugList(note: string): string[] {
  // note like "slug1, slug2, slug3 (3 weak)" or "3 orphan(s) detected"
  // Try to extract bare slugs — they appear before the parenthetical
  return note
    .replace(/\s*\([^)]+\)\s*$/, '')
    .split(',')
    .map(s => s.trim().replace(/^-+\s*/, '').replace(/[`[\]]/g, ''))
    .filter(s => s && !/^\d+/.test(s))
}

// ── Append fix log to lint file ───────────────────────────────────────────────

async function appendFixLog(lintFile: { path: string; content: string; sha: string },
                             hook: string, result: RepairResult): Promise<void> {
  if (result.fixed === 0 && result.errors.length === 0) return
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const logLines = result.log.map(l => `  - ${l}`).join('\n')
  const errLines = result.errors.map(l => `  - ERROR: ${l}`).join('\n')
  const entry = `\n*${date} — auto-repair: ${hook} · ${result.fixed} fixed, ${result.skipped} skipped*\n` +
    (logLines ? logLines + '\n' : '') +
    (errLines ? errLines + '\n' : '')

  let updated = lintFile.content
  if (updated.includes('## Applied Fixes')) {
    updated = updated.replace('## Applied Fixes\n', `## Applied Fixes\n${entry}`)
  } else {
    updated += `\n---\n\n## Applied Fixes\n${entry}`
  }

  // Re-fetch SHA before writing (another write may have updated it)
  try {
    const fresh = await getFile(lintFile.path)
    await updateFile(lintFile.path, updated.replace(lintFile.content, fresh.content.endsWith('\n') ? fresh.content : fresh.content + '\n').replace(lintFile.content, fresh.content), fresh.sha,
      `lint-fix: log ${hook} repairs`)
  } catch {
    // Log append failure is non-fatal — repairs already applied
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const { hook, note } = req.body
  if (!hook) return res.status(400).json({ error: 'hook required' })

  try {
    const lintFile = await getLatestLintFile()
    if (!lintFile) return res.status(404).json({ error: 'no lint report found' })

    let result: RepairResult

    switch (hook) {
      case 'struct:domain-routing':
        result = await repairDomainRouting(lintFile.content)
        break

      case 'struct:formatting':
        result = await repairFormatting(lintFile.content)
        break

      case 'graph:no-orphans': {
        // Parse orphan slugs from lint Graph Health section
        const section = lintFile.content.match(/### Orphaned articles[^\n]*\n([\s\S]+?)(?=\n###)/)?.[1] || ''
        const slugs = (section.match(/^- `[^`]+`/gm) || [])
          .map(l => l.match(/`([^`]+)`/)?.[1]?.replace(/^wiki\/.+\//, '').replace('.md','') || '')
          .filter(Boolean)
        result = await flagToReview(slugs, 'orphan resolution')
        break
      }

      case 'quality:spreading-activation≥3': {
        const slugs = note ? parseSlugList(note) : []
        result = await flagToReview(slugs, 'spreading activation fix')
        break
      }

      case 'quality:draft-articles': {
        const section = lintFile.content.match(/### Draft articles\n([\s\S]+?)(?=\n###|\n---)/)?.[1] || ''
        const slugs = (section.match(/^- `[^`]+`/gm) || [])
          .map(l => l.match(/`([^`]+)`/)?.[1]?.replace(/^wiki\/.+\//, '').replace('.md','') || '')
          .filter(Boolean)
        result = await flagToReview(slugs, 'stalled draft review')
        break
      }

      default:
        return res.status(400).json({ error: `no auto-repair for hook: ${hook}` })
    }

    // Append fix log to lint report (best-effort)
    try {
      const freshLint = await getLatestLintFile()
      if (freshLint && result.fixed > 0) {
        const date = new Date().toISOString().slice(0, 16).replace('T', ' ')
        const logLines = result.log.map(l => `  - ${l}`).join('\n')
        const entry = `\n*${date} — auto-repair: ${hook} · ${result.fixed} fixed, ${result.skipped} skipped*\n${logLines}\n`
        let updated = freshLint.content
        if (updated.includes('## Applied Fixes')) {
          updated = updated.replace('## Applied Fixes\n', `## Applied Fixes\n${entry}`)
        } else {
          updated += `\n---\n\n## Applied Fixes\n${entry}`
        }
        await updateFile(freshLint.path, updated, freshLint.sha, `lint-fix: log ${hook} repairs`)
      }
    } catch { /* log append is non-fatal */ }

    res.status(200).json({ ok: true, ...result })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
