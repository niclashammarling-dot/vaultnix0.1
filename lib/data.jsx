// Vaultnix 0.1 — sample vault content. Content is real-feeling but abbreviated.
// Based on Niclas-KB vault structure.

const DOMAINS = [
  {
    id: 'apex',
    label: 'APEX',
    kind: 'Systematic trading',
    arg: 'A signal-to-decision pipeline with no gap between what the system knows and what it acts on. Four gates, 19 mechanical checks, nightly audit as the load-bearing integrity layer.',
    articles: 12, concepts: 4, stubs: 3,
    tension: 'signal integrity vs. complexity',
    color: 'apex',
  },
  {
    id: 'tcx',
    label: 'TCX',
    kind: 'Teacher cognitive exoskeleton',
    arg: 'A multi-agent system that surfaces diagnostic disagreement rather than resolving it on the teacher\'s behalf. The Validation Gate verifies correctness, not comfort.',
    articles: 9, concepts: 3, stubs: 5,
    tension: 'assistance vs. agency',
    color: 'tcx',
  },
  {
    id: 'teaching',
    label: 'Teaching',
    kind: 'Dannikeskolan 4A/5A',
    arg: 'Assessment as longitudinal narrative, not snapshot. The domain where honesty is structurally hardest — the assessment *is* the public output, no private draft before the student reads it.',
    articles: 14, concepts: 2, stubs: 2,
    tension: 'measurement vs. judgment',
    color: 'teaching',
  },
  {
    id: 'hiking',
    label: 'Hiking',
    kind: 'Alter-native Hiking',
    arg: 'A brand that refuses the checklist. "Walk slowly. Go deep." as product principle, not tagline — route design, pacing, gear all subordinate to the pattern.',
    articles: 7, concepts: 1, stubs: 1,
    tension: 'slowness vs. legibility',
    color: 'hiking',
  },
  {
    id: 'knowledge-work',
    label: 'Knowledge Work',
    kind: 'Meta-domain',
    arg: 'The vault as external cognition infrastructure, not database. Agent-traversable argumentative structure compounds; human-legible folders do not. Full automation of maintenance is the only viable resolution to the structure-versus-friction tension.',
    articles: 23, concepts: 12, stubs: 8,
    tension: 'structure vs. friction',
    color: 'meta',
  },
];

const CONCEPTS = [
  { id: 'honesty', label: 'Honesty', domains: ['apex','tcx','teaching','knowledge-work'], weight: 5, lastActivated: 0 },
  { id: 'transparency', label: 'Transparency', domains: ['apex','tcx','teaching','knowledge-work'], weight: 4, lastActivated: 2 },
  { id: 'observability', label: 'Observability', domains: ['apex','tcx','teaching','knowledge-work'], weight: 5, lastActivated: 0 },
  { id: 'trust', label: 'Trust', domains: ['apex','tcx','teaching'], weight: 3, lastActivated: 34 },
  { id: 'audit-loop', label: 'Audit loop', domains: ['apex','tcx','knowledge-work'], weight: 4, lastActivated: 1 },
  { id: 'external-cognition', label: 'External cognition', domains: ['knowledge-work','teaching','apex'], weight: 4, lastActivated: 5 },
  { id: 'complementary-functions', label: 'Complementary functions', domains: ['apex','tcx','knowledge-work'], weight: 3, lastActivated: 0 },
  { id: 'spreading-activation', label: 'Spreading activation', domains: ['knowledge-work'], weight: 2, lastActivated: 41 },
  { id: 'bayesian-inference', label: 'Bayesian inference', domains: ['apex','tcx','teaching'], weight: 3, lastActivated: 0 },
  { id: 'corroboration-architecture', label: 'Corroboration architecture', domains: ['apex','tcx','knowledge-work'], weight: 3, lastActivated: 0 },
  { id: 'knowledge', label: 'Knowledge', domains: ['knowledge-work','teaching','apex','tcx'], weight: 2, lastActivated: 28 },
  { id: 'concept', label: 'Concept', domains: ['knowledge-work'], weight: 2, lastActivated: 52 },
];

// Edge signal metadata — why did the agent draw this link?
const EDGE_SIGNALS = {
  'honesty|apex':            { shared: ['truth-first', 'calibration', 'no-floor'], rationale: 'APEX nightly audit requires honesty as structural precondition.' },
  'honesty|tcx':             { shared: ['truth-first', 'transparency'], rationale: 'TCX Inspector formalizes honesty via 5-dim validation.' },
  'honesty|teaching':        { shared: ['self-honesty', 'calibration'], rationale: 'Teaching requires honest signal about student state.' },
  'honesty|knowledge-work':  { shared: ['surfacing', 'truth-first'], rationale: 'Vault treats honesty as the design commitment.' },
  'observability|apex':      { shared: ['inspection', 'audit-loop', 'fail-loud'], rationale: 'Mechanical checks = Audit Observability layer.' },
  'observability|tcx':       { shared: ['inspection', 'validation'], rationale: 'Inspector surfaces invisible state before action.' },
  'bayesian-inference|apex': { shared: ['prior', 'likelihood', 'posterior'], rationale: 'Regime-bayes-lr: formal prior×likelihood → posterior.' },
  'bayesian-inference|tcx':  { shared: ['prior', 'update'], rationale: 'Inspector updates belief from test evidence.' },
  'bayesian-inference|teaching': { shared: ['prior', 'likelihood'], rationale: 'Student model as Bayesian update over reading evidence.' },
  'corroboration-architecture|apex': { shared: ['agreement-before-action', 'two-layer'], rationale: '2-of-4 lock-leading is instance.' },
  'corroboration-architecture|tcx':  { shared: ['5-dimension', 'validation-gate'], rationale: 'Inspector enforces agreement across dimensions.' },
  'complementary-functions|apex': { shared: ['specialization', 'interface'], rationale: 'Bayes + Flow: specialized, audited at interface.' },
  'complementary-functions|tcx':  { shared: ['specialization', 'interface'], rationale: 'Judge + Inspector: specialized, audited.' },
};

