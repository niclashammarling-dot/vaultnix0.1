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
  return (
    <div className="ios-view stub">
      <div className="ios-h-row">
        <div className="ios-h1">Stub</div>
        <div className="mono ios-priority">#1 · 94</div>
      </div>
      <div className="ios-sub mono">the vault needs 30s of your judgment</div>

      <div className="stub-card">
        <div className="stub-card-kicker mono">[[surfacing-skill]]</div>
        <div className="stub-card-q">
          What is the <em>central tension</em> between surfacing uncertainty and producing clean outputs?
        </div>
        <div className="stub-card-meta mono">
          <span>7 inbound · 4 domains · 12d open</span>
        </div>

        <div className="stub-card-inputs">
          <div className="sci-label mono">ONE SENTENCE — THE ARGUMENT</div>
          <textarea className="sci-input" defaultValue="Surfacing is harder than sanitizing because honest outputs look like failures in systems that reward confidence." />
        </div>
      </div>

      <div className="ios-stub-actions">
        <button className="ios-btn-ghost">Skip</button>
        <button className="ios-btn-primary">File → raw/</button>
      </div>
    </div>
  );
}

function MobileValidate() {
  return (
    <div className="ios-view validate">
      <div className="ios-h-row">
        <div className="ios-h1">Validate</div>
        <div className="mono ios-queue">3/7</div>
      </div>
      <div className="ios-sub mono">agent confidence: 0.82 · swipe to decide</div>

      <div className="validate-card">
        <div className="vc-header mono">PROPOSED LINK · spreading-activation</div>
        <div className="vc-edge">
          <div className="vc-node">[[bayesian-allocation]]</div>
          <div className="vc-relation mono">
            <span>relates-to</span>
            <div className="vc-confidence">
              <div className="vcc-bar"><div style={{ width: '82%' }} /></div>
              <span>0.82</span>
            </div>
          </div>
          <div className="vc-node">[[student-reading-progress]]</div>
        </div>
        <div className="vc-rationale">
          <em>Agent reasoning:</em> both articles reference "prior × likelihood" in classification-and-action contexts. Cross-domain link (apex × teaching).
        </div>
        <div className="vc-meta mono">
          shared: bayesian-inference, classification-and-action, prior
        </div>
      </div>

      <div className="swipe-actions">
        <button className="swipe-btn reject">
          <span className="sa-arrow">←</span>
          <span className="sa-label">Reject</span>
          <span className="sa-desc">encode as Hook</span>
        </button>
        <button className="swipe-btn accept">
          <span className="sa-label">Accept</span>
          <span className="sa-arrow">→</span>
          <span className="sa-desc">commit link</span>
        </button>
      </div>
    </div>
  );
}

function MobileCorrections() {
  const items = [
    { time: '09:12', kind: 'reject', from: 'flow', to: 'volatility-targeting', note: 'No structural basis. Encoded as hook.', hook: 'NC-412' },
    { time: '08:47', kind: 'accept', from: 'honesty', to: 'surfacing-skill', note: 'Matches MOC argument.', hook: null },
    { time: 'Y 22:04', kind: 'reject', from: 'trust', to: 'sector-grid', note: 'Similarity ≠ structure.', hook: 'NC-411' },
    { time: 'Y 19:33', kind: 'fill', from: 'moc-as-argument', to: null, note: 'Stub filled. Compiled.', hook: null },
    { time: 'Y 14:02', kind: 'accept', from: 'audit-loop', to: 'bayesian-inference', note: 'Confirmed grounding.', hook: null },
  ];

  return (
    <div className="ios-view corrections">
      <div className="ios-h1">Corrections</div>
      <div className="ios-sub mono">5 today · 2 new hooks · weakest: apex↔teaching</div>

      <div className="weakest-link-bar">
        <div className="wlb-label mono">WEAKEST LINK</div>
        <div className="wlb-stat">
          <span>apex ↔ teaching</span>
          <span className="mono">42% reject</span>
        </div>
        <div className="wlb-bar"><div style={{ width: '42%' }} /></div>
      </div>

      <div className="correction-feed">
        {items.map((it, i) => (
          <div key={i} className={`cf-row cf-${it.kind}`}>
            <div className="cf-time mono">{it.time}</div>
            <div className="cf-body">
              <div className="cf-edge mono">
                <span className={`cf-kind cf-kind-${it.kind}`}>{it.kind.toUpperCase()}</span>
                <span>[[{it.from}]]{it.to ? ` → [[${it.to}]]` : ''}</span>
              </div>
              <div className="cf-note">{it.note}</div>
              {it.hook && <div className="cf-hook mono">hook {it.hook} generated · {it.kind === 'reject' ? 'negative constraint' : ''}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { MobileView });
