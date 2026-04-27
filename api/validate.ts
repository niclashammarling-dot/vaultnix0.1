import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { GitHubFileResponse } from './_lib/github'

const GITHUB_API  = 'https://api.github.com'
const OWNER       = process.env.GITHUB_OWNER!
const REPO        = process.env.GITHUB_REPO!
const BRANCH      = process.env.GITHUB_BRANCH || 'master'
const TOKEN       = process.env.GITHUB_TOKEN!

const QUEUE_PATH   = 'raw/audit/spreading-activation-queue.ndjson'
const LOG_PATH     = 'raw/audit/corrections-log.ndjson'
const COUNTER_PATH = 'raw/audit/hook-counter.json'

const ghHeaders = () => ({
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── NDJSON helpers ────────────────────────────────────────────────────────────

function parseNdjson<T>(raw: string): T[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .flatMap(l => { try { return [JSON.parse(l) as T] } catch { return [] } })
}

// ── Hook counter — identical pattern to corrections.ts ───────────────────────

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

  // ── GET — return pending queue (queue entries not yet in corrections log) ───
  if (req.method === 'GET') {
    try {
      const [queueFile, logFile] = await Promise.all([
        ghRead(QUEUE_PATH),
        ghRead(LOG_PATH),
      ])

      const queue   = queueFile ? parseNdjson<QueueEntry>(queueFile.content) : []
      const log     = logFile   ? parseNdjson<{ sa_id?: string }>(logFile.content) : []
      const decided = new Set(log.map(e => e.sa_id).filter(Boolean))

      const pending = queue
        .filter(e => !decided.has(e.id))
        .sort((a, b) => b.confidence - a.confidence)

      res.status(200).json({
        pending,
        total:   queue.length,
        decided: decided.size,
      })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
    return
  }

  // ── POST — record a Gate decision into corrections-log.ndjson ────────────
  if (req.method === 'POST') {
    try {
      const { sa_id, action, source, target, reason, session, domain_pair, confidence } = req.body ?? {}

      if (!sa_id || !action || !session) {
        return res.status(400).json({ error: 'sa_id, action, session required' })
      }
      if (!['ACCEPT', 'REJECT'].includes(action)) {
        return res.status(400).json({ error: 'action must be ACCEPT | REJECT' })
      }

      // Guard: don't double-record a decision for the same queue entry
      const logFile = await ghRead(LOG_PATH)
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

      await ghWrite(
        LOG_PATH,
        updated,
        logFile?.sha ?? null,
        `audit: ${action} ${sa_id} [${session}]`
      )

      res.status(200).json({ ok: true, entry })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
    return
  }

  res.status(405).end()
}
