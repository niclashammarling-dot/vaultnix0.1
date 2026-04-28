// Vaultnix 0.1 — "Ask" view. Research-assistant style response with:
//   Traversal Path → Synthesis → Gap Honesty → Surprise
// Shows the reasoning structure, not a chat bubble.

const SAMPLE_QUERIES = [
  {
    q: 'How do APEX and teaching share an audit pattern?',
    traversal: [
      { hop: 1, node: 'knowledge-work-moc', kind: 'MOC', note: 'domain orientation' },
      { hop: 2, node: 'audit-loop', kind: 'concept', note: 'cross-domain definition' },
      { hop: 3, node: 'nightly-audit-architecture', kind: 'article', note: 'APEX instance — 19 mechanical checks' },
      { hop: 4, node: 'omtest-methodology', kind: 'article', note: 'teaching instance — retest as inspection' },
      { hop: 5, node: 'corroboration-architecture', kind: 'concept', note: 'shortcut — both rely on independent checks' },
    ],
    synthesis: `Both systems implement the same three-stage loop: **classification → inspection → correction+encoding**. APEX\u2019s nightly mechanical_checks.py runs 19 independent checks against yesterday\u2019s runs; each CHECK that ever failed permanently encodes a past incident. Teaching\u2019s omtest re-classifies students who fell into an at-risk band on Legilexi; the retest *is* the inspection layer, and the revision to the IUP is the encoding step.\n\nThe non-obvious claim: in both domains the inspection layer is what separates a system that improves from one that drifts. Neither is about catching errors — both are about making encoding permanent.`,
    gaps: [
      'TCX\u2019s Validation Gate is argued to be a third instance but the vault lacks a side-by-side comparison of the encoding step across all three.',
      'No article yet on *when encoding should be mechanical vs. narrative* — the asymmetry between APEX (mechanical) and teaching (written) is unexplored.',
    ],
    surprise: 'Both systems handle *interface* failures (signal-to-decision, assessment-to-action) — the audit lives at the interface where translation happens, not at either endpoint. This connects to complementary-functions.',
    sources: ['nightly-audit-architecture', 'omtest-methodology', 'audit-loop', 'corroboration-architecture'],
    score: { TD: 9, SQ: 10, GH: 9, SU: 8 },
  },
  {
    q: 'What does the vault know about flow?',
    traversal: [
      { hop: 1, node: 'INDEX.md', kind: 'index', note: 'semantic lookup' },
      { hop: 2, node: 'knowledge-work-moc', kind: 'MOC', note: 'closest argumentative hub' },
    ],
    synthesis: `The vault has no dedicated article on flow. Tangentially adjacent: *session-close-ritual* mentions "preserving flow by deferring compilation to background," and the Alter-native Hiking brand uses "walk slowly" as an anti-flow stance.`,
    gaps: [
      'No concept article on flow, cognitive load, or attention.',
      'No cross-reference between teaching (student attention) and knowledge-work (maker flow) — this is a real absence.',
      'The honest answer is: this question cannot be answered from the current vault. It is a demand signal for a stub: [[flow]].',
    ],
    surprise: null,
    sources: ['knowledge-work-moc'],
    score: { TD: 6, SQ: 7, GH: 10, SU: 5 },
    isGapHeavy: true,
  },
  {
    q: 'Why does Vaultnix enforce synthesis at compile time?',
    traversal: [
      { hop: 1, node: 'INDEX.md', kind: 'index', note: 'BYOAI section' },
      { hop: 2, node: 'external-cognition', kind: 'concept', note: 'foundation' },
      { hop: 3, node: 'agent-traversal', kind: 'article', note: '4-hop target' },
      { hop: 4, node: 'compilation-skill', kind: 'skill', note: 'implementation' },
    ],
    synthesis: `Query-time synthesis puts the LLM under token pressure at the worst possible moment — while the user waits. Compile-time synthesis pre-forms the argument structure so queries traverse understanding rather than raw text. This is the entire reason the vault is agent-traversable rather than human-searchable: a human can skim; an agent under a token budget cannot.\n\nThe design commitment: **every uncomfortable thought becomes an argument on disk, once**, and from then on every query inherits that work.`,
    gaps: [
      'No measurement of compile-time cost vs. query-time savings — the claim is structural, not empirical.',
    ],
    surprise: 'This is why Vaultnix is BYOAI: the *synthesis* is the moat, not the model. Any capable LLM can traverse a well-formed graph; no model can fake one at query time.',
    sources: ['external-cognition', 'agent-traversal', 'compilation-skill'],
    score: { TD: 8, SQ: 10, GH: 7, SU: 9 },
  },
];

