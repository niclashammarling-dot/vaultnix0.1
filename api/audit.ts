import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { GitHubFileResponse } from './_lib/github'

const GITHUB_API      = 'https://api.github.com'
const OWNER           = process.env.GITHUB_OWNER!
const REPO            = process.env.GITHUB_REPO!
const BRANCH          = process.env.GITHUB_BRANCH || 'master'
const TOKEN           = process.env.GITHUB_TOKEN!

const CORRECTIONS_PATH = 'Vault/data/corrections-log.ndjson'
const COUNTER_PATH     = 'Vault/data/hook-counter.json'

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

async function ghTree(): Promise<{ path: string }[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
    { headers: ghHeaders() }
  )
  if (!res.ok) throw new Error(`Tree fetch failed: ${res.status}`)
  const data = await res.json() as { tree: { path: string; type: string }[] }
  return data.tree.filter(f => f.path.startsWith('raw/session/') && f.path.endsWith('.md'))
}

function parseAuditFrontmatter(content: string): { title: string; project: string; date: string } {
  const block = content.match(/^---\n([\s\S]+?)\n---/)?.[1] || ''
  const get = (k: string) => block.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim() || ''
  return { title: get('title'), project: get('project'), date: get('date') }
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
  ts:           string
  action:       'ACCEPT' | 'REJECT' | 'FILL'
  sa_id?:       string
  source?:      string
  target?:      string
  shared?:      string
  flows?:       string
  without?:     string
  reason:       string
  hook_id:      string | null
  session:      string
  domain_pair?: string | null
  confidence?:  number | null
  // hook_fail write-back — written by compilation agent, never by the interface
  status?:      'hook_fail'
  note?:        string
  alternative?: string
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
  const [sessionFiles, logFile] = await Promise.all([
    ghTree(),
    ghRead(CORRECTIONS_PATH),
  ])

  const log     = logFile ? parseNdjson<{ sa_id?: string }>(logFile.content) : []
  const decided = new Set(log.map(e => e.sa_id).filter(Boolean))

  // Most recent 30 session files — ISO-date prefix sorts correctly
  const recent = sessionFiles
    .sort((a, b) => b.path.localeCompare(a.path))
    .slice(0, 30)

  const fileResults = await Promise.allSettled(
    recent.map(f => ghRead(f.path).then(r => r ? { ...r, path: f.path } : null))
  )

  const pending: QueueEntry[] = []

  for (const result of fileResults) {
    if (result.status !== 'fulfilled' || !result.value) continue
    const { path, content } = result.value

    const filename   = path.split('/').pop()?.replace('.md', '') || ''
    const fm         = parseAuditFrontmatter(content)
    const sessionDate = fm.date || filename.slice(0, 10)

    // Section may be last in file — split instead of lookahead to avoid EOF miss
    const afterHeader = content.split('## Suggested Connections\n')[1] || ''
    const section     = afterHeader.split(/\n## |\n---/)[0]

    // Two formats coexist in the vault:
    //   directed:  - [[source]] → [[target]] — rationale
    //   single:    - [[target]] — rationale  (source = this session)
    const lines = section.match(/^- \[\[[^\]]+\]\].*[—–-]+\s*.+$/gm) || []

    for (const line of lines) {
      let src: string, tgt: string, rationale: string

      const directed = line.match(/^- \[\[([^\]]+)\]\]\s*→\s*\[\[([^\]]+)\]\]\s*[—–-]+\s*(.+)$/)
      if (directed) {
        src = directed[1].trim()
        tgt = directed[2].trim()
        rationale = directed[3].trim()
      } else {
        const single = line.match(/^- \[\[([^\]]+)\]\]\s*[—–-]+\s*(.+)$/)
        if (!single) continue
        src = fm.title || filename
        tgt = single[1].trim()
        rationale = single[2].trim()
      }

      const id = `${filename}:${src}→${tgt}`
      if (decided.has(id)) continue

      pending.push({
        id,
        ts:          sessionDate,
        source:      directed ? `[[${src}]]` : src,
        target:      `[[${tgt}]]`,
        shared:      rationale,
        flows:       '',
        without:     '',
        confidence:  1.0,
        session:     sessionDate,
        domain_pair: fm.project || 'unknown',
      })
    }
  }

  pending.sort((a, b) => b.ts.localeCompare(a.ts))

  res.status(200).json({ pending, total: pending.length, decided: decided.size })
}

