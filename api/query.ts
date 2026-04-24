import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { getArticlesForQuery } from './_lib/github'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM = `You are MEM1, an agent navigating Niclas's personal knowledge vault (Vaultnix).
The vault covers: apex (systematic trading — four gates, 19+ mechanical audit checks), tcx (Teacher Cognitive Exoskeleton — multi-agent), teaching (Dannikeskolan 4A/5A — Lgr22), hiking (Alter-native Hiking — "Walk slowly. Go deep."), knowledge-work (agent-operated knowledge systems, compilation skill, benchmarking), and inspiration.

Given a query and vault context, return a JSON object with exactly this schema:
{
  "traversal": [
    {"hop": 1, "node": "slug-of-article-or-concept", "kind": "MOC|concept|article|skill|index", "note": "one-line reason for visiting this node"}
  ],
  "synthesis": "Dense markdown synthesis. Use **bold** for key claims. Use [[wikilink]] syntax for vault nodes. 2-4 paragraphs.",
  "gaps": ["Gap 1 — what the vault lacks or what article would need to exist", "Gap 2"],
  "surprise": "One unexpected cross-domain connection the user did not ask for, or null if none exists",
  "score": {"TD": 7, "SQ": 8, "GH": 9, "SU": 6}
}

Scoring rules (1–10):
- TD (traversal density): 1 if you visited 1 node, 10 if you traced 5+ relevant nodes with clear reasoning for each hop
- SQ (synthesis quality): 1 if shallow summary, 10 if the synthesis makes a non-obvious cross-domain claim
- GH (gap honesty): 1 if you invented missing content, 10 if you named exactly what's absent and what stub would fix it
- SU (surprise): 1 if no unexpected connection, 10 if the surprise is genuinely non-obvious and cross-domain

RULES:
- Use only node slugs that appear in the vault context. Do not invent article names.
- If the vault truly cannot answer the query, say so in gaps and give GH a high score.
- Never confabulate. Surface gaps honestly.
- Return only valid JSON. No markdown fences.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { q } = req.body
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'q required' })

  try {
    const vaultContext = await getArticlesForQuery(q)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `VAULT CONTEXT:\n${vaultContext}\n\nQUERY: ${q}` },
      ],
    })

    const raw = completion.choices[0].message.content ?? '{}'
    const result = JSON.parse(raw)

    // Enforce schema minimums
    if (!Array.isArray(result.traversal)) result.traversal = []
    if (!result.synthesis) result.synthesis = 'No synthesis available.'
    if (!Array.isArray(result.gaps)) result.gaps = []
    if (!result.score) result.score = { TD: 5, SQ: 5, GH: 5, SU: 5 }

    res.status(200).json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
