---
title: Audit Loop
type: concept
projects: [general, knowledge-work, teaching, apex, TCX]
tags: [concept, apex/audit, general/knowledge-work, TCX/validation, teaching/assessment]
source: derived
date: 2026-04-09
related:
  - [[nightly-audit-architecture]]
  - [[observability]]
  - [[incident-learning-ritual]]
  - [[vault-nightly-draft-workflow]]
moc: [knowledge-work-moc, apex-moc, tcx-moc, teaching-moc]
status: active
---

## The Argument

The audit loop is the compounding mechanism that separates systems that improve over time from systems that drift — and it is most visible in its oldest and simplest form: a teacher observes a student error, classifies it, corrects it, and the student tries again with updated understanding. Every other instance in the corpus (APEX's 19 mechanical checks, the vault's hook enforcement, TCX's Validation Gate) is a formalization of this same loop. The principle is additive and asymmetric: every failure that surfaces gets encoded as a permanent structural constraint — a CHECK that fires automatically on any future occurrence of the same failure class, costs nothing to maintain, and never expires. The loop has no completion state — it grows in precision with every failure, making coverage compound rather than plateau.

## The Shared Structure

The audit loop is the fourth stage of the [[observability]] loop — correction+encoding — treated as a design commitment rather than a one-time action. Correction without encoding is local and temporary: the specific bug is fixed, but the failure class remains unchecked. Correction with encoding is structural and permanent: the failure class becomes a CHECK, and any future occurrence surfaces immediately regardless of who is looking or what else is happening.

The compounding asymmetry: encoding one incident costs 15–30 minutes and produces a check that persists indefinitely. The encoded check prevents the same failure class from costing anything on recurrence. As the suite grows, the cost of any individual failure class approaches zero while the composite coverage grows. This is not linear — a clean nightly audit is evidence not just that each check passes individually but that the entire covered failure space is clear.

The loop's structural side (the check suite) requires a behavioral trigger to grow: the [[incident-learning-ritual]]. Without the ritual, incidents get fixed one-time but not encoded. With the ritual, the question "what can we learn?" produces four artifacts automatically — memory, new CHECK, raw note, background compile. The ritual is the input; the audit loop is the accumulating output. Without the behavioral side, the loop is frozen at its current state. With it, every incident expands coverage permanently.

## Domain Instances

**Teaching — formative assessment**

The foundational instance. A student makes an error; the teacher observes it, classifies it (decoding failure? comprehension gap? vocabulary poverty? procedural mistake?), corrects the understanding, and the student re-attempts. When the same error class recurs across multiple students or multiple sessions, it encodes into the teacher's instructional approach — a different explanation, a new scaffold, a changed sequence. The teacher's intervention repertoire grows with each incident class encountered. The [[omtest-methodology]] is a structural version of this: when an initial Legilexi score falls low (M1–M2), a retest is mandated rather than accepting the snapshot as definitive. The retest is the "try again" step formalized into the assessment instrument itself.

The teaching instance has one property the technical instances do not: the feedback latency is shortest and the correction target is a human learner, not a mechanical system. Signal, classification, correction, and re-encoding happen within a single lesson rather than across a nightly batch or a deployment cycle. See [[kunskapsuppföljning-vt26]] for the two-cycle longitudinal record of this loop operating at classroom scale.

**APEX — mechanical_checks.py**

The most operationally mature instance. 19 deterministic checks, each encoding a specific past incident. Exit code 1 on failure — no warnings. Silence means clean. The suite is additive only: no check is ever removed, because removing a check re-opens the failure class its motivating incident closed. The five-stage pipeline (mechanical → LLM → verify → alert → fixer) places the mechanical check suite at stage 1 because deterministic failures block before probabilistic findings reach human attention.

Two recent additions illustrate the encoding mechanism: CHECK 18 (audit pipeline completeness) — `verify_llm_findings.py` existed in `audit/` but was unreferenced, making it dead code; CHECK 18 now exits code 1 if any `.py` in `audit/` is unreferenced. CHECK 19 (BREAKOUT volume floor) — volume_score 0.188 was classified BREAKOUT on streak logic alone; CHECK 19 now enforces `volume_score ≥ 0.50` on every BREAKOUT-classified ticker post-hoc. Neither check existed before its motivating incident. See [[nightly-audit-architecture]].

**Vault — hook enforcement**

The vault's compilation pipeline runs a structural hook suite after every article write. Structural hooks fail and block: missing frontmatter fields, missing required sections, fewer than 3 outbound wikilinks, MOC field unpopulated. Quality hooks surface for review: summaries that describe rather than argue, filler Open Questions. The architecture is identical to APEX's: additive-only, fail-loud, blocking. The hook suite grows when a compilation produces a structural failure that gets encoded as a new hook.

**TCX — Inspector and Validation Gate**

The Inspector meta-agent implements the audit loop at the agent-configuration layer: each specialist agent is audited against a benchmark suite, and proposed prompt changes must pass the Validation Gate (Classify → Benchmark → Delta → Activate) before activation. Whether failed validations automatically compound into new validation rules is not yet documented — if they do not, the TCX audit loop is static rather than compounding. See [[validation-gate]] and [[tcx-moc]].

**Latency gradient**

| Domain | Audit loop instance | Latency |
|---|---|---|
| Teaching | Formative assessment (observe-correct-try again) | Seconds–minutes (within lesson) |
| Vault | Hook enforcement | Seconds (post-write, blocks before commit) |
| TCX | Inspector + Validation Gate | Audit-cycle (days) |
| APEX | mechanical_checks.py (19 checks) | Hours (nightly) |

Unlike the broader observability latency gradient — where shorter latency is not always better — the audit loop benefits from shorter latency because earlier correction prevents compounding.

## What Audit Loop Is Not

**Not a test suite.** Test suites verify anticipated behavior before deployment; the audit loop encodes observed failures after production. Tests prevent regression of intended functionality; the audit loop prevents recurrence of unanticipated failure classes. The two are complementary: tests run on pre-deployment code, the audit loop runs on production state. A system with tests but no audit loop prevents anticipated regressions but accumulates unanticipated drift.

**Not a monitoring system.** Monitoring surfaces anomalies after the fact as an alert stream. The audit loop runs at defined intervals or integration points and blocks progression — it is an inspection gate that encodes its findings, not a passive observer.

**Not observability.** Observability is the four-stage framework (signal capture → classification → inspection → correction+encoding). The audit loop is specifically the fourth stage treated as a design commitment. Observability without the audit loop produces only temporary corrections; the audit loop is the mechanism that makes the fourth stage permanent and compounding.

## Appears In

- [[kunskapsuppföljning-vt26]] — two full assessment cycles (HT25 + VT26) operating at term cadence; the omtest protocol is the explicit inspection step; cohort reclassification between cycles is the correction+encoding stage
- [[legilexi]] — the omtest protocol is the audit loop formalized into the assessment instrument; "try again" encoded as a structural step rather than a teacher judgment call
- [[omtest-methodology]] — the retest protocol is the audit loop's inspection stage applied to individual student measurements
- [[nightly-audit-architecture]] — the APEX implementation; 19 mechanical checks, the most operationally mature instance in the corpus
- [[observability]] — names the audit loop as the correction+encoding stage of the four-stage loop; the compounding mechanism without which the observability loop produces only temporary corrections
- [[incident-learning-ritual]] — the behavioral trigger; the ritual is the human-side input that produces new checks
- [[vault-nightly-draft-workflow]] — the nightly draft workflow is itself an audit-loop implementation: additive-only, self-orienting, derivability-filtered
- [[llm-audit-calibration]] — the false-positive storm as a worked example: `verify_llm_findings.py` as dead code meant the audit loop had a hole in its own coverage; CHECK 18 closed it; the loop must be self-referential to be complete

## Connections

- [[observability]] — the four-stage observability loop ends in correction+encoding; the audit loop is what makes that stage permanent and propagating rather than local and temporary; together they cover the full cycle from signal capture through structural compounding
- [[incident-learning-ritual]] — the behavioral mechanism that drives the loop's growth; the two concepts are the behavioral and structural halves of the same compounding mechanism
- [[nightly-audit-architecture]] — the most fully documented production implementation; 19 mechanical checks are the loop's cumulative output in APEX
- [[teaching-moc]] — formative assessment is the foundational instance; the technical implementations are domain-specific formalizations of the observe-correct-try again sequence that defines classroom practice
- [[validation-gate]] — TCX's implementation; whether it compounds (failed validations become new rules) is the open question that determines whether TCX has a true audit loop or a static gate
- [[complementary-functions]] — the audit loop is the explicit inspection mechanism at the interface between a system and its own operational history
- [[knowledge]] — the audit loop converts incidents into knowledge: encoded checks are permanent structural knowledge about the system's failure space; the loop is the mechanism by which experiential knowledge accumulates and does not decay
- [[trust]] — each CHECK that catches a real incident compounds credibility; trust in the autonomous maintenance layer is built through witnessed correct executions
- [[concept]] — the audit loop is itself a concept: classification function (separates systems that improve from systems that drift), inferential potential (knowing a system has an audit loop licenses predictions about its long-term behavior)

## Open Questions

- Is there a maximum check suite size at which the audit loop becomes self-defeating — enough checks running nightly that the average run produces a spurious failure from accumulated false-positive rates? APEX's 19 checks are well below any apparent ceiling, but what does that ceiling look like as the suite grows?
- TCX's Validation Gate catches failures in real time, but there is no documented mechanism by which failed validations become new validation rules. Without that encoding step, the TCX audit loop is frozen at its initial configuration. Does TCX need an incident-learning-ritual equivalent, and if so, what is the TCX equivalent of a mechanical CHECK — a prompt addition, a hard-coded filter, or a per-agent context document?
- The vault's hook suite grows more slowly than APEX's mechanical check suite because vault production incidents are lower-frequency. Is the slower growth rate a correct match to the domain's incident frequency, or is it a signal that the vault's hook enforcement is under-specified?
