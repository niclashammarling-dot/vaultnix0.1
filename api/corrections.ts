import type { VercelRequest, VercelResponse } from '@vercel/node'

const GITHUB_API  = 'https://api.github.com'
const OWNER       = process.env.GITHUB_OWNER!
const REPO        = process.env.GITHUB_REPO!
const BRANCH      = process.env.GITHUB_BRANCH || 'master'
const TOKEN       = process.env.GITHUB_TOKEN!

const LOG_PATH     = 'raw/audit/corrections-log.ndjson'
const COUNTER_PATH = 'raw/audit/hook-counter.json'

const ghHeaders = () => ({
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CorrectionEntry {
  ts:      string
  action:  'ACCEPT' | 'REJECT' | 'FILL'
  source?: string
  target?: string
  reason:  string
  hook_id: string | null
  session: string
}

// ── GitHub helpers ────────────────────────────────────────────────────────────

async function ghRead(path: string): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: ghHeaders() }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Read failed: ${path} — ${res.status}`)
  const data = await res.json()
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha }
}

async function ghWrite(path: string, content: string, sha: string | null, message: string): Promise<void> {
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Write failed: ${err.message}`)
  }
}

// ── NDJSON parsing ────────────────────────────────────────────────────────────

function parseNdjson(raw: string): CorrectionEntry[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } })
}

// ── Weakest link ──────────────────────────────────────────────────────────────
// Operates on article-slug pairs. Domain-level aggregation can be layered in
// later once article→domain metadata is available in the vault tree.

function computeWeakestLink(all: CorrectionEntry[]): { pair: string; rejectRate: number } | null {
  const pairs: Record<string, { rejects: number; total: number }> = {}

  for (const e of all) {
    if (!e.source || !e.target) continue
    const key = `${e.source} ↔ ${e.target}`
    if (!pairs[key]) pairs[key] = { rejects: 0, total: 0 }
    pairs[key].total++
    if (e.action === 'REJECT') pairs[key].rejects++
  }

  const candidates = Object.entries(pairs)
    .filter(([, v]) => v.rejects > 0)
    .sort((a, b) => (b[1].rejects / b[1].total) - (a[1].rejects / a[1].total))

  if (!candidates.length) return null
  const [pair, { rejects, total }] = candidates[0]
  return { pair, rejectRate: Math.round((rejects / total) * 100) }
}

// ── Hook counter ──────────────────────────────────────────────────────────────

async function nextHookId(): Promise<string> {
  const file = await ghRead(COUNTER_PATH)
  let next = 100
  let sha: string | null = null

  if (file) {
    try { next = JSON.parse(file.content).next ?? 100 } catch {}
    sha = file.sha
  }

  await ghWrite(
    COUNTER_PATH,
    JSON.stringify({ next: next + 1 }),
    sha,
    `audit: increment hook counter → NC-${next + 1}`
  )
  return `NC-${next}`
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const file = await ghRead(LOG_PATH)
      let entries: CorrectionEntry[] = file ? parseNdjson(file.content) : []

      const { action } = req.query
      if (action && typeof action === 'string') {
        const upper = action.toUpperCase()
        entries = entries.filter(e => e.action === upper)
      }

      entries.sort((a, b) => b.ts.localeCompare(a.ts))

      const byAction = {
        ACCEPT: entries.filter(e => e.action === 'ACCEPT').length,
        REJECT: entries.filter(e => e.action === 'REJECT').length,
        FILL:   entries.filter(e => e.action === 'FILL').length,
      }

      res.status(200).json({
        entries,
        total: entries.length,
        byAction,
        weakestLink: computeWeakestLink(entries),
      })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
    return
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { action, source, target, reason, session, sa_id, domain_pair, confidence } = req.body ?? {}

      if (!action || !reason || !session) {
        return res.status(400).json({ error: 'action, reason, session required' })
      }
      if (!['ACCEPT', 'REJECT', 'FILL'].includes(action)) {
        return res.status(400).json({ error: 'action must be ACCEPT | REJECT | FILL' })
      }

      const hook_id = action === 'REJECT' ? await nextHookId() : null

      const entry: CorrectionEntry = {
        ts: new Date().toISOString(),
        action,
        ...(sa_id       ? { sa_id }       : {}),
        ...(source      ? { source }      : {}),
        ...(target      ? { target }      : {}),
        reason,
        hook_id,
        session,
        ...(domain_pair !== undefined ? { domain_pair } : {}),
        ...(confidence  !== undefined ? { confidence }  : {}),
      }

      const file  = await ghRead(LOG_PATH)
      const prior = file?.content.trimEnd() ?? ''
      const next  = (prior ? prior + '\n' : '') + JSON.stringify(entry) + '\n'

      await ghWrite(
        LOG_PATH,
        next,
        file?.sha ?? null,
        `audit: ${action} ${source || target || 'entry'} [${session}]`
      )

      res.status(200).json({ ok: true, entry })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
    return
  }

  res.status(405).end()
}
