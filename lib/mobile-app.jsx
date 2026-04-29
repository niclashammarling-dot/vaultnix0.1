// Vaultnix 0.1 — standalone mobile app
// Four-tab native-feel shell: Capture · Stub · Validate · Log

const SESSION = new Date().toISOString().slice(0, 10) + '-vault-mobile';

const DOMAINS = [
  { id: 'apex',           label: 'Apex' },
  { id: 'TCX',            label: 'TCX' },
  { id: 'teaching',       label: 'Teaching' },
  { id: 'hiking',         label: 'Hiking' },
  { id: 'knowledge-work', label: 'Knowledge' },
  { id: 'general',        label: 'General' },
];

const TABS = [
  { id: 'capture',     label: 'Capture',  icon: '+' },
  { id: 'stub',        label: 'Stub',     icon: '◫' },
  { id: 'validate',    label: 'Validate', icon: '⇄' },
  { id: 'corrections', label: 'Log',      icon: '≡' },
];

const REJECT_FIELDS = [
  { id: 'SHARED_CONCEPT',       label: 'Shared concept',       desc: 'no specific vault node could be named' },
  { id: 'DIRECTIONAL_REASON',   label: 'Directional reason',   desc: 'asymmetry too weak or absent' },
  { id: 'SPECIFIC_CONSEQUENCE', label: 'Specific consequence',  desc: 'consequence too vague' },
];

// ─── App Shell ────────────────────────────────────────────────────────────────

