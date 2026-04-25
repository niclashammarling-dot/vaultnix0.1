// MEM1 — Mode A (Work / Builder) sub-modes: Ingest, Agenda, Inspection.

const { DOMAINS, CONCEPTS } = window.MEM1_DATA;

// ─── INGEST ─────────────────────────────────────────────────────────────────
function IngestView() {
  const [text, setText] = React.useState('');
  const [domain, setDomain] = React.useState('knowledge-work');
  const [status, setStatus] = React.useState('idle'); // idle | submitting | committed | error
  const [commitResult, setCommitResult] = React.useState(null);
  const isIdea = text.trim().toLowerCase().startsWith('idea.');

  const submit = () => {
    if (!text.trim()) return;
    setStatus('submitting');
    fetch('/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, domain }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setStatus('error'); return; }
        setCommitResult(d);
        setStatus('committed');
      })
      .catch(() => setStatus('error'));
  };

  const recent = [
    { time: '10:10', sha: 'a4f2e81', domain: 'knowledge-work', bytes: 5978, excerpt: 'MEM1 compile ran — spreading activation hit 5 articles, one orphan surfaced.', queue: 'compile' },
    { time: '12:43', sha: 'c8f1d22', domain: 'apex', bytes: 7422, excerpt: 'Gate chain restructuring: 4th gate ordered before volatility check. Swapped.', queue: 'compile' },
    { time: '13:12', sha: 'ba19e04', domain: 'teaching', bytes: 7757, excerpt: 'Legilexi retest revealed M4 for 3 students previously M1.', queue: 'compile' },
    { time: '19:46', sha: '4d2b1a7', domain: 'general/ideas', bytes: 318, excerpt: 'idea. MEM1 could expose a "surprise" slot in query responses.', queue: 'review' },
  ];

  return (
    <div className="work-view ingest">
      <div className="work-head">
        <div className="work-head-left">
          <div className="work-kicker">A · INGEST</div>
          <h1 className="work-title">raw/ingest</h1>
          <div className="work-path">writes → <span className="mono">niclashammarling-dot/Vaultnix:raw/{isIdea ? 'general/ideas' : domain}/</span></div>
        </div>
        <div className="work-head-stats">
          <div className="whs-cell"><div className="whs-k">QUEUE</div><div className="whs-v">3</div><div className="whs-sub">pending compile</div></div>
          <div className="whs-cell"><div className="whs-k">IDEAS</div><div className="whs-v">1</div><div className="whs-sub">awaiting review</div></div>
          <div className="whs-cell"><div className="whs-k">TODAY</div><div className="whs-v">21.5k</div><div className="whs-sub">bytes captured</div></div>
        </div>
      </div>

      <div className="ingest-grid">
        <div className="ingest-main">
          <div className="panel-kicker">CAPTURE · {isIdea ? 'ROUTE: IDEA (NO COMPILE)' : 'ROUTE: ' + domain.toUpperCase()}</div>

          <div className="work-domain-row">
            {DOMAINS.map(d => (
              <button key={d.id} className={`chip ${domain === d.id ? 'active' : ''}`} onClick={() => setDomain(d.id)}>{d.label}</button>
            ))}
            <button className={`chip ${domain === 'general' ? 'active' : ''}`} onClick={() => setDomain('general')}>general</button>
          </div>

          <textarea
            className="work-textarea"
            placeholder={`What happened? What did you decide?\nStart with "idea." to route to raw/general/ideas/ (review-later, no compile).`}
            value={text}
            onChange={e => { setText(e.target.value); setStatus('idle'); }}
            rows={14}
          />

          <div className="work-footer-bar">
            <div className="mono-label">
              {text.length} B · {text.trim().split(/\s+/).filter(Boolean).length} W · {isIdea ? 'ROUTE: idea' : 'ROUTE: ' + domain}
            </div>
            <div className="work-footer-actions">
              <button className="btn-ghost" onClick={() => setText('')}>clear</button>
              <button className="btn-primary" onClick={submit} disabled={!text.trim() || status === 'submitting'}>
                {status === 'submitting' ? 'committing…' : status === 'committed' ? '✓ committed' : status === 'error' ? 'retry →' : 'commit →'}
              </button>
            </div>
          </div>

          {status === 'committed' && commitResult && (
            <div className="work-success">
              <span className="mono-label">COMMITTED · 02:00 UTC COMPILE</span>
              <div>raw/{commitResult.domain}/{commitResult.filename}</div>
            </div>
          )}
          {status === 'error' && (
            <div className="work-success" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
              <span className="mono-label">COMMIT FAILED — check env vars</span>
            </div>
          )}
        </div>

        <div className="ingest-sidebar">
          <div className="panel-kicker">INGEST LOG · TODAY</div>
          <div className="ingest-log">
            {recent.map((r, i) => (
              <div key={i} className="ingest-log-row">
                <div className="il-time mono">{r.time}</div>
                <div className="il-sha mono">{r.sha}</div>
                <div className="il-path mono">raw/{r.domain}/ · {r.bytes}B</div>
                <div className="il-excerpt">{r.excerpt}</div>
                <div className={`il-queue il-queue-${r.queue}`}>{r.queue}</div>
              </div>
            ))}
          </div>
          <div className="panel-divider" />
          <div className="panel-kicker">NEXT COMPILE</div>
          <div className="next-compile">
            <div className="nc-clock mono">02:00:00 UTC · in 6h 34m</div>
            <div className="nc-desc">3 raw files → structured articles · spreading activation · hook enforcement</div>
            <button className="btn-ghost" style={{ width: '100%', marginTop: 10 }}>trigger manual compile</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AGENDA (Stub list) ─────────────────────────────────────────────────────
function AgendaView() {
  const [sort, setSort] = React.useState('score');
  const [selected, setSelected] = React.useState(0);

  const STUBS = [
    { id: 'surfacing-skill', inbound: 7, domains: ['apex','tcx','teaching','knowledge-work'], moc: 4, age: 12, score: 94, reason: 'Behavioral counterpart to the no-gap principle. Referenced by 7 articles; no parent article. Cross-domain reach: 4.' },
    { id: 'moc-as-argument', inbound: 5, domains: ['knowledge-work'], moc: 1, age: 28, score: 86, reason: 'Self-referential: the vault contains MOCs but no article defining what distinguishes an argumentative MOC from a catalog.' },
    { id: 'query-invisible-articles', inbound: 4, domains: ['knowledge-work'], moc: 1, age: 5, score: 81, reason: 'Structurally graph-healthy but unreachable via any enforcement layer. Confirmed first instance: observability.md.' },
    { id: 'flow', inbound: 3, domains: ['knowledge-work','teaching','hiking'], moc: 3, age: 41, score: 78, reason: 'Referenced tangentially in session-close-ritual and hiking brand; no concept article. Cross-domain reach: 3.' },
    { id: 'regime-bayes-likelihood-ratio', inbound: 4, domains: ['apex'], moc: 1, age: 8, score: 72, reason: 'The formal mathematics behind the regime chain. Stub has accumulated 4 inbound links from gate-chain articles.' },
    { id: 'lock-leading-corroboration', inbound: 3, domains: ['apex'], moc: 1, age: 14, score: 68, reason: '2-of-4 corroboration pattern; referenced in corroboration-architecture but never expanded.' },
    { id: 'backlink-architecture', inbound: 3, domains: ['knowledge-work'], moc: 1, age: 32, score: 64, reason: 'Inbound links as the graph\'s immune system. Stub remains open.' },
    { id: 'file-over-app', inbound: 2, domains: ['knowledge-work'], moc: 1, age: 55, score: 58, reason: 'Inspectability and portability as non-negotiable.' },
  ];

  const sorted = [...STUBS].sort((a,b) => sort === 'score' ? b.score - a.score : sort === 'age' ? b.age - a.age : b.inbound - a.inbound);
  const sel = sorted[selected];

  return (
    <div className="work-view agenda">
      <div className="work-head">
        <div className="work-head-left">
          <div className="work-kicker">A · STRATEGIC AGENDA</div>
          <h1 className="work-title">stubs/</h1>
          <div className="work-path">the vault's honest statement of what it needs next · <span className="mono">19 open · 4 high-priority</span></div>
        </div>
        <div className="work-head-stats">
          <div className="whs-cell"><div className="whs-k">OPEN</div><div className="whs-v">19</div></div>
          <div className="whs-cell"><div className="whs-k">SCORE≥80</div><div className="whs-v">4</div></div>
          <div className="whs-cell"><div className="whs-k">OLDEST</div><div className="whs-v">55d</div></div>
        </div>
      </div>

      <div className="agenda-controls">
        <span className="mono-label">SORT</span>
        {['score','inbound','age'].map(s => (
          <button key={s} className={`chip ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>{s}</button>
        ))}
      </div>

      <div className="agenda-grid">
        <div className="stubs-table">
          <div className="stubs-row stubs-head">
            <div>STUB</div><div>SCORE</div><div>INBOUND</div><div>DOMAINS</div><div>AGE</div>
          </div>
          {sorted.map((s, i) => (
            <button key={s.id} className={`stubs-row ${i === selected ? 'selected' : ''}`} onClick={() => setSelected(i)}>
              <div className="sr-id">
                <span className="stub-pill">stub</span>
                <span className="wikilink">[[{s.id}]]</span>
              </div>
              <div className="sr-score">
                <div className="score-gauge"><div style={{ width: `${s.score}%` }} /></div>
                <span className="mono">{s.score}</span>
              </div>
              <div className="mono">{s.inbound}</div>
              <div className="sr-doms">{s.domains.map(d => <span key={d} className="sr-dom-chip">{d}</span>)}</div>
              <div className="mono">{s.age}d</div>
            </button>
          ))}
        </div>

        <div className="stub-detail">
          <div className="panel-kicker">SELECTED · {sel.id}</div>
          <div className="sd-reason">{sel.reason}</div>

          <div className="sd-section">
            <div className="mono-label">SCORING</div>
            <div className="sd-scoring">
              <div className="sd-score-row"><span>Inbound links</span><span className="mono">{sel.inbound}</span><div className="score-bar-mini"><div style={{ width: `${sel.inbound*14}%` }} /></div></div>
              <div className="sd-score-row"><span>Cross-domain reach</span><span className="mono">{sel.domains.length}</span><div className="score-bar-mini"><div style={{ width: `${sel.domains.length*25}%` }} /></div></div>
              <div className="sd-score-row"><span>MOC alignment</span><span className="mono">{sel.moc}</span><div className="score-bar-mini"><div style={{ width: `${sel.moc*25}%` }} /></div></div>
              <div className="sd-score-row"><span>Synthesis potential</span><span className="mono">{Math.round(sel.score/10)}/10</span><div className="score-bar-mini"><div style={{ width: `${sel.score}%` }} /></div></div>
            </div>
          </div>

          <div className="sd-section">
            <div className="mono-label">INBOUND FROM</div>
            <ul className="sd-inbound">
              <li><span className="wikilink">[[honesty]]</span><span className="sd-ctx">"the behavioral counterpart to the no-gap principle"</span></li>
              <li><span className="wikilink">[[incident-learning-ritual]]</span><span className="sd-ctx">"closest existing instance"</span></li>
              <li><span className="wikilink">[[tcx-moc]]</span><span className="sd-ctx">"agents surface uncertainty, but skill is implicit"</span></li>
            </ul>
          </div>

          <div className="sd-actions">
            <button className="btn-primary">promote to draft →</button>
            <button className="btn-ghost">defer</button>
            <button className="btn-ghost">merge into…</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INSPECTION (Compile diff review) ───────────────────────────────────────
function InspectionView() {
  const [selectedFile, setSelectedFile] = React.useState(0);

  const FILES = [
    { path: 'wiki/_concepts/corroboration-architecture.md', status: 'new', lines: [185, 0], kind: 'concept' },
    { path: 'wiki/_concepts/bayesian-inference.md', status: 'new', lines: [212, 0], kind: 'concept' },
    { path: 'wiki/_concepts/honesty.md', status: 'modified', lines: [14, 3], kind: 'concept' },
    { path: 'wiki/apex/audit-pipeline-completeness-check18.md', status: 'modified', lines: [6, 2], kind: 'article' },
    { path: 'wiki/_mocs/apex-moc.md', status: 'modified', lines: [3, 1], kind: 'MOC' },
  ];

  const ACTIVATIONS = [
    { from: 'corroboration-architecture', to: 'complementary-functions', relation: 'distinct-from', rationale: 'Agreement-before-action vs. coexistence.' },
    { from: 'corroboration-architecture', to: 'lock-leading', relation: 'instance-of', rationale: '2-of-4 corroboration pattern in APEX.' },
    { from: 'bayesian-inference', to: 'regime-matrix', relation: 'grounds', rationale: 'Prior × likelihood → posterior formalism underlying regime-bayes-lr.' },
    { from: 'bayesian-inference', to: 'observability', relation: 'operationalizes', rationale: 'Update degree-of-belief via inspection layer.' },
    { from: 'honesty', to: 'surfacing-skill', relation: 'demands', rationale: 'Behavioral counterpart stub.' },
  ];

  const HOOKS = [
    { name: 'graph:no-orphans', status: 'pass', note: '0 orphans' },
    { name: 'graph:4-hop-reachability', status: 'pass', note: 'worst: surfacing-skill @ 3 hops' },
    { name: 'struct:frontmatter-complete', status: 'pass', note: '5/5 files' },
    { name: 'quality:spreading-activation≥3', status: 'warn', note: 'honesty.md: 2 new activations (soft floor 3)' },
    { name: 'quality:moc-referenced', status: 'fail', note: 'apex-moc.md: 1 article unreferenced (sector-grid)' },
    { name: 'struct:no-bare-references', status: 'pass', note: '0 bare references' },
  ];

  const DELTAS = [
    { concept: 'honesty', from: 'stub', to: 'article', basis: '3 raw/ sources, 7 inbound links, 2 MOCs', confidence: 0.91 },
    { concept: 'surfacing-skill', from: 'unknown', to: 'stub', basis: 'flagged by honesty.md as behavioral counterpart', confidence: 0.78 },
    { concept: 'corroboration-architecture', from: 'unknown', to: 'concept', basis: 'synthesis of 4 raw/ entries across APEX + TCX', confidence: 0.88 },
  ];

  const sel = FILES[selectedFile];

  return (
    <div className="work-view inspection">
      <div className="work-head">
        <div className="work-head-left">
          <div className="work-kicker">A · INSPECTION GATE</div>
          <h1 className="work-title">compile/2026-04-23-0200</h1>
          <div className="work-path">raw/ → wiki/ · <span className="mono">5 files · +417 / −6 lines · 5 spreading activations · 1 hook warn</span></div>
        </div>
        <div className="work-head-stats">
          <div className="whs-cell pass"><div className="whs-k">HOOKS</div><div className="whs-v">5/6</div><div className="whs-sub">1 soft warn</div></div>
          <div className="whs-cell"><div className="whs-k">ACTIVATIONS</div><div className="whs-v">5</div></div>
          <div className="whs-cell pending"><div className="whs-k">STATUS</div><div className="whs-v">REVIEW</div><div className="whs-sub">awaiting approval</div></div>
        </div>
      </div>

      {/* Classification deltas — re-classifications needing approval */}
      <div className="inspection-deltas">
        <div className="panel-kicker">CLASSIFICATION DELTAS · {DELTAS.length}</div>
        <div className="deltas-list">
          {DELTAS.map((d, i) => (
            <div key={i} className="delta-row">
              <div className="delta-concept wikilink">[[{d.concept}]]</div>
              <div className="delta-transition">
                <span className={`delta-pill from-${d.from}`}>{d.from}</span>
                <span className="delta-arrow">→</span>
                <span className={`delta-pill to-${d.to}`}>{d.to}</span>
              </div>
              <div className="delta-basis">{d.basis}</div>
              <div className="delta-conf mono">{d.confidence.toFixed(2)}</div>
              <div className="delta-actions">
                <button className="mini-btn approve">✓</button>
                <button className="mini-btn reject">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fail-loud alert — silence means clean */}
      <div className="fail-loud-alert">
        <div className="fla-icon">■</div>
        <div className="fla-body">
          <div className="fla-title">hook <span className="mono">quality:moc-referenced</span> FAILED — inspect before proceeding</div>
          <div className="fla-detail">
            <span className="wikilink broken">[[apex-moc]]</span> no longer references
            <span className="wikilink broken"> [[sector-grid]]</span>. The MOC is broken until a human re-establishes the link or removes the article.
          </div>
        </div>
        <button className="mini-btn">open MOC</button>
      </div>

      {/* Hook enforcement panel */}
      <div className="inspection-hooks">
        <div className="panel-kicker">HOOK ENFORCEMENT</div>
        <div className="hooks-grid">
          {HOOKS.map(h => (
            <div key={h.name} className={`hook-cell hook-${h.status}`}>
              <div className="hook-status-dot" />
              <div className="hook-name mono">{h.name}</div>
              <div className="hook-note">{h.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="inspection-grid">
        {/* File list */}
        <div className="inspection-files">
          <div className="panel-kicker">FILES · 5</div>
          <div className="file-list">
            {FILES.map((f, i) => (
              <button key={f.path} className={`file-row ${i === selectedFile ? 'selected' : ''} file-${f.status}`} onClick={() => setSelectedFile(i)}>
                <span className={`file-status file-status-${f.status}`}>{f.status === 'new' ? 'NEW' : 'MOD'}</span>
                <span className="file-path mono">{f.path.replace('wiki/','')}</span>
                <span className="file-lines mono">
                  {f.lines[0] > 0 && <span className="lines-add">+{f.lines[0]}</span>}
                  {f.lines[1] > 0 && <span className="lines-del">−{f.lines[1]}</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="panel-divider" />
          <div className="panel-kicker">ACTIVATIONS · 5</div>
          <div className="activations-list">
            {ACTIVATIONS.map((a, i) => (
              <div key={i} className="activation-row">
                <div className="act-edge">
                  <span className="wikilink">[[{a.from}]]</span>
                  <span className="act-relation mono">—{a.relation}→</span>
                  <span className="wikilink">[[{a.to}]]</span>
                </div>
                <div className="act-rationale">{a.rationale}</div>
                <div className="act-actions">
                  <button className="mini-btn approve">✓</button>
                  <button className="mini-btn reject">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diff view */}
        <div className="inspection-diff">
          <div className="diff-head">
            <span className={`file-status file-status-${sel.status}`}>{sel.status.toUpperCase()}</span>
            <span className="mono diff-path">{sel.path}</span>
            <div className="diff-actions">
              <button className="mini-btn approve">approve</button>
              <button className="mini-btn reject">reject</button>
              <button className="mini-btn">edit</button>
            </div>
          </div>
          <div className="diff-body">
            <DiffLine n="1" t="frontmatter" text="---" />
            <DiffLine n="2" text="title: Corroboration Architecture" />
            <DiffLine n="3" text="type: concept" />
            <DiffLine n="4" text="projects: [apex, tcx, knowledge-work]" />
            <DiffLine n="5" text="tags: [concept, design-pattern]" />
            <DiffLine n="6" text="date: 2026-04-23" />
            <DiffLine n="7" text="related:" />
            <DiffLine n="8" text="  - [[complementary-functions]]" add />
            <DiffLine n="9" text="  - [[lock-leading]]" add />
            <DiffLine n="10" text="  - [[tcx-inspector]]" add />
            <DiffLine n="11" text="---" />
            <DiffLine n="12" text="" />
            <DiffLine n="13" t="h2" text="## The Argument" />
            <DiffLine n="14" text="" />
            <DiffLine n="15" text="Corroboration architecture is the design pattern of requiring" add />
            <DiffLine n="16" text="agreement from multiple independent checks before consequential" add />
            <DiffLine n="17" text="action. Each additional independent check multiplies required" add />
            <DiffLine n="18" text="corroboration, reducing false positives multiplicatively." add />
            <DiffLine n="19" text="" add />
            <DiffLine n="20" text="Distinct from [[complementary-functions]] — this is specifically" add />
            <DiffLine n="21" text="an agreement-before-action protocol." add />
            <DiffLine n="22" text="" add />
            <DiffLine n="23" t="h2" text="## Instances" />
            <DiffLine n="24" text="" add />
            <DiffLine n="25" text="- APEX two-layer audit (mechanical + LLM)" add />
            <DiffLine n="26" text="- TCX Inspector (5-dimension validation)" add />
            <DiffLine n="27" text="- Vault hook enforcement (structural + graph + quality)" add />
            <DiffLine n="28" text="- Lock Leading (2-of-4)" add />
            <div className="diff-more mono">… 157 more lines (expand)</div>
          </div>
        </div>
      </div>

      <div className="inspection-footer">
        <div className="if-summary">
          <span className="mono-label">COMPILE SUMMARY</span>
          <span>5 files reviewed · 0 rejected · 0 edits · 1 soft warn unresolved</span>
        </div>
        <div className="if-actions">
          <button className="btn-ghost">reject all · rerun compile</button>
          <button className="btn-primary">approve compile → commit to wiki/</button>
        </div>
      </div>
    </div>
  );
}

function DiffLine({ n, text, add, del, t }) {
  return (
    <div className={`diff-line ${add ? 'diff-add' : ''} ${del ? 'diff-del' : ''}`}>
      <span className="diff-n mono">{n}</span>
      <span className="diff-sign mono">{add ? '+' : del ? '−' : ' '}</span>
      <span className={`diff-text mono ${t === 'h2' ? 'diff-h2' : ''}`}>{text}</span>
    </div>
  );
}

// ─── IDEAS (Actionable backlog) ─────────────────────────────────────────────
function IdeasView({ go }) {
  const [ideas, setIdeas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    fetch('/api/ideas')
      .then(r => r.ok ? r.json() : { ideas: [] })
      .then(d => { setIdeas(d.ideas || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sel = ideas[selected];

  return (
    <div className="work-view agenda">
      <div className="work-head">
        <div className="work-head-left">
          <div className="work-kicker">A · IDEAS</div>
          <h1 className="work-title">ideas/</h1>
          <div className="work-path">actionable backlog · <span className="mono">wiki/domains/general/ideas/</span></div>
        </div>
        <div className="work-head-stats">
          <div className="whs-cell"><div className="whs-k">OPEN</div><div className="whs-v">{loading ? '…' : ideas.filter(i => i.status === 'active').length}</div></div>
          <div className="whs-cell"><div className="whs-k">NEWEST</div><div className="whs-v">{loading ? '…' : ideas[0]?.date?.slice(5) || '—'}</div></div>
        </div>
      </div>

      {loading && (
        <div className="mono-label" style={{ padding: '2rem 0' }}>Loading ideas…</div>
      )}

      {!loading && ideas.length === 0 && (
        <div className="mono-label" style={{ padding: '2rem 0', color: 'var(--fg-soft)' }}>No ideas yet — capture one in Ingest with "idea." prefix.</div>
      )}

      {!loading && ideas.length > 0 && (
        <div className="agenda-grid">
          <div className="stubs-table">
            <div className="stubs-row stubs-head">
              <div>IDEA</div><div>STATUS</div><div>DATE</div>
            </div>
            {ideas.map((idea, i) => (
              <button key={idea.slug} className={`stubs-row ${i === selected ? 'selected' : ''}`} onClick={() => setSelected(i)}>
                <div className="sr-id">
                  <span className="stub-pill" style={{ background: 'var(--accent-2, #2a3a2a)', color: 'var(--accent-fg, #8fbc8f)' }}>idea</span>
                  <span className="wikilink">{idea.title}</span>
                </div>
                <div><span className={`il-queue il-queue-${idea.status === 'active' ? 'review' : 'compile'}`}>{idea.status}</span></div>
                <div className="mono" style={{ fontSize: '11px' }}>{idea.date}</div>
              </button>
            ))}
          </div>

          {sel && (
            <div className="stub-detail">
              <div className="panel-kicker">SELECTED · {sel.slug}</div>
              <div className="sd-reason">{sel.summary}</div>

              {sel.tags.length > 0 && (
                <div className="sd-section">
                  <div className="mono-label">TAGS</div>
                  <div className="sr-doms" style={{ marginTop: '0.5rem' }}>
                    {sel.tags.map(t => <span key={t} className="sr-dom-chip">{t}</span>)}
                  </div>
                </div>
              )}

              {sel.openQs.length > 0 && (
                <div className="sd-section">
                  <div className="mono-label">OPEN QUESTIONS</div>
                  <ul className="sd-inbound" style={{ marginTop: '0.5rem' }}>
                    {sel.openQs.map((q, i) => <li key={i}><span className="sd-ctx">{q.replace(/^- /, '')}</span></li>)}
                  </ul>
                </div>
              )}

              <div className="sd-actions">
                <button className="btn-primary" onClick={() => go('article', null, sel.path)}>open article →</button>
                <button className="btn-ghost">mark complete</button>
                <button className="btn-ghost">retire</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── USE mode sub-modes: Navigator (visual map), Lens (MOC-scoped query) ────
function NavigatorView({ go }) {
  const [activeConcept, setActiveConcept] = React.useState('honesty');
  const activeC = CONCEPTS.find(c => c.id === activeConcept);

  return (
    <div className="use-view navigator">
      <div className="use-head">
        <div className="use-kicker">B · NAVIGATOR</div>
        <h1 className="use-title">The small-world network.</h1>
        <p className="use-sub">Click a concept to trace its cross-domain reach. Concepts closer to center bridge more domains — these are the graph's shortcuts.</p>
      </div>

      <div className="navigator-grid">
        <div className="navigator-canvas">
          <GraphOverlay concepts={CONCEPTS} domains={DOMAINS} activeConceptId={activeConcept} onSelect={setActiveConcept} />
        </div>
        <div className="navigator-detail">
          <div className="nd-kicker">SELECTED CONCEPT</div>
          <h2 className="nd-title">{activeC.label}</h2>
          <div className="nd-stats">
            <span><em>{activeC.domains.length}</em> domains</span>
            <span><em>{activeC.weight}</em> weight</span>
          </div>
          <div className="nd-domains">
            {activeC.domains.map(dId => {
              const d = DOMAINS.find(x => x.id === dId);
              return (
                <button key={dId} className="nd-domain-btn" onClick={() => go('lens', dId)}>
                  <span className="nd-dom-label">{d.label}</span>
                  <span className="nd-dom-kind">{d.kind}</span>
                  <span className="nd-dom-arrow">→</span>
                </button>
              );
            })}
          </div>
          <div className="nd-actions">
            <button className="btn-ghost" onClick={() => go('article')}>read [[{activeC.id}]] →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LensView({ domainId, go }) {
  const d = DOMAINS.find(x => x.id === domainId) || DOMAINS[4];
  const [q, setQ] = React.useState('');
  const [phase, setPhase] = React.useState('idle'); // idle | loading | done | error
  const [result, setResult] = React.useState(null);

  const submit = () => {
    if (!q.trim() || phase === 'loading') return;
    const fullQ = `Through the lens of ${d.label}: ${q}`;
    setPhase('loading');
    setResult(null);
    fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: fullQ }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setResult(d); setPhase('done'); })
      .catch(() => setPhase('error'));
  };

  const [domainArticles, setDomainArticles] = React.useState([]);

  React.useEffect(() => {
    setPhase('idle');
    setResult(null);
    setQ('');
    setDomainArticles([]);
    fetch(`/api/articles?domain=${encodeURIComponent(d.id)}`)
      .then(r => r.ok ? r.json() : { articles: [] })
      .then(data => setDomainArticles(data.articles || []))
      .catch(() => {});
  }, [domainId]);

  return (
    <div className="use-view lens">
      <div className="use-head">
        <div className="use-kicker">B · LENS · {d.label.toUpperCase()}</div>
        <h1 className="use-title">Through the lens of <em>{d.label}</em>.</h1>
        <p className="use-sub">{d.arg}</p>
        <div className="lens-selector">
          <span className="mono-label">SWITCH LENS</span>
          {DOMAINS.map(dd => (
            <button key={dd.id} className={`chip ${dd.id === d.id ? 'active' : ''}`} onClick={() => go('lens', dd.id)}>{dd.label}</button>
          ))}
        </div>
      </div>

      <div className="lens-body">
        <div className="lens-query">
          <div className="mono-label">ASK THROUGH THIS LENS</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <input
              className="lens-input"
              style={{ flex: 1 }}
              placeholder={`What would ${d.label} say about…?`}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            />
            <button className="btn-primary" onClick={submit} disabled={!q.trim() || phase === 'loading'} style={{ whiteSpace: 'nowrap' }}>
              {phase === 'loading' ? 'Querying…' : 'Ask →'}
            </button>
          </div>
        </div>

        {phase === 'done' && result && (
          <div className="lens-result">
            <div className="panel-kicker">SYNTHESIS</div>
            <div className="lens-synthesis">{result.synthesis}</div>
            {result.gaps && result.gaps.length > 0 && (
              <>
                <div className="panel-kicker" style={{ marginTop: '1.5rem' }}>GAP HONESTY</div>
                <ul className="gaps-list">
                  {result.gaps.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </>
            )}
            {result.surprise && (
              <>
                <div className="panel-kicker" style={{ marginTop: '1.5rem' }}>SURPRISE</div>
                <div className="lens-synthesis">{result.surprise}</div>
              </>
            )}
            <button className="btn-ghost" style={{ marginTop: '1rem' }} onClick={() => { setPhase('idle'); setResult(null); }}>← new question</button>
          </div>
        )}
        {phase === 'error' && (
          <div className="lens-result" style={{ color: 'var(--warn)' }}>Query failed — check API config.</div>
        )}

        <div className="panel-kicker" style={{ marginTop: '2rem' }}>ARTICLES IN {d.label.toUpperCase()}</div>
        <div className="lens-articles">
          {domainArticles.length === 0 && (
            <div style={{ color: 'var(--fg-soft)', fontFamily: 'var(--mono)', fontSize: '12px', padding: '0.5rem 0' }}>
              Loading…
            </div>
          )}
          {domainArticles.map(a => (
            <button key={a.path} className="article-list-item" onClick={() => go('article', null, a.path)}>
              <div className="ali-title">{a.title}</div>
              <div className="ali-path">{a.path}</div>
              <div className="ali-arrow">↗</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { IngestView, IdeasView, AgendaView, InspectionView, NavigatorView, LensView });
