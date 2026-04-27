import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { GitHubFileResponse } from './_lib/github'

const GITHUB_API      = 'https://api.github.com'
const OWNER           = process.env.GITHUB_OWNER!
const REPO            = process.env.GITHUB_REPO!
const BRANCH          = process.env.GITHUB_BRANCH || 'master'
const TOKEN           = process.env.GITHUB_TOKEN!

const CORRECTIONS_PATH = 'raw/audit/corrections-log.ndjson'
const COUNTER_PATH     = 'raw/audit/hook-counter.json'
const QUEUE_PATH       = 'raw/audit/spreading-activation-queue.ndjson'

const ghHeaders = () => ({
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

// ── GitHub helpers ────────────────────────────────────────────────────────────

async function ghRead(path: string): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: ghHeaders() }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Read failed: ${path} — ${res.status}`)
  const data = await res.json() as GitHubFileResponse
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
    const err = await res.json() as { message: string }
    throw new Error(`Write failed: ${err.message}`)
  }
}

function parseNdjson<T>(raw: string): T[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .flatMap(l => { try { return [JSON.parse(l) as T] } catch { return [] } })
}

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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CorrectionEntry {
  ts:          string
  action:      'ACCEPT' | 'REJECT' | 'FILL'
  sa_id?:      string
  source?:     string
  target?:     string
  reason:      string
  hook_id:     string | null
  session:     string
  domain_pair?: string | null
  confidence?:  number | null
}

export interface QueueEntry {
  id:          string
  ts:          string
  source:      string
  target:      string
  shared:      string
  flows:       string
  without:     string
  confidence:  number
  session:     string
  domain_pair: string
}

// ── Corrections resource ───────────────────────────────────────────────────────

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

async function correctionsGet(req: VercelRequest, res: VercelResponse) {
  const file = await ghRead(CORRECTIONS_PATH)
  let entries: CorrectionEntry[] = file ? parseNdjson<CorrectionEntry>(file.content) : []

  const { action } = req.query
  if (action && typeof action === 'string') {
    const upper = action.toUpperCase()
    entries = entries.filter(e => e.action === upper as CorrectionEntry['action'])
  }

  entries.sort((a, b) => b.ts.localeCompare(a.ts))

  const byAction = {
    ACCEPT: entries.filter(e => e.action === 'ACCEPT').length,
    REJECT: entries.filter(e => e.action === 'REJECT').length,
    FILL:   entries.filter(e => e.action === 'FILL').length,
  }

  res.status(200).json({ entries, total: entries.length, byAction, weakestLink: computeWeakestLink(entries) })
}

async function correctionsPost(req: VercelRequest, res: VercelResponse) {
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

  const file  = await ghRead(CORRECTIONS_PATH)
  const prior = file?.content.trimEnd() ?? ''
  const next  = (prior ? prior + '\n' : '') + JSON.stringify(entry) + '\n'

  await ghWrite(CORRECTIONS_PATH, next, file?.sha ?? null, `audit: ${action} ${source || target || 'entry'} [${session}]`)
  res.status(200).json({ ok: true, entry })
}

// ── Validate resource ─────────────────────────────────────────────────────────

async function validateGet(_req: VercelRequest, res: VercelResponse) {
  const [queueFile, logFile] = await Promise.all([
    ghRead(QUEUE_PATH),
    ghRead(CORRECTIONS_PATH),
  ])

  const queue   = queueFile ? parseNdjson<QueueEntry>(queueFile.content) : []
  const log     = logFile   ? parseNdjson<{ sa_id?: string }>(logFile.content) : []
  const decided = new Set(log.map(e => e.sa_id).filter(Boolean))

  const pending = queue
    .filter(e => !decided.has(e.id))
    .sort((a, b) => b.confidence - a.confidence)

  res.status(200).json({ pending, total: queue.length, decided: decided.size })
}

async function validatePost(req: VercelRequest, res: VercelResponse) {
  const { sa_id, action, source, target, reason, session, domain_pair, confidence } = req.body ?? {}

  if (!sa_id || !action || !session) {
    return res.status(400).json({ error: 'sa_id, action, session required' })
  }
  if (!['ACCEPT', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'action must be ACCEPT | REJECT' })
  }

  const logFile = await ghRead(CORRECTIONS_PATH)
  const existing = logFile ? parseNdjson<{ sa_id?: string }>(logFile.content) : []
  if (existing.some(e => e.sa_id === sa_id)) {
    return res.status(409).json({ error: `${sa_id} already decided` })
  }

  const hook_id = action === 'REJECT' ? await nextHookId() : null

  const entry = {
    ts: new Date().toISOString(),
    action,
    sa_id,
    source,
    target,
    reason: reason || (action === 'ACCEPT' ? 'accepted via Validation Gate' : 'rejected via Validation Gate'),
    hook_id,
    session,
    domain_pair: domain_pair ?? null,
    confidence:  confidence  ?? null,
  }

  const prior   = logFile?.content.trimEnd() ?? ''
  const updated = (prior ? prior + '\n' : '') + JSON.stringify(entry) + '\n'

  await ghWrite(CORRECTIONS_PATH, updated, logFile?.sha ?? null, `audit: ${action} ${sa_id} [${session}]`)
  res.status(200).json({ ok: true, entry })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { resource } = req.query
  if (!resource || typeof resource !== 'string') {
    return res.status(400).json({ error: 'resource query param required: corrections | validate' })
  }

  try {
    if (resource === 'corrections') {
      if (req.method === 'GET')  return await correctionsGet(req, res)
      if (req.method === 'POST') return await correctionsPost(req, res)
    }

    if (resource === 'validate') {
      if (req.method === 'GET')  return await validateGet(req, res)
      if (req.method === 'POST') return await validatePost(req, res)
    }

    res.status(405).end()
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
