---
title: apex — Map of Content
type: moc
project: apex
date: 2026-04-07 (updated 2026-04-07, compile 2026-04-07)
status: active
---

## The Argument

APEX is a systematic equity trading system built around a single design commitment: signals directly affect decisions, with no artificial caps, no hand-tuned overrides, and no gap between what the system knows and what it acts on. The gate pipeline is a five-lock numbered chain (Eligibility → Quant → Sentiment → Leading → Claude) orchestrated by a single shared `evaluate_chain()` function — the architectural decision that eliminated the class of parity bugs from duplicated demo/live logic. The central tension is between signal quality and execution discipline — the system continuously refines how it reads the market (Bayesian regime tracking, calibrated thresholds, LLM sentiment synthesis) while maintaining structural integrity through a nightly audit loop that encodes every incident as a permanent mechanical check. APEX improves not by rewriting its rules but by adding to them.

## Core Articles

- [[apex-overview]] — foundational because it defines the five-lock numbered architecture that every other article assumes; the shared evaluate_chain() orchestrator is the load-bearing structure; all other modules serve or protect this sequence
- [[nightly-audit-architecture]] — foundational because the audit loop is the mechanism by which APEX compounds its own reliability; without it, every bug is a one-time lesson rather than a permanent structural constraint
- [[regime-bayes]] — foundational because Bayesian sector allocation is what elevates APEX from a screener to a system with memory; the leaderboard posterior drives Lock 3's allocation context; theory layer in [[bayesian-inference]]
- [[lock4-leading]] — foundational because the leading lock's 2-of-4 sub-check structure is the most architecturally distinctive gate; it operationalizes market-microstructure signals that other systematic systems ignore
- [[sentiment-prefetch]] — foundational because Lock 2's conviction-gating on synthesized sentiment (Reddit, RSS, X, analyst data, short interest) is the highest-latency gate; pre-fetch timing determines whether it runs on signal or on noise

## Topic Clusters

### Gate Logic
The five sequential locks that every ticker must pass before execution. Orchestrated by `evaluate_chain()` in `backend/gate/chain.py` — both demo and live runners call the same function. Articles here describe what each gate checks, how thresholds are set, and what failure looks like.

- [[apex-overview]] — five-lock architecture overview; the structural skeleton; Eligibility → Quant → Sentiment → Leading → Claude
- [[gate-chain-restructuring]] — 2026-04-13 restructuring that established the numbered 5-lock system and shared chain runner; design decisions (Eligibility gate merging macro checks, shared evaluate_chain, test boundary patching); three encoded learnings; see [[gate-chain-wiring-incident]] for the sequel
- [[gate-chain-wiring-incident]] — 2026-04-18 incident; evaluate_chain() unwired for seven days; four encoded learnings; legacy lock modules retired; CHECK 23 and CHECK 24 added
- [[gate-decision-string-parity]] — 2026-04-20 incident; `FILTERED_MACRO` → `FILTERED_ELIGIBILITY` rename in `_OUTCOMES` left all six consumer sites (four JS, two SQL) on the old string; tickers failing L1 displayed five green lock icons via the all-green default fallback; pre-week readiness audit missed it because all 24 prior checks were Python-internal; CHECK 25 (gate_decision string parity) added; archetypal closed-world-audit failure
- [[lock4-leading]] — Lock 4; 4 sub-checks (relative strength, put/call OI ratio, unusual call volume, Form 4 cluster); 2-of-4 required; microstructure pre-qualification filter before Lock 5 Claude reasoning
- [[lock5-claude-reasoning]] — Lock 5 (formerly Lock 3); Claude reasoning gate (claude-opus-4-6 primary → claude-sonnet-4-6 → gpt-4o cascade); system prompt encodes five responsibilities; context includes full Bayesian allocation layer; position_size_pct preserved in result["lock3"] for backward compat
- [[portfolio-overflow-filter]] — dynamic capacity extension beyond max_positions; escalating quant threshold per overflow slot (base × (1 + level × increment)); self-limiting without a hard ceiling; CHECK 21 enforces increment bounds; gate UI updated to L1–L5 with correct labels
- *(stub)* [[lock1-threshold-calibration]] — per-sector ticker_thresholds table; global lock1_threshold is fallback only; thresholds are backtest-calibrated, not hand-tuned

### Regime and Bayesian Intelligence
The market-awareness layer. These articles describe how APEX reads sector momentum, regime transitions, and allocation probability — the context that makes Lock 3 more than a binary gate.

