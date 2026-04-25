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
  const [stubs, setStubs] = React.useState([]);
  const [lintDate, setLintDate] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/stubs')
      .then(r => r.ok ? r.json() : { stubs: [] })
      .then(d => { setStubs(d.stubs || []); setLintDate(d.lintDate || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...stubs].sort((a,b) => sort === 'score' ? b.score - a.score : b.inbound - a.inbound);
  const sel = sorted[selected];

  const highPriority = stubs.filter(s => s.score >= 70).length;

  return (
    <div className="work-view agenda">
      <div className="work-head">
        <div className="work-head-left">
          <div className="work-kicker">A · STRATEGIC AGENDA</div>
          <h1 className="work-title">stubs/</h1>
          <div className="work-path">the vault's honest statement of what it needs next · <span className="mono">{lintDate ? `lint: ${lintDate}` : 'loading…'}</span></div>
        </div>
        <div className="work-head-stats">
          <div className="whs-cell"><div className="whs-k">OPEN</div><div className="whs-v">{loading ? '…' : stubs.length}</div></div>
          <div className="whs-cell"><div className="whs-k">HIGH-PRI</div><div className="whs-v">{loading ? '…' : highPriority}</div></div>
        </div>
      </div>

      {loading && <div className="mono-label" style={{ padding: '2rem 0' }}>Loading stubs from lint…</div>}

      {!loading && stubs.length === 0 && (
        <div className="mono-label" style={{ padding: '2rem 0', color: 'var(--fg-soft)' }}>No stubs found in latest lint report.</div>
      )}

      {!loading && stubs.length > 0 && (
        <>
          <div className="agenda-controls">
            <span className="mono-label">SORT</span>
            {['score','inbound'].map(s => (
              <button key={s} className={`chip ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>{s}</button>
            ))}
          </div>

          <div className="agenda-grid">
            <div className="stubs-table">
              <div className="stubs-row stubs-head">
                <div>STUB</div><div>SCORE</div><div>INBOUND</div><div>DOMAINS</div>
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
                </button>
              ))}
            </div>

            {sel && (
              <div className="stub-detail">
                <div className="panel-kicker">SELECTED · {sel.id}</div>
                <div className="sd-reason">{sel.description}</div>

                <div className="sd-section">
                  <div className="mono-label">SCORING</div>
                  <div className="sd-scoring">
                    <div className="sd-score-row"><span>Inbound links</span><span className="mono">{sel.inbound}</span><div className="score-bar-mini"><div style={{ width: `${Math.min(100, sel.inbound * 7)}%` }} /></div></div>
                    <div className="sd-score-row"><span>Cross-domain reach</span><span className="mono">{sel.domains.length}</span><div className="score-bar-mini"><div style={{ width: `${sel.domains.length * 25}%` }} /></div></div>
                    <div className="sd-score-row"><span>Score</span><span className="mono">{sel.score}/100</span><div className="score-bar-mini"><div style={{ width: `${sel.score}%` }} /></div></div>
                  </div>
                </div>

                <div className="sd-actions">
                  <button className="btn-primary">promote to draft →</button>
                  <button className="btn-ghost">defer</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── INSPECTION (raw/ viewer + vault health) ────────────────────────────────
function InspectionView() {
  const [data, setData]               = React.useState(null);
  const [loading, setLoading]         = React.useState(true);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [fileContent, setFileContent] = React.useState(null);
  const [contentLoading, setContentLoading] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/inspection')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const files = data?.files || [];
  const hooks = data?.hooks || [];
  const sel   = files[selectedIdx];

  React.useEffect(() => {
    if (!sel) return;
    setFileContent(null);
    setContentLoading(true);
    fetch(`/api/file?path=${encodeURIComponent(sel.path)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setFileContent(d?.content || null); setContentLoading(false); })
      .catch(() => setContentLoading(false));
  }, [sel?.path]);

  const failCount = hooks.filter(h => h.status === 'fail').length;
  const warnCount = hooks.filter(h => h.status === 'warn').length;
  const pending   = files.filter(f => f.status === 'pending').length;

  // Mock activations — will be wired to real compile data in a future step
  const ACTIVATIONS = [
    { from: 'ideas-prefix-routing', to: 'compilation-skill', relation: 'updates', rationale: 'Routing rule added for idea. prefix.' },
    { from: 'vault-capture-tab-category', to: 'capture-interface-design-constraints', relation: 'refines', rationale: 'Category selector closes the domain-routing gap at intake.' },
  ];

  return (
    <div className="work-view inspection">
      <div className="work-head">
        <div className="work-head-left">
          <div className="work-kicker">A · INSPECTION GATE</div>
          <h1 className="work-title">raw/</h1>
          <div className="work-path">
            {loading ? 'loading…' : <span className="mono">{files.length} files · {pending} pending compile · lint: {data?.lintDate || '—'}</span>}
          </div>
        </div>
        <div className="work-head-stats">
          <div className={`whs-cell ${failCount > 0 ? 'fail' : warnCount > 0 ? '' : 'pass'}`}>
            <div className="whs-k">HOOKS</div>
            <div className="whs-v">{loading ? '…' : `${hooks.filter(h=>h.status==='pass').length}/${hooks.length}`}</div>
            <div className="whs-sub">{failCount > 0 ? `${failCount} fail` : warnCount > 0 ? `${warnCount} warn` : 'all pass'}</div>
          </div>
          <div className="whs-cell">
            <div className="whs-k">PENDING</div>
            <div className="whs-v">{loading ? '…' : pending}</div>
            <div className="whs-sub">awaiting compile</div>
          </div>
        </div>
      </div>

      {loading && <div className="mono-label" style={{ padding: '2rem 0' }}>Loading raw/ files…</div>}

      {!loading && (
        <>
          {/* Fail-loud alerts — one per failed hook */}
          {hooks.filter(h => h.status === 'fail').map(h => (
            <div key={h.name} className="fail-loud-alert">
              <div className="fla-icon">■</div>
              <div className="fla-body">
                <div className="fla-title">hook <span className="mono">{h.name}</span> FAILED</div>
                <div className="fla-detail">{h.note}</div>
              </div>
            </div>
          ))}

          {/* Hook enforcement */}
          <div className="inspection-hooks">
            <div className="panel-kicker">HOOK ENFORCEMENT · lint/{data?.lintDate || '—'}</div>
            <div className="hooks-grid">
              {hooks.map(h => (
                <div key={h.name} className={`hook-cell hook-${h.status}`}>
                  <div className="hook-status-dot" />
                  <div className="hook-name mono">{h.name}</div>
                  <div className="hook-note">{h.note}</div>
                </div>
              ))}
              {hooks.length === 0 && (
                <div className="hook-cell hook-pass">
                  <div className="hook-status-dot" />
                  <div className="hook-name mono">no lint report found</div>
                  <div className="hook-note">run lint to populate</div>
                </div>
              )}
            </div>
          </div>

          <div className="inspection-grid">
            {/* File list + activations */}
            <div className="inspection-files">
              <div className="panel-kicker">RAW FILES · {files.length} ({pending} pending)</div>
              <div className="file-list">
                {files.map((f, i) => (
                  <button
                    key={f.path}
                    className={`file-row ${i === selectedIdx ? 'selected' : ''} file-${f.status === 'pending' ? 'new' : 'modified'}`}
                    onClick={() => setSelectedIdx(i)}
                  >
                    <span className={`file-status file-status-${f.status === 'pending' ? 'new' : 'modified'}`}>
                      {f.status === 'pending' ? 'NEW' : 'DONE'}
                    </span>
                    <span className="file-path mono">{f.path.replace('raw/','')}</span>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--fg-soft)', flexShrink: 0 }}>
                      {f.sourceType}
                    </span>
                  </button>
                ))}
              </div>
              <div className="panel-divider" />
              <div className="panel-kicker">ACTIVATIONS · {ACTIVATIONS.length} <span style={{fontSize:'10px',opacity:0.5}}>(mock — next: wire compile)</span></div>
              <div className="activations-list">
                {ACTIVATIONS.map((a, i) => (
                  <div key={i} className="activation-row">
                    <div className="act-edge">
                      <span className="wikilink">[[{a.from}]]</span>
                      <span className="act-relation mono">—{a.relation}→</span>
                      <span className="wikilink">[[{a.to}]]</span>
                    </div>
                    <div className="act-rationale">{a.rationale}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* File content viewer */}
            <div className="inspection-diff">
              {sel ? (
                <>
                  <div className="diff-head">
                    <span className={`file-status file-status-${sel.status === 'pending' ? 'new' : 'modified'}`}>
                      {sel.status === 'pending' ? 'PENDING' : 'COMPILED'}
                    </span>
                    <span className="mono diff-path">{sel.path}</span>
                  </div>
                  <div style={{ padding: '0.4rem 0.8rem', fontSize: '11px', color: 'var(--fg-soft)', fontFamily: 'var(--mono)', borderBottom: '1px solid var(--border)' }}>
                    {sel.project && <span style={{ marginRight: '1rem' }}>project: {sel.project}</span>}
                    {sel.date    && <span style={{ marginRight: '1rem' }}>date: {sel.date}</span>}
                    {sel.sourceType && <span>type: {sel.sourceType}</span>}
                  </div>
                  <div className="diff-body">
                    {contentLoading && (
                      <div className="diff-line"><span className="diff-text mono" style={{ color: 'var(--fg-soft)' }}>loading…</span></div>
                    )}
                    {!contentLoading && fileContent && fileContent.split('\n').slice(0, 60).map((line, i) => (
                      <DiffLine key={i} n={i + 1} text={line} add={sel.status === 'pending'} />
                    ))}
                    {!contentLoading && fileContent && fileContent.split('\n').length > 60 && (
                      <div className="diff-more mono">… {fileContent.split('\n').length - 60} more lines</div>
                    )}
                    {!contentLoading && !fileContent && (
                      <div className="diff-line"><span className="diff-text mono" style={{ color: 'var(--fg-soft)' }}>could not load file</span></div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem', color: 'var(--fg-soft)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                  select a file to inspect
                </div>
              )}
            </div>
          </div>
        </>
      )}
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