function MobileApp() {
  const [tab,            setTab]            = React.useState('capture');
  const [captureText,    setCaptureText]    = React.useState('');
  const [captureProject, setCaptureProject] = React.useState('general');

  return (
    <div className="m-shell">
      <div className="m-screen">
        {tab === 'capture'     && <CaptureTab text={captureText} setText={setCaptureText} project={captureProject} setProject={setCaptureProject} />}
        {tab === 'stub'        && <StubTab />}
        {tab === 'validate'    && <ValidateTab />}
        {tab === 'corrections' && <CorrectionsTab />}
      </div>

      <nav className="m-tabbar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`m-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="m-tab-icon">{t.icon}</span>
            <span className="m-tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Capture ─────────────────────────────────────────────────────────────────

function CaptureTab({ text, setText, project, setProject }) {
  const [status, setStatus] = React.useState('idle'); // idle | loading | success | error
  const [filedIdea, setFiledIdea] = React.useState(false);

  const isIdea = /^idea[.:]\s*/i.test(text.trim());
  const routeDest = isIdea ? 'raw/general/ideas/' : `raw/${project}/`;

  const submit = async () => {
    if (!text.trim() || status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, project }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setFiledIdea(!!data.isIdea);
      setStatus('success');
      setText('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Capture</div>
        <div className="m-title">raw/ · bypasses wiki</div>
      </div>

      <select
        className="m-select"
        value={project}
        onChange={e => { setProject(e.target.value); setStatus('idle'); }}
      >
        {DOMAINS.map(d => (
          <option key={d.id} value={d.id}>{d.label}</option>
        ))}
      </select>

      <div className="m-route">
        <span>→</span>
        <span className="m-route-dest">{routeDest}</span>
      </div>

      <textarea
        className="m-textarea"
        placeholder={"What happened? Decision? Open question?\n\nStart with 'idea.' to route to ideas."}
        value={text}
        onChange={e => { setText(e.target.value); setStatus('idle'); }}
        rows={7}
      />

      <button
        className="m-btn-primary"
        onClick={submit}
        disabled={!text.trim() || status === 'loading'}
      >
        {status === 'loading' ? 'Committing…' : 'Commit to vault →'}
      </button>

      {status === 'success' && (
        <div className="m-success">
          {filedIdea
            ? '✓ Idea filed to raw/general/ideas/'
            : `✓ Filed to ${routeDest}`
          }
        </div>
      )}
      {status === 'error' && (
        <div className="m-error" style={{ marginTop: 10 }}>
          Commit failed. Check GitHub token and repo access.
        </div>
      )}
    </div>
  );
}

// ─── Stub ─────────────────────────────────────────────────────────────────────

function StubTab() {
  const [stubs,   setStubs]   = React.useState(null);
  const [idx,     setIdx]     = React.useState(0);
  const [text,    setText]    = React.useState('');
  const [status,  setStatus]  = React.useState('idle'); // idle | submitting | filed | skipped | error
  const [loading, setLoading] = React.useState(true);
  const [error,   setError]   = React.useState(null);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/stubs').then(r => r.json()),
      fetch('/api/audit?resource=corrections').then(r => r.json()).catch(() => ({ entries: [] })),
    ])
      .then(([stubData, corrData]) => {
        const fillsByTarget = {};
        for (const e of (corrData.entries ?? [])) {
          if (e.action !== 'FILL' || !e.target) continue;
          const id = e.target.replace(/^\[\[|\]\]$/g, '');
          const existing = fillsByTarget[id];
          if (!existing || e.ts > existing.ts) fillsByTarget[id] = e;
        }
        const hookFailed = {};
        const doneFills = new Set();
        for (const [id, entry] of Object.entries(fillsByTarget)) {
          if (entry.status === 'hook_fail') hookFailed[id] = entry;
          else doneFills.add(id);
        }
        const pending = (stubData.stubs ?? [])
          .filter(s => !doneFills.has(s.id))
          .map(s => hookFailed[s.id]
            ? { ...s, hookFail: { note: hookFailed[s.id].note, alternative: hookFailed[s.id].alternative } }
            : s
          );
        setStubs(pending);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setStubs([]); setLoading(false); });
  }, []);

  // Pre-populate on hook_fail
  React.useEffect(() => {
    if (!stubs) return;
    const stub = stubs[idx];
    if (stub?.hookFail?.alternative) setText(stub.hookFail.alternative);
    else setText('');
  }, [stubs, idx]);

  const advance = (newStatus) => {
    setStatus(newStatus);
    setTimeout(() => {
      setIdx(i => i + 1);
      setStatus('idle');
    }, 600);
  };

  const file = () => {
    if (!text.trim() || status === 'submitting') return;
    const stub = stubs[idx];
    setStatus('submitting');
    fetch('/api/audit?resource=corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:  'FILL',
        target:  `[[${stub.id}]]`,
        reason:  text.trim(),
        session: SESSION,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setStatus('error'); return; }
        advance('filed');
      })
      .catch(() => setStatus('error'));
  };

  if (loading) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Stub</div>
        <div className="m-title">priority queue</div>
      </div>
      <div className="m-loading">loading queue…</div>
    </div>
  );

  if (error) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Stub</div>
        <div className="m-title">priority queue</div>
      </div>
      <div className="m-error">{error}</div>
    </div>
  );

  if (!stubs.length || idx >= stubs.length) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Stub · {stubs.length}/{stubs.length}</div>
        <div className="m-title">queue clear</div>
      </div>
      <div className="m-empty">
        No stubs in queue.<br />
        Run lint to refresh the priority list.
      </div>
    </div>
  );

  const stub = stubs[idx];

  return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Stub · #{idx + 1} of {stubs.length}</div>
        <div className="m-title">{stub.hookFail ? 'hook fail — refine' : '30s of judgment'}</div>
      </div>

      {stub.hookFail && (
        <div className="stub-hook-fail">
          <div className="shf-label">HOOK FAIL</div>
          <div className="shf-note">{stub.hookFail.note}</div>
        </div>
      )}

      <div className="stub-card">
        <div className="stub-id">[[{stub.id}]]</div>
        <div className="stub-q">{stub.description}</div>
        <div className="stub-meta">
          {stub.inbound} inbound · {stub.domainCount} {stub.domainCount === 1 ? 'domain' : 'domains'} · {stub.ageLabel} open
        </div>

        <div className="m-label">
          {stub.hookFail ? 'AGENT ALTERNATIVE — EDIT OR ACCEPT' : 'ONE SENTENCE — THE ARGUMENT'}
        </div>
        <textarea
          className="m-textarea"
          placeholder="What is the central claim this article needs to make?"
          value={text}
          onChange={e => { setText(e.target.value); setStatus('idle'); }}
          rows={4}
          style={{ minHeight: 'unset', marginBottom: 0 }}
        />
      </div>

      <div className="m-btn-row">
        <button
          className="m-btn-ghost"
          onClick={() => advance('skipped')}
          disabled={status === 'submitting'}
        >
          {status === 'skipped' ? 'skipped' : 'Skip'}
        </button>
        <button
          className="m-btn-primary"
          onClick={file}
          disabled={!text.trim() || status === 'submitting' || status === 'filed'}
        >
          {status === 'submitting' ? 'filing…' : status === 'filed' ? '✓ filed' : status === 'error' ? 'retry →' : 'File → raw/'}
        </button>
      </div>

      {status === 'error' && (
        <div className="m-error" style={{ marginTop: 10 }}>File failed — retry or skip.</div>
      )}
    </div>
  );
}

