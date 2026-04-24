// MEM1 — Views: Home, Domain, Article, Search, Capture, Benchmark

const { DOMAINS, CONCEPTS, SAMPLE_ARTICLE, RECENT_CAPTURES, INDEX_HIGHLIGHTS, BENCHMARK_QUERIES } = window.MEM1_DATA;

// ─── HOME ───────────────────────────────────────────────────────────────────
function HomeView({ go }) {
  const [activeConcept, setActiveConcept] = React.useState('honesty');
  const [liveMeta, setLiveMeta] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/vault')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setLiveMeta(d))
      .catch(() => {});
  }, []);

  const meta = liveMeta || INDEX_HIGHLIGHTS;
  const pendingCount = liveMeta ? liveMeta.pendingReview : INDEX_HIGHLIGHTS.pendingReview;
  const pendingItems = liveMeta ? liveMeta.pendingItems : null;
  const suggested = liveMeta ? liveMeta.suggestedNext : INDEX_HIGHLIGHTS.suggestedNext;
  const bm = INDEX_HIGHLIGHTS.benchmark;

  return (
    <div className="home">
      <section className="home-hero">
        <div>
          <div className="hero-eyebrow">INDEX · 2026-04-20 · {DOMAINS.reduce((s,d)=>s+d.articles,0)} ARTICLES · {INDEX_HIGHLIGHTS.stubCount} STUBS</div>
          <h1 className="hero-title">
            A <em>deliberate</em> external mind.
          </h1>
          <p className="hero-sub">
            MEM1 is an agent-operated knowledge system. You steer. It writes, links, and audits itself — and tells you loudly what it doesn't yet know.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => go('ask')}>Ask MEM1 →</button>
            <button className="btn-ghost" onClick={() => go('capture')}>Capture</button>
            <button className="btn-ghost" onClick={() => go('benchmark')}>Benchmark</button>
          </div>
        </div>

        <div className="hero-graph">
          <GraphOverlay
            concepts={CONCEPTS}
            domains={DOMAINS}
            activeConceptId={activeConcept}
            onSelect={setActiveConcept}
          />
          <div className="graph-caption">
            <span className="mono-label">SMALL-WORLD TOPOLOGY</span>
            <span>concept shortcuts across {DOMAINS.length} domains · click nodes to trace</span>
          </div>
        </div>
      </section>

      <section className="home-panels">
        {/* Domains */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-kicker">DOMAINS</span>
            <span className="panel-meta">5 active · 1 meta</span>
          </div>
          <div className="domain-list">
            {DOMAINS.map(d => (
              <button key={d.id} className={`domain-row d-${d.color}`} onClick={() => go('domain', d.id)}>
                <div className="domain-row-main">
                  <div className="domain-row-label">{d.label}</div>
                  <div className="domain-row-kind">{d.kind}</div>
                </div>
                <div className="domain-row-stats">
                  <span>{d.articles}<em>a</em></span>
                  <span>{d.concepts}<em>c</em></span>
                  <span className="stub-count">{d.stubs}<em>s</em></span>
                </div>
                <div className="domain-row-tension">{d.tension}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Pending / suggested */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-kicker">PENDING REVIEW</span>
            <span className="panel-meta warn">{pendingCount} drafts</span>
          </div>
          <ul className="pending-list">
            {pendingCount === 0
              ? <li><span className="pending-type">—</span><span>No drafts pending</span></li>
              : pendingItems
                ? pendingItems.map(s => <li key={s}><span className="pending-type">draft</span><span>{s}.md</span></li>)
                : <li><span className="pending-type">draft</span><span>{pendingCount} drafts awaiting review</span></li>
            }
          </ul>

          <div className="panel-divider" />

          <div className="panel-subhead">SUGGESTED NEXT</div>
          <ul className="suggested-list">
            {suggested.map(s => (
              <li key={s}><span className="stub-pill">stub</span><span className="wikilink">[[{s}]]</span></li>
            ))}
          </ul>
        </div>

        {/* Vault health */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-kicker">VAULT HEALTH</span>
            <span className="panel-meta">benchmark v2.1</span>
          </div>
          <div className="health-big">
            <div className="health-score">
              <div className="health-num">{bm.score}<span className="health-den">/{bm.max}</span></div>
              <div className={`health-delta ${bm.delta > 0 ? 'pos' : 'neg'}`}>
                {bm.delta > 0 ? '+' : ''}{bm.delta} since last run
              </div>
            </div>
            <div className="health-bars">
              {[
                { k: 'Traversal density', v: 76 },
                { k: 'Synthesis', v: 76 },
                { k: 'Gap honesty', v: 86 },
                { k: 'Surprise', v: 62 },
              ].map(b => (
                <div key={b.k} className="health-bar-row">
                  <div className="health-bar-k">{b.k}</div>
                  <div className="health-bar-track"><div className="health-bar-fill" style={{ width: `${b.v}%` }} /></div>
                  <div className="health-bar-v">{b.v}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="panel-cta" onClick={() => go('benchmark')}>Run new benchmark →</button>
        </div>

        {/* Recent captures */}
        <div className="panel panel-wide">
          <div className="panel-head">
            <span className="panel-kicker">RAW CAPTURES · TODAY</span>
            <span className="panel-meta">4 captured · 2 compiled · 1 idea · 1 pending</span>
          </div>
          <div className="capture-stream">
            {RECENT_CAPTURES.map((c, i) => (
              <div key={i} className={`capture-row cap-${c.status}`}>
                <div className="cap-time">{c.time}</div>
                <div className="cap-domain">{c.domain}</div>
                <div className="cap-excerpt">{c.excerpt}</div>
                <div className={`cap-status cap-status-${c.status}`}>{c.status}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── DOMAIN ─────────────────────────────────────────────────────────────────
function DomainView({ domainId, go }) {
  const d = DOMAINS.find(x => x.id === domainId) || DOMAINS[0];
  const domainConcepts = CONCEPTS.filter(c => c.domains.includes(d.id));

  return (
    <div className="domain-view">
      <div className="domain-head">
        <div className="domain-eyebrow">
          <span className="wikilink">[[_mocs/{d.id}-moc]]</span> · MAP OF CONTENT · {d.articles} ARTICLES
        </div>
        <h1 className="domain-title">{d.label}</h1>
        <div className="domain-tension">
          <span className="tension-kicker">CENTRAL TENSION</span>
          <span className="tension-text">{d.tension}</span>
        </div>
      </div>

      <div className="domain-columns">
        <div className="domain-col-main">
          <div className="panel-kicker">THE ARGUMENT</div>
          <p className="domain-arg">{d.arg}</p>

          <div className="panel-divider" />

          <div className="panel-kicker">CORE ARTICLES</div>
          <div className="article-list">
            {['nightly-audit-architecture', 'gate-chain-restructuring', 'volatility-targeting-sharpe-finding', 'four-gate-decision-pipeline', 'regime-matrix-sector-leaderboard'].map(name => (
              <button key={name} className="article-list-item" onClick={() => go('article', null, `wiki/domains/${d.id}/${name}.md`)}>
                <div className="ali-title">{humanize(name)}</div>
                <div className="ali-path">wiki/domains/{d.id}/{name}.md</div>
                <div className="ali-arrow">↗</div>
              </button>
            ))}
          </div>

          <div className="panel-divider" />

          <div className="panel-kicker">OPEN TERRITORY <span className="kicker-count">{d.stubs} stubs</span></div>
          <ul className="stubs-list">
            <li><span className="stub-pill">stub</span><span className="wikilink">[[regime-bayes-likelihood-ratio]]</span><span className="stub-inbound">3 inbound</span></li>
            <li><span className="stub-pill">stub</span><span className="wikilink">[[lock-leading-corroboration]]</span><span className="stub-inbound">2 inbound</span></li>
            <li><span className="stub-pill">stub</span><span className="wikilink">[[audit-as-documentation]]</span><span className="stub-inbound">1 inbound</span></li>
          </ul>
        </div>

        <div className="domain-col-side">
          <div className="panel-kicker">CONCEPT NEIGHBORHOOD</div>
          <GraphOverlay concepts={domainConcepts} domains={[d]} compact activeConceptId={null} />
          <div className="side-concepts">
            {domainConcepts.map(c => (
              <div key={c.id} className="side-concept">
                <span className="wikilink">[[{c.id}]]</span>
                <span className="side-concept-domains">+{c.domains.length - 1} other domains</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ARTICLE ────────────────────────────────────────────────────────────────
function ArticleView({ go, articlePath }) {
  const [content, setContent] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!articlePath) return;
    setLoading(true);
    setError(null);
    setContent(null);
    fetch(`/api/file?path=${encodeURIComponent(articlePath)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setContent(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, [articlePath]);

  const pathParts = (articlePath || '').split('/');
  const folder = pathParts.length > 2 ? pathParts[pathParts.length - 2] : '';
  const slug = pathParts[pathParts.length - 1]?.replace('.md', '') || '';
  const title = humanize(slug);

  const renderMarkdown = (md) => {
    if (window.marked) {
      return <div className="article-md" dangerouslySetInnerHTML={{ __html: window.marked.parse(md) }} />;
    }
    return md.split('\n\n').map((p, i) => <p key={i}>{renderInline(p)}</p>);
  };

  const stripFrontmatter = (md) => md.replace(/^---[\s\S]*?---\n/, '');

  return (
    <div className="article-view">
      <div className="article-head">
        <div className="article-breadcrumb">
          <button className="breadcrumb-btn" onClick={() => go('home')}>INDEX</button>
          {folder && <><span className="crumb-sep">/</span><button className="breadcrumb-btn">{folder}</button></>}
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{slug}</span>
        </div>
        {articlePath && <div className="article-meta-row"><span className="article-kind mono">{articlePath}</span></div>}
        <h1 className="article-title">{loading ? 'Loading…' : error ? 'Not found' : title}</h1>
      </div>

      <div className="article-body">
        {loading && <div className="article-loading">Fetching from vault…</div>}
        {error && (
          <div className="article-error">
            <p>Could not load <span className="mono">{articlePath}</span></p>
            <p>The article may not exist in the vault yet, or the path is wrong.</p>
            <button className="btn-ghost" onClick={() => go('search')}>Search vault →</button>
          </div>
        )}
        {content && renderMarkdown(stripFrontmatter(content.content))}
        {!articlePath && renderMarkdown(SAMPLE_ARTICLE.sections.map(s => `## ${s.heading}\n\n${s.body}`).join('\n\n'))}
      </div>
    </div>
  );
}

// ─── SEARCH ─────────────────────────────────────────────────────────────────
function SearchView({ go }) {
  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const inputRef = React.useRef();
  const debounceRef = React.useRef(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  React.useEffect(() => {
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.ok ? r.json() : { results: [] })
        .then(d => {
          setResults(d.results || []);
          setSearching(false);
        })
        .catch(() => { setResults([]); setSearching(false); });
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  const kindOf = path => {
    if (path.includes('/_concepts/')) return 'concept';
    if (path.includes('/_mocs/')) return 'MOC';
    if (path.includes('/_skills/')) return 'skill';
    return 'article';
  };
  const domainOf = path => {
    const m = path.match(/wiki\/([^/]+)\//);
    return m ? [m[1].replace(/^_/, '')] : ['knowledge-work'];
  };
  const titleOf = path => humanize(path.split('/').pop().replace('.md', ''));

  return (
    <div className="search-view">
      <div className="search-head">
        <div className="search-input-wrap">
          <span className="search-icon mono">/</span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search vault — concepts, articles, skills, MOCs…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <span className="search-count mono">
            {q.length < 2 ? 'type to search' : searching ? 'searching…' : `${results.length} results`}
          </span>
        </div>
        <div className="search-filters">
          {['all','concept','article','MOC','skill','stub'].map(f => (
            <button key={f} className={`chip ${f === 'all' ? 'active' : ''}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="search-results">
        {results.map((r, i) => {
          const kind = kindOf(r.path);
          const domains = domainOf(r.path);
          const title = titleOf(r.path);
          return (
            <button key={i} className="search-result" onClick={() => go && go('article', null, r.path)}>
              <div className="sr-head">
                <span className={`sr-kind kind-${kind}`}>{kind}</span>
                <span className="sr-title">{title}</span>
                <span className="sr-path mono">{r.path}</span>
              </div>
              <div className="sr-excerpt">{r.excerpt}</div>
              <div className="sr-domains">
                {domains.map(d => <span key={d} className="sr-domain-chip">{d}</span>)}
              </div>
            </button>
          );
        })}
        {q.length >= 2 && !searching && results.length === 0 && (
          <div className="sr-empty">No results in vault for "{q}"</div>
        )}
      </div>
    </div>
  );
}

// ─── CAPTURE ────────────────────────────────────────────────────────────────
function CaptureView() {
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

  return (
    <div className="capture-view">
      <div className="capture-head">
        <h1 className="capture-title">Capture</h1>
        <p className="capture-sub">
          Writes to <span className="mono">raw/{domain === 'general' ? 'general' : domain}/</span>. Nightly compile processes it into a structured article. Start with <span className="mono">idea.</span> to route to review-later.
        </p>
      </div>

      <div className="capture-form">
        <div className="capture-domain-row">
          <label className="mono-label">DOMAIN</label>
          <div className="capture-domain-chips">
            {DOMAINS.map(d => (
              <button key={d.id} className={`chip ${domain === d.id ? 'active' : ''}`} onClick={() => setDomain(d.id)}>{d.label}</button>
            ))}
            <button className={`chip ${domain === 'general' ? 'active' : ''}`} onClick={() => setDomain('general')}>general</button>
          </div>
        </div>

        <div className="capture-textarea-wrap">
          <textarea
            className="capture-textarea"
            placeholder="What happened? What did you decide? What are the open questions?"
            value={text}
            onChange={e => { setText(e.target.value); setStatus('idle'); }}
            rows={10}
          />
          {isIdea && (
            <div className="capture-badge">
              <span className="mono-label">ROUTE</span>
              <span>idea → raw/general/ideas/ (no compile)</span>
            </div>
          )}
        </div>

        <div className="capture-actions">
          <div className="capture-meta mono">
            {text.length} chars · {text.trim().split(/\s+/).filter(Boolean).length} words
          </div>
          <div className="capture-buttons">
            <button className="btn-ghost" onClick={() => setText('')}>clear</button>
            <button className="btn-primary" onClick={submit} disabled={!text.trim() || status === 'submitting'}>
              {status === 'submitting' ? 'Committing…' : status === 'committed' ? '✓ Committed' : status === 'error' ? 'Retry →' : 'Commit to raw →'}
            </button>
          </div>
        </div>

        {status === 'committed' && commitResult && (
          <div className="capture-success">
            <div className="mono-label">COMMITTED</div>
            <div>Filed to <span className="mono">raw/{commitResult.domain}/{commitResult.filename}</span>. {commitResult.isIdea ? 'Awaiting your review — not queued for compile.' : 'Nightly compile will process at 02:00 UTC.'}</div>
          </div>
        )}
        {status === 'error' && (
          <div className="capture-success" style={{ borderColor: 'var(--warn)' }}>
            <div className="mono-label" style={{ color: 'var(--warn)' }}>COMMIT FAILED</div>
            <div>Check GitHub token and repo env vars.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BENCHMARK ──────────────────────────────────────────────────────────────
function BenchmarkView() {
  const bm = INDEX_HIGHLIGHTS.benchmark;
  const overallByDim = { TD: 76, SQ: 76, GH: 86, SU: 62 };
  return (
    <div className="benchmark-view">
      <div className="benchmark-head">
        <h1 className="benchmark-title">Vault benchmark</h1>
        <p className="benchmark-sub">v2.1 · 10 fixed cross-domain queries · scored on Traversal density, Synthesis quality, Gap Honesty, Surprise. Last run {bm.lastRun}.</p>
      </div>

      <div className="benchmark-overall">
        <div className="bm-score-huge">
          <div className="bm-score-n">{bm.score}</div>
          <div className="bm-score-d">/ {bm.max}</div>
          <div className="bm-score-delta">
            <span className="delta-pos">+{bm.delta}</span>
            <span className="delta-label">since 2026-04-10</span>
          </div>
        </div>
        <div className="bm-dims">
          {Object.entries(overallByDim).map(([k,v]) => (
            <div key={k} className="bm-dim">
              <div className="bm-dim-k">{k}</div>
              <div className="bm-dim-v">{v}<span className="mono">/100</span></div>
              <div className="bm-dim-bar"><div style={{ width: `${v}%` }} /></div>
              <div className="bm-dim-label">{{TD:'traversal density',SQ:'synthesis quality',GH:'gap honesty',SU:'surprise'}[k]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-kicker">QUERY-BY-QUERY</div>
      <div className="bm-queries">
        {BENCHMARK_QUERIES.map((q, i) => (
          <div key={i} className="bm-query-row">
            <div className="bm-q-num">{String(i+1).padStart(2,'0')}</div>
            <div className="bm-q-text">{q.q}</div>
            <div className="bm-q-scores">
              {['TD','SQ','GH','SU'].map(k => (
                <div key={k} className={`bm-q-score ${q[k] >= 9 ? 'high' : q[k] >= 7 ? 'mid' : 'low'}`}>
                  <span className="bm-q-score-k">{k}</span>
                  <span className="bm-q-score-v">{q[k]}</span>
                </div>
              ))}
            </div>
            <div className="bm-q-total">{q.TD + q.SQ + q.GH + q.SU}</div>
          </div>
        ))}
      </div>

      <div className="bm-trend">
        <div className="panel-kicker">TREND · LAST 6 RUNS</div>
        <div className="bm-trend-chart">
          {[134, 138, 141, 145, 147, 151].map((v, i, arr) => {
            const max = 200, h = (v/max) * 100;
            return (
              <div key={i} className="bm-trend-bar">
                <div className="bm-trend-v mono">{v}</div>
                <div className="bm-trend-col"><div className="bm-trend-fill" style={{ height: `${h}%` }} /></div>
                <div className="bm-trend-x mono">wk {i+1}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Utils ──────────────────────────────────────────────────────────────────
function humanize(slug) {
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

Object.assign(window, { HomeView, DomainView, ArticleView, SearchView, CaptureView, BenchmarkView });
