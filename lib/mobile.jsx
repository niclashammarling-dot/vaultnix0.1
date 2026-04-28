// MEM1 Mobile — the specialized sensor companion to the browser hub.
// Shows the iPhone frame with four key screens: Capture Pipe, Micro-Stub
// flashcard, Validation swipe, Correction Log.

function MobileView() {
  const [screen, setScreen] = React.useState('capture');

  const SCREENS = [
    { id: 'capture',     label: 'Capture Pipe',     sub: 'raw/ · no wiki' },
    { id: 'stub',        label: 'Micro-Stub',       sub: 'fill in 30s' },
    { id: 'validate',    label: 'Validation Gate',  sub: 'swipe L/R' },
    { id: 'corrections', label: 'Correction Log',   sub: 'compounding' },
  ];

  return (
    <div className="use-view mobile-view">
      <div className="use-head">
        <div className="use-kicker">B · MOBILE · COMPLEMENTARY SENSOR</div>
        <h1 className="use-title">The phone is not a smaller browser.</h1>
        <p className="use-sub">
          Specialization: raw signal capture, micro-stub flashcards, swipe
          validation. The weakest link between human thought and agent file
          is the transition itself — this is where the interface must be honest.
        </p>
      </div>

      <div className="mobile-grid">
        <div className="mobile-stage">
          <div className="ios-phone-frame">
            <div className="ios-notch" />
            <div className="ios-status-bar">
              <span className="mono">9:41</span>
              <span className="ios-sb-right mono">MEM1</span>
            </div>
            <div className="ios-screen">
              {screen === 'capture'     && <MobileCapture />}
              {screen === 'stub'        && <MobileStub />}
              {screen === 'validate'    && <MobileValidate />}
              {screen === 'corrections' && <MobileCorrections />}
            </div>
            <div className="ios-home-indicator" />
          </div>
        </div>

        <div className="mobile-detail">
          <div className="mono-label">SELECT SCREEN</div>
          <div className="mobile-screen-list">
            {SCREENS.map(s => (
              <button key={s.id}
                className={`mobile-screen-btn ${screen === s.id ? 'active' : ''}`}
                onClick={() => setScreen(s.id)}>
                <div className="msb-label">{s.label}</div>
                <div className="msb-sub">{s.sub}</div>
              </button>
            ))}
          </div>

          <div className="panel-divider" />
          <div className="mono-label">COMPLEMENTARY FUNCTION</div>
          <div className="mobile-function">
            {screen === 'capture' && (
              <>
                <p className="mf-arg">The phone drops raw signal into <span className="mono">raw/</span>. It never touches <span className="mono">wiki/</span>.</p>
                <p className="mf-audit">Browser audit: noise-filter report scores capture quality nightly. Low-signal dumps surface on desktop.</p>
              </>
            )}
            {screen === 'stub' && (
              <>
                <p className="mf-arg">High-value stubs the agent can't resolve alone get pushed as flashcards. 30-second human judgment, compiled into next run.</p>
                <p className="mf-audit">Browser audit: stub-fill quality feeds the strategic agenda — poor fills widen the gap.</p>
              </>
            )}
            {screen === 'validate' && (
              <>
                <p className="mf-arg">Proposed spreading-activation links at 80% confidence. Swipe left rejects — rejection encoded as a Negative Constraint (Hook).</p>
                <p className="mf-audit">Browser audit: tracks which link-types get rejected most. If "bayesian" keeps failing, the similarity classifier is miscalibrated.</p>
              </>
            )}
            {screen === 'corrections' && (
              <>
                <p className="mf-arg">Every override becomes permanent structure. The log is the graph's immune memory.</p>
                <p className="mf-audit">Browser audit: Weakest Link Tracker — which interface fails most? This view shows you.</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="complementary-table">
        <div className="panel-kicker">COMPLEMENTARY FUNCTIONS · honest interfaces</div>
        <table className="ct-table">
          <thead>
            <tr><th>Component</th><th>Function</th><th>Complementary audit</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="ct-tag">Mobile</span></td>
              <td>Signal capture</td>
              <td>Browser audits capture quality via noise-filter report.</td>
            </tr>
            <tr>
              <td><span className="ct-tag">Browser</span></td>
              <td>Synthesis audit</td>
              <td>Mobile pushes real-world retests to verify synthesis holds in practice.</td>
            </tr>
            <tr>
              <td><span className="ct-tag">Agent</span></td>
              <td>Compilation</td>
              <td>Human (both surfaces) acts as Validation Gate before commit.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileCapture() {
  const [text, setText] = React.useState('');
  return (
    <div className="ios-view capture">
      <div className="ios-h1">Capture</div>
      <div className="ios-sub mono">raw/ · bypasses wiki · 02:00 compile</div>
      <div className="ios-capture-route">
        <div className="icr-item">
          <span className="icr-ico">⌨</span>
          <span>text</span>
        </div>
        <div className="icr-item active">
          <span className="icr-ico">🎤</span>
          <span>voice</span>
        </div>
        <div className="icr-item">
          <span className="icr-ico">📷</span>
          <span>image</span>
        </div>
      </div>
      <textarea
        className="ios-textarea"
        placeholder="What happened? Decision? Open question? Start with 'idea.' to route to ideas."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="ios-capture-footer">
        <div className="mono" style={{ fontSize: 9, color: '#8a8f98' }}>{text.length}B · route: {text.startsWith('idea.') ? 'ideas' : 'general'}</div>
        <button className="ios-commit">Commit →</button>
      </div>
    </div>
  );
}

function MobileStub() {
  const [data,     setData]     = React.useState(null);
  const [idx,      setIdx]      = React.useState(0);
  const [text,     setText]     = React.useState('');
  const [status,   setStatus]   = React.useState('idle'); // idle | submitting | filed | skipped | error
  const [loading,  setLoading]  = React.useState(true);
  const [error,    setError]    = React.useState(null);

  const SESSION = new Date().toISOString().slice(0, 10) + '-vault-session';

  React.useEffect(() => {
    Promise.all([
      fetch('/api/stubs').then(r => r.json()),
      fetch('/api/audit?resource=corrections').then(r => r.json()).catch(() => ({ entries: [] })),
    ])
      .then(([stubData, corrData]) => {
        // Group FILL entries by target — take the latest per target.
        // A latest entry with status: 'hook_fail' means the stub is back in queue.
        // A latest entry with no status (clean fill) means the stub is done.
        const fillsByTarget = {};
        for (const e of (corrData.entries ?? [])) {
          if (e.action !== 'FILL' || !e.target) continue;
          const id = e.target.replace(/^\[\[|\]\]$/g, '');
          const existing = fillsByTarget[id];
          if (!existing || e.ts > existing.ts) fillsByTarget[id] = e;
        }

        // Stubs whose latest FILL has no hook_fail are done; others resurface.
        const hookFailed = {};
        const doneFills  = new Set();
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

        setData({ ...stubData, stubs: pending });
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  // Advance to next stub (skip or after filing)
  const advance = (newStatus) => {
    setStatus(newStatus);
    setTimeout(() => {
      setIdx(i => i + 1);
      setText('');
      setStatus('idle');
    }, 600);
  };

  const file = () => {
    if (!text.trim() || status === 'submitting') return;
    const stub = data.stubs[idx];
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
    <div className="ios-view stub">
      <div className="ios-h1">Stub</div>
      <div className="ios-loading mono">loading queue…</div>
    </div>
  );

  if (error) return (
    <div className="ios-view stub">
      <div className="ios-h1">Stub</div>
      <div className="ios-error mono">{error}</div>
    </div>
  );

  const stubs = data?.stubs ?? [];

  if (!stubs.length || idx >= stubs.length) return (
    <div className="ios-view stub">
      <div className="ios-h-row">
        <div className="ios-h1">Stub</div>
        <div className="mono ios-priority">{stubs.length}/{stubs.length}</div>
      </div>
      <div className="ios-sub mono">queue clear</div>
      <div className="validate-empty mono">
        No stubs in queue. Run lint to refresh the stub priority list.
      </div>
    </div>
  );

  const stub = stubs[idx];
  const rank = idx + 1;

  // Pre-populate textarea with agent alternative when card first mounts for a hook_fail stub
  React.useEffect(() => {
    if (stub?.hookFail?.alternative) setText(stub.hookFail.alternative);
    else setText('');
  }, [stub?.id]);

  return (
    <div className="ios-view stub">
      <div className="ios-h-row">
        <div className="ios-h1">Stub</div>
        <div className="mono ios-priority">#{rank} · {stub.score}</div>
      </div>
      <div className="ios-sub mono">
        {stub.hookFail ? 'compile failed — refine the argument' : 'the vault needs 30s of your judgment'}
      </div>

      {stub.hookFail && (
        <div className="stub-hook-fail">
          <div className="shf-label mono">HOOK FAIL</div>
          <div className="shf-note">{stub.hookFail.note}</div>
        </div>
      )}

      <div className="stub-card">
        <div className="stub-card-kicker mono">[[{stub.id}]]</div>
        <div className="stub-card-q">{stub.description}</div>
        <div className="stub-card-meta mono">
          {stub.inbound} inbound · {stub.domainCount} {stub.domainCount === 1 ? 'domain' : 'domains'} · {stub.ageLabel} open
        </div>

        <div className="stub-card-inputs">
          <div className="sci-label mono">
            {stub.hookFail ? 'AGENT ALTERNATIVE — EDIT OR ACCEPT' : 'ONE SENTENCE — THE ARGUMENT'}
          </div>
          <textarea
            className="sci-input"
            placeholder="What is the central claim this article needs to make?"
            value={text}
            onChange={e => { setText(e.target.value); setStatus('idle'); }}
          />
        </div>
      </div>

      <div className="ios-stub-actions">
        <button
          className="ios-btn-ghost"
          onClick={() => advance('skipped')}
          disabled={status === 'submitting'}
        >
          {status === 'skipped' ? 'skipped' : 'Skip'}
        </button>
        <button
          className="ios-btn-primary"
          onClick={file}
          disabled={!text.trim() || status === 'submitting' || status === 'filed'}
        >
          {status === 'submitting' ? 'filing…' : status === 'filed' ? '✓ filed' : status === 'error' ? 'retry →' : 'File → raw/'}
        </button>
      </div>
    </div>
  );
}

function MobileValidate() {
  const [queue,    setQueue]    = React.useState(null);   // null = loading
  const [idx,      setIdx]      = React.useState(0);
  const [deciding, setDeciding] = React.useState(false);
  const [error,    setError]    = React.useState(null);

  const SESSION = new Date().toISOString().slice(0, 10) + '-vault-session';

  const load = () => {
    setError(null);
    fetch('/api/audit?resource=validate')
      .then(r => r.json())
      .then(d => { setQueue(d.pending ?? []); setIdx(0); })
      .catch(e => setError(String(e)));
  };

  React.useEffect(() => { load(); }, []);

  const decide = (action) => {
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
        session:     SESSION,
        domain_pair: item.domain_pair,
        confidence:  item.confidence,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setDeciding(false); return; }
        setIdx(i => i + 1);
        setDeciding(false);
      })
      .catch(e => { setError(String(e)); setDeciding(false); });
  };

  const stripBrackets = (s) => s ? s.replace(/^\[\[|\]\]$/g, '') : s;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (queue === null) return (
    <div className="ios-view validate">
      <div className="ios-h1">Validate</div>
      <div className="ios-loading mono">loading queue…</div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="ios-view validate">
      <div className="ios-h1">Validate</div>
      <div className="ios-error mono">{error}</div>
      <button className="ios-btn-ghost" style={{ marginTop: 12 }} onClick={load}>retry</button>
    </div>
  );

  // ── Empty queue ──────────────────────────────────────────────────────────────
  if (!queue.length || idx >= queue.length) return (
    <div className="ios-view validate">
      <div className="ios-h-row">
        <div className="ios-h1">Validate</div>
        <div className="mono ios-queue">{queue.length}/{queue.length}</div>
      </div>
      <div className="ios-sub mono">queue clear</div>
      <div className="validate-empty mono">
        No pending links. The agent will populate this queue during the next compile run
        when it surfaces cross-domain links at confidence ≥ 0.75.
      </div>
      <button className="ios-btn-ghost" style={{ marginTop: 16 }} onClick={load}>refresh</button>
    </div>
  );

  // ── Active card ──────────────────────────────────────────────────────────────
  const item = queue[idx];
  const pct  = Math.round(item.confidence * 100);

  return (
    <div className="ios-view validate">
      <div className="ios-h-row">
        <div className="ios-h1">Validate</div>
        <div className="mono ios-queue">{idx + 1}/{queue.length}</div>
      </div>
      <div className="ios-sub mono">
        confidence: {item.confidence.toFixed(2)} · {item.domain_pair}
      </div>

      <div className="validate-card">
        <div className="vc-header mono">PROPOSED LINK · spreading-activation</div>

        <div className="vc-edge">
          <div className="vc-node">[[{stripBrackets(item.source)}]]</div>
          <div className="vc-relation mono">
            <span>relates-to</span>
            <div className="vc-confidence">
              <div className="vcc-bar"><div style={{ width: `${pct}%` }} /></div>
              <span>{item.confidence.toFixed(2)}</span>
            </div>
          </div>
          <div className="vc-node">[[{stripBrackets(item.target)}]]</div>
        </div>

        <div className="vc-fields">
          <div className="vcf-row">
            <div className="vcf-label mono">SHARED</div>
            <div className="vcf-value">{item.shared}</div>
          </div>
          <div className="vcf-row">
            <div className="vcf-label mono">FLOWS</div>
            <div className="vcf-value">{item.flows}</div>
          </div>
          <div className="vcf-row">
            <div className="vcf-label mono">WITHOUT THIS</div>
            <div className="vcf-value">{item.without}</div>
          </div>
        </div>
      </div>

      <div className="swipe-actions">
        <button
          className="swipe-btn reject"
          onClick={() => decide('REJECT')}
          disabled={deciding}
        >
          <span className="sa-arrow">←</span>
          <span className="sa-label">Reject</span>
          <span className="sa-desc">encode as Hook</span>
        </button>
        <button
          className="swipe-btn accept"
          onClick={() => decide('ACCEPT')}
          disabled={deciding}
        >
          <span className="sa-label">Accept</span>
          <span className="sa-arrow">→</span>
          <span className="sa-desc">commit link</span>
        </button>
      </div>

      {deciding && <div className="ios-deciding mono">recording…</div>}
    </div>
  );
}

function MobileCorrections() {
  const [data,    setData]    = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error,   setError]   = React.useState(null);

  React.useEffect(() => {
    fetch('/api/audit?resource=corrections')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="ios-view corrections">
      <div className="ios-h1">Corrections</div>
      <div className="ios-loading mono">loading…</div>
    </div>
  );

  if (error || !data) return (
    <div className="ios-view corrections">
      <div className="ios-h1">Corrections</div>
      <div className="ios-error mono">failed to load corrections log</div>
    </div>
  );

  const { entries, byAction, weakestLink } = data;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount  = entries.filter(e => e.ts.startsWith(today)).length;
  const hookCount   = entries.filter(e => e.hook_id).length;

  const fmtTime = (ts) => {
    const d = new Date(ts);
    const isToday = d.toISOString().startsWith(today);
    const hhmm = d.toTimeString().slice(0, 5);
    return isToday ? hhmm : 'Y ' + hhmm;
  };

  const stripBrackets = (s) => s ? s.replace(/^\[\[|\]\]$/g, '') : '';

  return (
    <div className="ios-view corrections">
      <div className="ios-h1">Corrections</div>
      <div className="ios-sub mono">
        {todayCount} today · {hookCount} hooks · {byAction.REJECT} rejected
      </div>

      {weakestLink && (
        <div className="weakest-link-bar">
          <div className="wlb-label mono">WEAKEST LINK</div>
          <div className="wlb-stat">
            <span>{weakestLink.pair}</span>
            <span className="mono">{weakestLink.rejectRate}% reject</span>
          </div>
          <div className="wlb-bar"><div style={{ width: `${weakestLink.rejectRate}%` }} /></div>
        </div>
      )}

      <div className="correction-feed">
        {entries.slice(0, 20).map((it, i) => (
          <div key={i} className={`cf-row cf-${it.action.toLowerCase()}`}>
            <div className="cf-time mono">{fmtTime(it.ts)}</div>
            <div className="cf-body">
              <div className="cf-edge mono">
                <span className={`cf-kind cf-kind-${it.action.toLowerCase()}`}>{it.action}</span>
                <span>
                  {it.source ? `[[${stripBrackets(it.source)}]]` : ''}
                  {it.target ? ` → [[${stripBrackets(it.target)}]]` : ''}
                </span>
              </div>
              <div className="cf-note">{it.reason}</div>
              {it.hook_id && (
                <div className="cf-hook mono">hook {it.hook_id} generated · negative constraint</div>
              )}
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="cf-empty mono">no corrections yet</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MobileView });
