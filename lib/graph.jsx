// MEM1 — Graph overlay. Small-world visualization of concepts across domains.
// Deterministic layout (no d3), CSS transforms only.
// Observability: cooling nodes (silent drift) + edge-hover signal tooltip.

function GraphOverlay({ concepts, domains, activeConceptId, onSelect, compact = false, showCooling = true }) {
  const size = compact ? 280 : 420;
  const cx = size / 2, cy = size / 2;
  const [hoverEdge, setHoverEdge] = React.useState(null);

  // Domain anchors around a ring
  const domainPositions = React.useMemo(() => {
    const R = size * 0.42;
    const result = {};
    domains.forEach((d, i) => {
      const angle = (i / domains.length) * Math.PI * 2 - Math.PI / 2;
      result[d.id] = {
        x: cx + Math.cos(angle) * R,
        y: cy + Math.sin(angle) * R,
        angle,
      };
    });
    return result;
  }, [domains, size]);

  // Concept positions
  const conceptPositions = React.useMemo(() => {
    return concepts.map((c) => {
      const anchors = c.domains.map(id => domainPositions[id]).filter(Boolean);
      if (anchors.length === 0) return { x: cx, y: cy };
      const avgX = anchors.reduce((s, a) => s + a.x, 0) / anchors.length;
      const avgY = anchors.reduce((s, a) => s + a.y, 0) / anchors.length;
      const pull = Math.min(0.6, c.domains.length * 0.12);
      const x = avgX + (cx - avgX) * pull;
      const y = avgY + (cy - avgY) * pull;
      const hash = c.id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const jitter = ((hash % 13) - 6) * 2.4;
      const jitter2 = ((hash % 7) - 3) * 3.1;
      return { x: x + jitter, y: y + jitter2 };
    });
  }, [concepts, domainPositions, size]);

  // Edges with signal metadata
  const edges = React.useMemo(() => {
    const result = [];
    concepts.forEach((c, ci) => {
      c.domains.forEach(dId => {
        const d = domainPositions[dId];
        const p = conceptPositions[ci];
        if (d && p) {
          const sig = (typeof EDGE_SIGNALS !== 'undefined' && EDGE_SIGNALS[`${c.id}|${dId}`]) || null;
          result.push({
            x1: p.x, y1: p.y, x2: d.x, y2: d.y,
            active: c.id === activeConceptId,
            conceptId: c.id, conceptLabel: c.label, domainId: dId,
            signal: sig,
          });
        }
      });
    });
    return result;
  }, [concepts, conceptPositions, domainPositions, activeConceptId]);

  const coolingColor = (days) => {
    if (!showCooling || days < 7) return null;
    if (days < 21) return 'oklch(72% 0.05 230)';
    if (days < 40) return 'oklch(62% 0.08 240)';
    return 'oklch(52% 0.11 245)';
  };

  const hoveredEdge = hoverEdge != null ? edges[hoverEdge] : null;
  const tooltipX = hoveredEdge ? (hoveredEdge.x1 + hoveredEdge.x2) / 2 : 0;
  const tooltipY = hoveredEdge ? (hoveredEdge.y1 + hoveredEdge.y2) / 2 : 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {[0.15, 0.28, 0.42].map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={size * r}
            fill="none" stroke="var(--line)" strokeOpacity="0.35" strokeDasharray="2 4" />
        ))}
        {edges.map((e, i) => {
          const isHover = i === hoverEdge;
          return (
            <g key={i}>
              <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke={e.active || isHover ? 'var(--accent)' : 'var(--line)'}
                strokeOpacity={e.active || isHover ? 0.95 : 0.3}
                strokeWidth={e.active || isHover ? 1.6 : 0.7} />
              {/* Wide invisible hover target */}
              <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke="transparent" strokeWidth="10"
                style={{ cursor: 'help' }}
                onMouseEnter={() => setHoverEdge(i)}
                onMouseLeave={() => setHoverEdge(h => h === i ? null : h)} />
            </g>
          );
        })}
      </svg>

      {/* Domain anchors */}
      {domains.map(d => {
        const p = domainPositions[d.id];
        return (
          <div key={d.id} style={{
            position: 'absolute', left: p.x, top: p.y,
            transform: 'translate(-50%,-50%)',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
            color: 'var(--fg)', textTransform: 'uppercase',
            background: 'var(--surface)', border: '1px solid var(--line)',
            padding: '4px 8px', borderRadius: 2, whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>{d.label}</div>
        );
      })}

      {/* Concept nodes — cooling tinted */}
      {concepts.map((c, ci) => {
        const p = conceptPositions[ci];
        const isActive = c.id === activeConceptId;
        const r = 4 + c.weight * 1.2;
        const cool = coolingColor(c.lastActivated || 0);
        const bg = isActive ? 'var(--accent)' : (cool || 'var(--fg)');
        return (
          <button key={c.id}
            onClick={() => onSelect && onSelect(c.id)}
            title={`${c.label}${cool ? ` · cooling (${c.lastActivated}d)` : ''}`}
            style={{
              position: 'absolute', left: p.x, top: p.y,
              transform: 'translate(-50%,-50%)',
              width: r * 2, height: r * 2,
              border: cool ? `1px solid ${cool}` : 'none',
              background: bg,
              borderRadius: '50%', cursor: 'pointer', padding: 0,
              transition: 'transform 160ms',
              outline: isActive ? '4px solid var(--accent-soft)' : 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1)'; }}
          />
        );
      })}

      {/* Active concept label */}
      {activeConceptId && (() => {
        const ci = concepts.findIndex(c => c.id === activeConceptId);
        if (ci < 0) return null;
        const c = concepts[ci];
        const p = conceptPositions[ci];
        return (
          <div style={{
            position: 'absolute', left: p.x, top: p.y + 12,
            transform: 'translate(-50%, 0)',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em',
            color: 'var(--accent)', background: 'var(--surface)',
            border: '1px solid var(--accent)', padding: '3px 6px',
            borderRadius: 2, whiteSpace: 'nowrap', pointerEvents: 'none',
            textTransform: 'uppercase',
          }}>{c.label}</div>
        );
      })()}

      {/* Edge-signal tooltip */}
      {hoveredEdge && hoveredEdge.signal && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltipX, size - 20),
          top: tooltipY,
          transform: 'translate(-50%, -100%) translateY(-8px)',
          background: 'var(--fg-strong)', color: 'var(--bg)',
          padding: '10px 12px', minWidth: 220, maxWidth: 280,
          fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.45,
          pointerEvents: 'none', zIndex: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', opacity: 0.6, marginBottom: 4 }}>
            LINK SIGNAL · Why did the agent draw this?
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 6 }}>
            [[{hoveredEdge.conceptId}]] → <span style={{ textTransform: 'uppercase' }}>{hoveredEdge.domainId}</span>
          </div>
          <div style={{ fontSize: 11, marginBottom: 6, opacity: 0.85 }}>
            {hoveredEdge.signal.rationale}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {hoveredEdge.signal.shared.map(s => (
              <span key={s} style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                padding: '2px 6px',
                background: 'color-mix(in oklab, var(--accent) 40%, transparent)',
                letterSpacing: '0.06em',
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Cooling legend */}
      {showCooling && !compact && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
          color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>DRIFT</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fg)' }} />
          <span>hot</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(72% 0.05 230)' }} />
          <span>7d</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(52% 0.11 245)' }} />
          <span>cold</span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { GraphOverlay });