function AskView({ variant, style }) {
  const [input, setInput] = React.useState('');
  const [queryIdx, setQueryIdx] = React.useState(0);
  const [phase, setPhase] = React.useState('idle'); // idle | loading | traversing | done | error
  const [hopIdx, setHopIdx] = React.useState(0);
  const [showSynthesis, setShowSynthesis] = React.useState(false);
  const [honestyMode, setHonestyMode] = React.useState(true);
  const [liveResult, setLiveResult] = React.useState(null); // real API response

  // current display source: live result if available, else sample
  const current = liveResult || SAMPLE_QUERIES[queryIdx];

  const startTraversal = (result) => {
    setLiveResult(result || null);
    setPhase('traversing');
    setHopIdx(0);
    setShowSynthesis(false);
  };

  const runSample = (idx) => {
    setQueryIdx(idx);
    setLiveResult(null);
    startTraversal(null);
  };

  React.useEffect(() => {
    if (phase !== 'traversing') return;
    const src = liveResult || SAMPLE_QUERIES[queryIdx];
    if (hopIdx < src.traversal.length) {
      const t = setTimeout(() => setHopIdx(h => h + 1), 360);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setShowSynthesis(true); setPhase('done'); }, 260);
      return () => clearTimeout(t);
    }
  }, [phase, hopIdx, queryIdx, liveResult]);

  const submit = () => {
    if (!input.trim() || phase === 'loading') return;
    setPhase('loading');
    setHopIdx(0);
    setShowSynthesis(false);
    fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: input }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => {
        if (d.error) { setPhase('error'); return; }
        // Attach the query text so the display header works
        startTraversal({ ...d, q: input });
      })
      .catch(() => setPhase('error'));
  };

  return (
    <div className="ask-view" style={style}>
      {/* Honesty toggle — Mind (explicit links only) vs Library (RAG similarity) */}
      <div className="honesty-toggle-row">
        <div className="ht-label mono">HONESTY MODE</div>
        <button
          className={`ht-switch ${honestyMode ? 'mind' : 'library'}`}
          onClick={() => setHonestyMode(m => !m)}
          aria-label="Toggle between Mind (explicit) and Library (RAG similarity)"
        >
          <span className="ht-option">MIND</span>
          <span className="ht-option">LIBRARY</span>
          <span className="ht-thumb" />
        </button>
        <div className="ht-caption">
          {honestyMode
            ? <><strong>Mind</strong> · agent traverses only drawn lines. Honest about the graph.</>
            : <><strong>Library</strong> · agent may jump via semantic similarity. Faster, less honest.</>}
        </div>
      </div>

      {/* Input */}
      <div className="ask-input-row">
        <div className="ask-prompt-label">ASK VAULTNIX</div>
        <textarea
          className="ask-textarea"
          placeholder="What do you want to know from the vault?"
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
        />
        <div className="ask-input-actions">
          <div className="ask-hint">⌘↵ to traverse</div>
          <button className="ask-submit" onClick={submit} disabled={phase === 'traversing' || phase === 'loading'}>
            {phase === 'traversing' ? 'Traversing…' : phase === 'loading' ? 'Querying vault…' : 'Traverse vault →'}
          </button>
        </div>
      </div>

      {phase === 'error' && (
        <div className="ask-samples" style={{ color: 'var(--warn)' }}>
          <div className="ask-samples-label">QUERY FAILED — check API config or try a sample below</div>
        </div>
      )}

      {/* Sample queries */}
      {(phase === 'idle' || phase === 'error') && (
        <div className="ask-samples">
          <div className="ask-samples-label">— OR TRY —</div>
          {SAMPLE_QUERIES.map((q, i) => (
            <button key={i} className="ask-sample" onClick={() => { setInput(q.q); runSample(i); }}>
              <span className="ask-sample-arrow">↳</span>
              <span>{q.q}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <div className="ask-response">
          <div className="traversal-hop loading">
            <div className="hop-num">··</div>
            <div className="hop-body">
              <div className="hop-node"><span className="hop-name">searching vault · querying LLM…</span></div>
              <div className="hop-note">this takes 5–15 seconds</div>
            </div>
          </div>
        </div>
      )}

      {/* Traversal */}
      {(phase === 'traversing' || phase === 'done') && (
        <div className="ask-response">
          <div className="ask-q-display">
            <span className="ask-q-label">QUERY</span>
            <span className="ask-q-text">{current.q}</span>
            <span className={`ask-q-mode mono ${honestyMode ? 'mind' : 'library'}`}>
              {honestyMode ? 'MIND' : 'LIBRARY'}
            </span>
          </div>

          {/* Traversal path */}
          <div className="ask-section">
            <div className="ask-section-label">
              <span className="ask-dot" style={{ background: 'var(--accent)' }} />
              TRAVERSAL PATH
              <span className="ask-section-meta">{Math.min(hopIdx, current.traversal.length)} / {current.traversal.length} hops</span>
            </div>
            <div className="traversal-list">
              {current.traversal.slice(0, hopIdx).map((hop, i) => {
                const isJump = !honestyMode && i > 0 && i === current.traversal.length - 1;
                return (
                  <div key={i} className={`traversal-hop ${isJump ? 'jump' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="hop-num">{String(hop.hop).padStart(2,'0')}</div>
                    <div className="hop-body">
                      <div className="hop-node">
                        <span className={`hop-kind kind-${hop.kind}`}>{hop.kind}</span>
                        <span className="hop-name">[[{hop.node}]]</span>
                        {isJump && <span className="hop-jump-tag mono">⤵ similarity jump</span>}
                      </div>
                      <div className="hop-note">{hop.note}</div>
                    </div>
                  </div>
                );
              })}
              {phase === 'traversing' && hopIdx < current.traversal.length && (
                <div className="traversal-hop loading">
                  <div className="hop-num">··</div>
                  <div className="hop-body">
                    <div className="hop-node"><span className="hop-name">traversing…</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Synthesis */}
          {showSynthesis && (
            <div className="ask-section fade-in">
              <div className="ask-section-label">
                <span className="ask-dot" style={{ background: 'var(--sage)' }} />
                SYNTHESIS
              </div>
              <div className="synthesis-body">
                {current.synthesis.split('\n\n').map((para, i) => (
                  <p key={i}>{renderInline(para)}</p>
                ))}
              </div>
            </div>
          )}

          {/* Gap honesty */}
          {showSynthesis && (
            <div className="ask-section fade-in" style={{ animationDelay: '180ms' }}>
              <div className="ask-section-label">
                <span className="ask-dot" style={{ background: current.isGapHeavy ? 'var(--warn)' : 'var(--muted)' }} />
                GAP HONESTY
                {current.isGapHeavy && <span className="ask-section-meta warn">vault cannot fully answer</span>}
              </div>
              <ul className="gaps-list">
                {current.gaps.map((g, i) => (
                  <li key={i}>{renderInline(g)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Surprise */}
          {showSynthesis && current.surprise && (
            <div className="ask-section fade-in" style={{ animationDelay: '320ms' }}>
              <div className="ask-section-label">
                <span className="ask-dot" style={{ background: 'var(--accent)' }} />
                SURPRISE
                <span className="ask-section-meta">the thing you didn't ask</span>
              </div>
              <div className="surprise-body">{renderInline(current.surprise)}</div>
            </div>
          )}

          {/* Score footer */}
          {showSynthesis && (
            <div className="ask-section fade-in" style={{ animationDelay: '460ms' }}>
              <div className="score-footer">
                <div className="score-label">BENCHMARK SCORE</div>
                <div className="score-cells">
                  {Object.entries(current.score).map(([k, v]) => (
                    <div key={k} className="score-cell">
                      <div className="score-k">{k}</div>
                      <div className="score-v">{v}<span className="score-max">/10</span></div>
                      <div className="score-bar"><div className="score-bar-fill" style={{ width: `${v*10}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="score-hint">TD traversal · SQ synthesis · GH gap honesty · SU surprise</div>
              </div>
              <div className="ask-actions-row">
                <button className="ask-action" onClick={() => { setPhase('idle'); setInput(''); setLiveResult(null); }}>← new query</button>
                <button className="ask-action secondary">save as note</button>
                <button className="ask-action secondary">export path</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple inline markdown: **bold**, [[wikilink]]
function renderInline(text) {
  const parts = [];
  let rest = text;
  let key = 0;
  const re = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/;
  while (rest) {
    const m = rest.match(re);
    if (!m) { parts.push(rest); break; }
    if (m.index > 0) parts.push(rest.slice(0, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={key++}>{tok.slice(2,-2)}</strong>);
    } else {
      parts.push(<span key={key++} className="wikilink">{tok.slice(2,-2)}</span>);
    }
    rest = rest.slice(m.index + tok.length);
  }
  return parts;
}

Object.assign(window, { AskView, SAMPLE_QUERIES });