const SAMPLE_ARTICLE = {
  path: 'wiki/_concepts/honesty.md',
  title: 'Honesty',
  type: 'concept',
  status: 'active',
  date: '2026-04-07',
  domains: ['apex','tcx','teaching','knowledge-work'],
  tags: ['concept','design-philosophy'],
  moc: ['knowledge-work-moc','apex-moc','tcx-moc','teaching-moc'],
  inboundLinks: 14,
  outboundLinks: 9,
  sections: [
    {
      heading: 'The Argument',
      body: `Honesty is the commitment that whatever comes from truth is superior to any other alternative, regardless of how it looks on the surface. It operates at two levels, and the order matters: honesty with yourself first, honesty with others second. Self-honesty is the foundation from which everything else follows. You cannot be honest with others about something you have rationalized away internally. You cannot be [[transparent]] about a conclusion you have not allowed yourself to reach.

This is not a value claim — it is a design commitment with measurable consequences. Systems built around truth-first outperform systems built around appearance-first over time, because errors compound in appearance-first systems and self-correct in truth-first systems. The cost of honesty is short-term discomfort. The benefit is that the system stays calibrated.`,
    },
    {
      heading: 'The Shared Structure',
      body: `Every system in this corpus that implements honesty does so with the same structural property: there is no gap between what the system knows and what it acts on — neither internally (self-honesty) nor externally (honesty with others). No artificial floor that prevents a signal from reaching a decision. No override that substitutes appearance for measurement. No sanitization layer between truth and action.

The failure mode is also shared: the gap. A gap opens whenever a system introduces a layer between what it knows and what it does.`,
    },
    {
      heading: 'Instances by Domain',
      body: `**APEX.** The apex-moc argument encodes honesty as a design commitment in its opening sentence — signals directly affect decisions, with no artificial caps. When backtesting revealed that volatility targeting hurt Sharpe (0.196→0.078), the self-honest response was to accept the finding and remove it.

**Teaching.** VT26 omtest data showed that multiple 5A students who scored M1 on Legilexi were not genuinely M1 — they scored M4–M6 on retest. Accepting that finding means accepting that the HT25 at-risk assessment overstated the problem. See [[kunskapsuppföljning-vt26]].

**TCX.** Agents are designed to surface diagnostic patterns, not produce comfortable outputs. The Principal does not resolve tensions between domain agents before surfacing them.`,
    },
    {
      heading: 'Open Territory',
      body: `The vault lacks an explicit skill for *surfacing* uncomfortable findings — the behavioral counterpart to the structural no-gap principle. [[incident-learning-ritual]] is the closest instance but addresses recovery, not surfacing. Stub: [[surfacing-skill]].`,
    },
  ],
};

const RECENT_CAPTURES = [
  { time: '10:10', domain: 'knowledge-work', excerpt: 'Vaultnix compile ran — spreading activation hit 5 articles, one orphan surfaced (query-invisible-articles).', status: 'compiled' },
  { time: '12:43', domain: 'apex', excerpt: 'Gate chain restructuring: the 4th gate was ordered before the volatility check. Swapped — ran mechanical_checks.py, all 19 pass.', status: 'compiled' },
  { time: '13:12', domain: 'teaching', excerpt: 'Legilexi retest revealed M4 for 3 students previously M1. HT25 assessment overstated risk.', status: 'pending' },
  { time: '19:46', domain: 'general', excerpt: 'idea. Vaultnix could expose a "surprise" slot in query responses — the thing the vault noticed you didn\'t ask.', status: 'idea' },
];

const INDEX_HIGHLIGHTS = {
  pendingReview: 3,
  suggestedNext: ['surfacing-skill', 'moc-as-argument', 'query-invisible-articles'],
  recentAdditions: ['honesty.md', 'corroboration-architecture.md', 'bayesian-inference.md'],
  stubCount: 19,
  benchmark: { score: 151, max: 200, lastRun: '2026-04-17', delta: +4 },
};

const BENCHMARK_QUERIES = [
  { q: 'What principles should inform TCX UI?', TD: 8, SQ: 9, GH: 10, SU: 7 },
  { q: 'How do APEX and teaching share an audit pattern?', TD: 9, SQ: 10, GH: 9, SU: 8 },
  { q: 'What does the vault know about flow?', TD: 6, SQ: 7, GH: 10, SU: 5 },
  { q: 'When is a stub useful vs. a failure?', TD: 10, SQ: 9, GH: 8, SU: 7 },
];

Object.assign(window, {
  VAULTNIX_DATA: { DOMAINS, CONCEPTS, SAMPLE_ARTICLE, RECENT_CAPTURES, INDEX_HIGHLIGHTS, BENCHMARK_QUERIES }
});