async function validatePost(req: VercelRequest, res: VercelResponse) {
  const { sa_id, action, source, target, shared, flows, without, reason, session, domain_pair, confidence } = req.body ?? {}

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
    ...(shared  ? { shared }  : {}),
    ...(flows   ? { flows }   : {}),
    ...(without ? { without } : {}),
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

// ── Quality scoring ───────────────────────────────────────────────────────────
//
// Link quality (ACCEPT, 0-3):
//   shared  — specific named concept, not a vague relation label
//   flows   — directional asymmetry using causal/dependency language
//   without — falsifiable consequence naming something losable
//
// Rejection honesty (REJECT, 0-2):
//   field_named  — reason names which of the three fields failed
//   distinction  — reason is substantive, not a hollow one-liner

function scoreShared(s: string | undefined): 0|1 {
  if (!s || s.length < 15) return 0
  const vague = /^\s*(both|similar|related|connection|association|linked|connected|overlap|relates|share)\s*\.?\s*$/i
  return vague.test(s) ? 0 : 1
}

function scoreFlows(s: string | undefined, fallback?: string): 0|1 {
  const src = (s && s.length >= 10) ? s : (fallback || '')
  if (src.length < 10) return 0
  const directional = /\b(enables?|requires?|constrains?|depends?|informs?|shapes?|generates?|forces?|drives?|prevents?|produces?|grounds?|allows?)\b|→|->|⟶/i
  return directional.test(src) ? 1 : 0
}

function scoreWithout(s: string | undefined, fallback?: string): 0|1 {
  const src = (s && s.length >= 10) ? s : (fallback || '')
  if (src.length < 10) return 0
  const consequence = /\b(would|could|cannot|can't|loses?|breaks?|fails?|lacks?|misses?|falls?|absent|missing|invisible|undetected|unnoticed|blind to)\b/i
  return consequence.test(src) ? 1 : 0
}

function scoreFieldNamed(reason: string | undefined): 0|1 {
  if (!reason || reason.length < 10) return 0
  const fieldRef = /\b(shared|flows|without|consequence|direction|asymmetr|specif|vague|falsifi|causal)/i
  return fieldRef.test(reason) ? 1 : 0
}

function scoreDistinction(reason: string | undefined): 0|1 {
  if (!reason || reason.length < 30) return 0
  const hollow = /^(not specific|too vague|doesn'?t apply|not relevant|no relation|rejected|skipped?)\s*\.?$/i
  return hollow.test(reason.trim()) ? 0 : 1
}

export interface LinkQualityScore  { shared: 0|1; flows: 0|1; without: 0|1; total: number }
export interface RejectionScore    { field_named: 0|1; distinction: 0|1; total: number }

export interface ScoredEntry {
  sa_id:        string
  ts:           string
  action:       'ACCEPT' | 'REJECT'
  source:       string
  target:       string
  shared?:      string
  flows?:       string
  without?:     string
  reason:       string
  confidence:   number | null
  domain_pair:  string | null
  session:      string
  link_quality?:      LinkQualityScore
  rejection_honesty?: RejectionScore
}

export interface SessionCoverage {
  id:             string
  accept_count:   number
  reject_count:   number
  coverage_ratio: number
  suspicious:     boolean
}

async function qualityGet(_req: VercelRequest, res: VercelResponse) {
  const file = await ghRead(CORRECTIONS_PATH)
  const all: CorrectionEntry[] = file ? parseNdjson<CorrectionEntry>(file.content) : []

  const saEntries = all.filter(e => e.action === 'ACCEPT' || e.action === 'REJECT')

  const scored: ScoredEntry[] = saEntries.map(e => {
    const base = {
      sa_id:       e.sa_id      ?? '',
      ts:          e.ts,
      action:      e.action as 'ACCEPT' | 'REJECT',
      source:      e.source     ?? '',
      target:      e.target     ?? '',
      shared:      e.shared,
      flows:       e.flows,
      without:     e.without,
      reason:      e.reason,
      confidence:  e.confidence ?? null,
      domain_pair: e.domain_pair ?? null,
      session:     e.session,
    }

    if (e.action === 'ACCEPT') {
      const sh = scoreShared(e.shared)
      const fl = scoreFlows(e.flows, e.shared)
      const wi = scoreWithout(e.without, e.shared)
      return { ...base, link_quality: { shared: sh, flows: fl, without: wi, total: sh + fl + wi } }
    } else {
      const fn = scoreFieldNamed(e.reason)
      const di = scoreDistinction(e.reason)
      return { ...base, rejection_honesty: { field_named: fn, distinction: di, total: fn + di } }
    }
  })

  // Coverage per session
  const bySession: Record<string, { accepts: number; rejects: number }> = {}
  for (const e of scored) {
    if (!bySession[e.session]) bySession[e.session] = { accepts: 0, rejects: 0 }
    if (e.action === 'ACCEPT') bySession[e.session].accepts++
    else bySession[e.session].rejects++
  }

  const sessions: SessionCoverage[] = Object.entries(bySession).map(([id, { accepts, rejects }]) => {
    const total = accepts + rejects
    const ratio = total === 0 ? 1 : accepts / total
    return { id, accept_count: accepts, reject_count: rejects, coverage_ratio: ratio, suspicious: ratio === 1 && accepts > 1 }
  })

  const accepts = scored.filter(e => e.action === 'ACCEPT')
  const rejects = scored.filter(e => e.action === 'REJECT')

  const mean = (arr: number[]) => arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length

  const summary = {
    total_sa:              saEntries.length,
    accept_count:          accepts.length,
    reject_count:          rejects.length,
    mean_link_quality:     mean(accepts.map(e => e.link_quality!.total)),
    mean_rejection_honesty: mean(rejects.map(e => e.rejection_honesty!.total)),
    hollow_out_canary:     rejects.length > 0 && rejects.every(e => e.rejection_honesty!.total === 0),
    suspicious_sessions:   sessions.filter(s => s.suspicious).length,
  }

  res.status(200).json({ scored, sessions, summary })
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

    if (resource === 'quality') {
      if (req.method === 'GET') return await qualityGet(req, res)
    }

    res.status(405).end()
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