// ─── Validate ─────────────────────────────────────────────────────────────────

function ValidateTab() {
  const [queue,       setQueue]       = React.useState(null);
  const [idx,         setIdx]         = React.useState(0);
  const [deciding,    setDeciding]    = React.useState(false);
  const [error,       setError]       = React.useState(null);
  const [rejectMode,  setRejectMode]  = React.useState(false);
  const [rejectField, setRejectField] = React.useState(null);
  const [rejectNote,  setRejectNote]  = React.useState('');

  const load = () => {
    setError(null);
    setQueue(null);
    setIdx(0);
    setRejectMode(false);
    setRejectField(null);
    setRejectNote('');
    fetch('/api/audit?resource=validate')
      .then(r => r.json())
      .then(d => setQueue(d.pending ?? []))
      .catch(e => { setError(String(e)); setQueue([]); });
  };

  React.useEffect(() => { load(); }, []);

  const post = (action, reason) => {
    const item = queue[idx];
    if (!item || deciding) return;
    setDeciding(true);
    fetch('/api/audit?resource=validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sa_id:       item.id,
        action,
        source:      item.source,
        target:      item.target,
        shared:      item.shared   || undefined,
        flows:       item.flows    || undefined,
        without:     item.without  || undefined,
        reason,
        session:     SESSION,
        domain_pair: item.domain_pair,
        confidence:  item.confidence,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setDeciding(false); return; }
        setError(null);
        setIdx(i => i + 1);
        setDeciding(false);
        setRejectMode(false);
        setRejectField(null);
        setRejectNote('');
      })
      .catch(e => { setError(String(e)); setDeciding(false); });
  };

  const confirmReject = () => {
    if (!rejectField) return;
    const note = rejectNote.trim();
    post('REJECT', note ? `${rejectField} — ${note}` : rejectField);
  };

  if (queue === null && !error) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Validate</div>
        <div className="m-title">spreading-activation</div>
      </div>
      <div className="m-loading">loading queue…</div>
    </div>
  );

  if (error) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Validate</div>
        <div className="m-title">spreading-activation</div>
      </div>
      <div className="m-error">{error}</div>
      <button className="m-btn-ghost" onClick={load} style={{ marginTop: 8 }}>retry</button>
    </div>
  );

  if (!queue.length || idx >= queue.length) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Validate · {queue.length}/{queue.length}</div>
        <div className="m-title">queue clear</div>
      </div>
      <div className="m-empty">
        All suggested connections reviewed.<br />
        New entries appear after the next session audit.
      </div>
      <button className="m-btn-ghost" style={{ marginTop: 16 }} onClick={load}>refresh</button>
    </div>
  );

  const item = queue[idx];
  const pct = Math.round(item.confidence * 100);

  if (rejectMode) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Reject · {idx + 1}/{queue.length}</div>
        <div className="m-title">which field fails?</div>
      </div>

      <div className="reject-field-list">
        {REJECT_FIELDS.map(f => (
          <button
            key={f.id}
            className={`rfl-btn${rejectField === f.id ? ' active' : ''}`}
            onClick={() => setRejectField(f.id)}
          >
            <div className="rfl-btn-label">{f.label}</div>
            <div className="rfl-btn-desc">{f.desc}</div>
          </button>
        ))}
      </div>

      <textarea
        className="m-textarea"
        placeholder="Optional note (leave blank to use field name only)"
        value={rejectNote}
        onChange={e => setRejectNote(e.target.value)}
        rows={2}
        style={{ minHeight: 'unset' }}
      />

      <div className="m-btn-row">
        <button
          className="m-btn-ghost"
          onClick={() => { setRejectMode(false); setRejectField(null); setRejectNote(''); }}
          disabled={deciding}
        >
          Cancel
        </button>
        <button
          className="m-btn-primary"
          onClick={confirmReject}
          disabled={!rejectField || deciding}
          style={{ background: 'oklch(62% 0.14 25 / 0.5)', color: 'var(--warn)' }}
        >
          {deciding ? 'recording…' : 'Confirm reject →'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">
          Validate · {idx + 1}/{queue.length} · {item.confidence.toFixed(2)} · {item.domain_pair}
        </div>
        <div className="m-title">spreading-activation</div>
      </div>

      <div className="val-card">
        <div className="val-header">PROPOSED LINK</div>

        <div className="val-edge">
          <div className="val-node">{item.source}</div>
          <div className="val-relation">
            relates-to
            <div className="val-conf-bar">
              <div className="val-conf-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="val-node">{item.target}</div>
        </div>

        <div className="val-fields">
          {item.shared && (
            <div>
              <div className="val-field-label">SHARED</div>
              <div className="val-field-value">{item.shared}</div>
            </div>
          )}
          {item.flows && (
            <div>
              <div className="val-field-label">FLOWS</div>
              <div className="val-field-value">{item.flows}</div>
            </div>
          )}
          {item.without && (
            <div>
              <div className="val-field-label">WITHOUT THIS</div>
              <div className="val-field-value">{item.without}</div>
            </div>
          )}
        </div>
      </div>

      <div className="val-actions">
        <button
          className="val-btn val-btn-reject"
          onClick={() => setRejectMode(true)}
          disabled={deciding}
        >
          <span className="val-btn-arrow">←</span>
          <span>Reject</span>
          <span className="val-btn-sub">encode as hook</span>
        </button>
        <button
          className="val-btn val-btn-accept"
          onClick={() => post('ACCEPT', 'accepted')}
          disabled={deciding}
        >
          <span className="val-btn-arrow">→</span>
          <span>Accept</span>
          <span className="val-btn-sub">commit link</span>
        </button>
      </div>

      {deciding && <div className="m-loading" style={{ padding: '12px 0' }}>recording…</div>}
      {error && <div className="m-error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}

// ─── Corrections Log ──────────────────────────────────────────────────────────

function CorrectionsTab() {
  const [data,    setData]    = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error,   setError]   = React.useState(null);

  React.useEffect(() => {
    fetch('/api/audit?resource=corrections')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  const fmtTime = (ts) => {
    const d = new Date(ts);
    const today = new Date().toISOString().slice(0, 10);
    const isToday = d.toISOString().startsWith(today);
    const hhmm = d.toTimeString().slice(0, 5);
    return isToday ? hhmm : 'Y ' + hhmm;
  };

  const stripBrackets = (s) => s ? s.replace(/^\[\[|\]\]$/g, '') : '';

  if (loading) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Log</div>
        <div className="m-title">correction feed</div>
      </div>
      <div className="m-loading">loading…</div>
    </div>
  );

  if (error || !data) return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Log</div>
        <div className="m-title">correction feed</div>
      </div>
      <div className="m-error">failed to load corrections log</div>
    </div>
  );

  const { entries, byAction, weakestLink } = data;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = entries.filter(e => e.ts.startsWith(today)).length;
  const hookCount  = entries.filter(e => e.hook_id).length;

  return (
    <div className="m-view">
      <div className="m-head">
        <div className="m-kicker">Log</div>
        <div className="m-title">correction feed</div>
      </div>

      <div className="corr-stats">
        {todayCount} today · {hookCount} hooks · {byAction.REJECT ?? 0} rejected
      </div>

      {weakestLink && (
        <div className="wl-bar">
          <div className="wl-header">WEAKEST LINK</div>
          <div className="wl-stat">
            <span>{weakestLink.pair}</span>
            <span className="wl-stat-pct">{weakestLink.rejectRate}% reject</span>
          </div>
          <div className="wl-track">
            <div className="wl-track-fill" style={{ width: `${weakestLink.rejectRate}%` }} />
          </div>
        </div>
      )}

      <div className="corr-feed">
        {entries.slice(0, 40).map((it, i) => (
          <div key={i} className="cf-row">
            <div className="cf-time">{fmtTime(it.ts)}</div>
            <div className="cf-body">
              <div className="cf-edge">
                <span className={`cf-action cf-action-${it.action.toLowerCase()}`}>{it.action}</span>
                {it.source && <span>[[{stripBrackets(it.source)}]]</span>}
                {it.target && <span>→ [[{stripBrackets(it.target)}]]</span>}
              </div>
              <div className="cf-note">{it.reason}</div>
              {it.hook_id && (
                <div className="cf-hook">hook {it.hook_id} · negative constraint</div>
              )}
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="m-empty">no corrections yet</div>
        )}
      </div>
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(<MobileApp />);