- [[regime-bayes]] — Bayesian sector leaderboard; posteriors updated EOD; drives allocation weighting in Lock 3; theory layer in [[bayesian-inference]]
- *(stub)* [[sector-regime]] — velocity scoring, regime confidence scoring, rotation forecast; predecessor chain for rotation signal
- [[breakout-volume-confirmation]] — BREAKOUT label validity requires both a streak condition and a volume floor (≥0.50 EOD volume_score); label-claim consistency principle; `sector_regime.py` fix; observability as bug-discovery mechanism
- *(stub)* [[rotation-forecast]] — conditioned transition matrix and rotation score; pre-rotation gate promotion logic

### Sentiment and Data Pipeline
Lock 2's data acquisition layer. These articles describe how APEX synthesizes heterogeneous signal sources into a conviction-gated sentiment score.

- [[lock3-sentiment-architecture]] — full Lock 2 architecture: expanded input set (yfinance analyst data, short interest, upgrades/downgrades, Reddit, RSS, X), conviction-gate schema, morning pre-fetch design, CHECK 17 cache freshness logic
- [[sentiment-prefetch]] — morning pre-fetch for watchlist tickers (9:35 AM ET, Mon-Fri); 9-feed RSS via Jina + Reddit via rdt-cli; degradation hierarchy (X-only fallback on cache miss); CHECK 17 enforces freshness
- *(stub)* [[grok-sentiment]] — Grok as the synthesis layer; inputs: yfinance analyst data, short interest, Reddit (rdt-cli), RSS (Jina), live X search; conviction field in response schema is what the gate reads
- *(stub)* [[sentiment-cache-freshness]] — weekday-only staleness check; >26h stale = alert; weekend staleness is expected and suppressed; encodes market-calendar awareness

### Audit and Structural Integrity
The self-improvement layer. APEX's audit system is the mechanism by which incidents become permanent constraints — the system's own immune system.

- [[nightly-audit-architecture]] — two-layer audit pipeline (25 mechanical checks + GPT-4o LLM scan); fixer agent; startup catch-up for missed crons; the cross-domain equivalent of vault hook enforcement
- [[gate-chain-wiring-incident]] — 2026-04-18 incident; evaluate_chain() had zero callers for seven days after the 2026-04-13 restructuring; four encoded learnings including the universal wiring rule; CHECK 23 (CHECKS.md registry completeness) and CHECK 24 (chain-runner wiring integrity) added
- [[yahoo-ratelimit]] — 2026-04-15 incident; Yahoo 429 diagnosis errors; RegimeBayes result persistence fix (cache file); yfinance pin ≥1.2.2; CHECK 22 (regime data freshness); three encoded diagnostic rules
- [[llm-audit-calibration]] — the false-positive storm incident: verify_llm_findings.py undeployed, no LLM context documents, missing registry row; fixes establish the three structural requirements for LLM check reliability
- [[audit-pipeline-completeness-check18]] — CHECK 18: every script in audit/ must be referenced in AUDIT_INSTRUCTIONS.md; the audit's self-referential integrity check; motivated by the llm-audit-calibration incident
- *(stub)* [[config-parity-checks]] — demo/live/base must share all keys; new config keys must be added in three places; CHECK 1 in mechanical suite
- *(stub)* [[fixer-agent]] — GitHub PR opener for auto-correctable audit findings; acts only on verified (not raw LLM) findings
- [[observability]] — the principle unifying UI-layer and audit-layer bug discovery: every signal component that feeds a classification must be visible before the action it drives; the EQIX incident (SectorGrid tooltip) and the nightly audit suite are two points on the same latency gradient

### Scheduler and Infrastructure
The operational layer. These articles describe how APEX runs reliably at scale — APScheduler, startup catch-up, DB integrity.

- *(stub)* [[scheduler]] — APScheduler with cron + interval jobs; startup catch-up pattern for three missed-cron scenarios
- *(stub)* [[db-schema-integrity]] — SQLite WAL; schema validation in nightly audit; drift caught before runtime errors

## Cross-Domain Connections

- [[knowledge-work-moc]] — APEX's nightly audit loop (every bug → new CHECK, additive only, fail loudly) is the most developed instance of automated knowledge maintenance in the corpus; the vault's hook enforcement (COMPILATION_PROMPT.md Step 2C) is the same architecture applied to wiki compilation; these two systems should be updated together when new failure patterns emerge
- [[github-actions-writeback-lessons]] — the infrastructure layer that makes the nightly audit's GitHub Actions pipeline reliable; the three failure modes (permissions, global gitignore, idempotent guard) apply directly to audit workflow design
- [[tcx-moc]] — TCX's Validation Gate (Inspector meta-agent) is a human-in-the-loop version of APEX's audit loop; both are multi-agent quality-assurance architectures that separate "agent runs" from "human acts" with an inspection layer; the structural pattern is identical; latency and stakes differ
- [[observability]] — the cross-project concept article that names the pattern operating across APEX's two observability layers (UI tooltip + nightly audit); the latency gradient table in that article positions APEX at both the real-time (minutes) and overnight (hours) ends of the spectrum
- [[concept]] — the foundational unit article; APEX classification concepts (BREAKOUT, ACCUMULATION, DISTRIBUTION) are treated as instances: operative when they have a classification function and license a trade decision; the four vault criteria for concept status apply to APEX classification design; directly bridges to teaching-moc (concept acquisition as the actual target of instruction)

## Synthesis Claims

1. APEX's reliability improves not through refactoring but through accumulation: every incident adds a mechanical check that cannot be removed. The 25-check audit suite is therefore a compressed history of APEX's failure modes — readable as an archaeological record of what the system has already learned to prevent.

2. The two-layer audit design (mechanical checks that fail loudly + LLM checks that flag for review) encodes an epistemological position: deterministic assertions about system state are different in kind from probabilistic pattern recognition. Conflating them — acting on raw LLM findings — is a failure mode the architecture explicitly prevents via verify_llm_findings.py.

3. The startup catch-up system for missed cron jobs exposes a general principle: any scheduled knowledge-maintenance job (regime update, threshold recalibration, audit report) must explicitly handle the "server was down" case or it creates silent gaps in the historical record. This applies to the vault scheduler as much as to APEX's APScheduler.

## Session Learnings

- [[session-learning-2026-04-15-bayesian-corroboration]] — 2026-04-15 concept session methodology; how corroboration-architecture surfaced from an implicit cross-domain note in lock-leading; theory-layer gap pattern; yahoo-ratelimit/portfolio-overflow-filter folding decision; seven spurious memory-ref stubs documented

## Open Territory

- ~~[[regime-bayes]] Bayesian layer gap~~ Resolved: [[regime-bayes]] active in wiki/domains/apex/; [[bayesian-inference]] concept article compiled 2026-04-15 as the theory layer — prior × likelihood → posterior, sequential LR update, persistence, and cross-domain instances documented
- ~~[[lock4-leading]] compiled 2026-04-08~~ Resolved
- ~~[[sentiment-prefetch]] compiled 2026-04-09~~ Resolved
- [[lock3-sentiment-architecture]] now documents the full sentiment pipeline
- The relationship between backtest-calibrated thresholds and live drift is unresolved in the corpus: thresholds are set by backtest, monitored by audit CHECK 9, but no article describes the calibration process itself; [[breakout-volume-confirmation]] raises the same gap for `BREAKOUT_MIN_VOLUME` — the 0.50 floor was set without backtest validation
- ~~A nightly audit CHECK for BREAKOUT volume_score consistency not yet implemented~~ Resolved: CHECK 19 (BREAKOUT volume floor) added 2026-04-07; post-hoc enforcement now runs every nightly audit
- ~~Lock 3 (Claude reasoning gate) is the highest-stakes gate and the least documented~~ Resolved: [[lock5-claude-reasoning]] compiled 2026-04-09; full context structure (6 layers), system prompt responsibilities, fail-closed fallback chain, and position sizing interaction with Bayesian allocation documented from codebase
- ~~The audit suite had no meta-check for its own tool inventory~~ Resolved: [[audit-pipeline-completeness-check18]] (CHECK 18) + CHECK 20 (import path integrity) both enforce structural rules about the audit's own tool inventory
- ~~**Legacy lock modules**~~ Resolved 2026-04-18: lock1_quant, lock_macro, lock2_sentiment, lock_leading, lock3_claude deleted; test_gate_locks.py deleted; CHECK 24 (chain-runner wiring integrity) now runs nightly to prevent recurrence
- **Live runner sector exposure caps**: demo runner enforces `dynamic_caps` via wallet.execute_trade; live runner only checks max_positions; the gap surfaces only when two positions in the same sector qualify simultaneously — currently low risk, flagged INFO in audit
