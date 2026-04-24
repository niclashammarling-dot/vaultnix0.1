---
title: Knowledge Work — Map of Content
project: general
tags: [general/knowledge-work, general/vault]
source: [this revision]
date: 2026-04-08
related: [[agent-operated-knowledge-systems]], [[vault-knowledge-workflow-design]], [[honesty-transparency-observability-applications]]
moc: [knowledge-work-moc]
status: active
---

## The Argument

The knowledge-work domain is an architectural position, not a collection of productivity techniques: externalized, agent-navigable knowledge compounds faster than knowledge held in human memory or closed applications. The central tension is structure versus friction — every layer that improves traversability (MOCs, hooks, spreading activation) also increases maintenance cost. The only viable resolution is full automation: agents write the wiki, schedulers run health checks, and rituals turn every incident and session into graph growth. This domain therefore contains both the theoretical foundations (external cognition, small-world topology, spreading activation) and the operational patterns (compilation loop, incident-learning-ritual, session-close-ritual, hook enforcement) that make the position real in practice.

## Core Articles

- [[agent-operated-knowledge-systems]] — the load-bearing pattern; every other article in this domain is an implementation or extension of it
- [[github-actions-writeback-lessons]] — foundational because reliable write-back is the prerequisite for any automated knowledge pipeline; without it, lint reports and health checks never enter the persistent graph
- [[vault-knowledge-workflow-design]] — the operational history and implementation record of the vault's infrastructure, rituals, and background compilation model
- [[nightly-audit-architecture]] — APEX's two-layer audit (mechanical checks + LLM scan) as the most mature production instance of automated structural maintenance; the explicit parallel to vault hook enforcement

## Topic Clusters

### Methodology and Session Learnings
Cross-domain observations about how knowledge work operates in practice — not domain-specific content, but learnings about the compilation and traversal process itself.

- [[session-learning-2026-04-09-tcx-correction]] — graph connectivity amplifies errors at the same speed as insights; unverified TCX architectural claim propagated to 6 articles in one pass; derivability filter updated to catch codebase-mechanism claims that sound plausible but are unverified against source
- [[incident-learning-ritual]] — the behavioral mechanism behind both the APEX audit loop and vault compilation; four-step trigger (memory + CHECK + raw note + compile) converts any incident into a permanent structural constraint; the ritual is what causes knowledge systems to compound rather than plateau
- [[honesty-transparency-observability-applications]] — the operational companion to the three concept articles; translates the triad into a three-question design audit applicable to any system; derives concrete domain-specific implications for APEX, TCX, teaching, and the vault

*(Vault operational articles — capture mechanics, interface deploy, automation infrastructure — live in [[vault-moc]]. Braindex product articles live in [[braindex-moc]]. Session learnings specific to a project domain live in that domain.)*

### Wiki Architecture and Graph Theory
The structural principles that determine whether an agent can traverse the graph efficiently.

- [[small-world-topology]] — high local clustering (MOCs) + low global path length (concept shortcuts); 4-hop target as a hard structural requirement, not aspiration; Watts-Strogatz model as theoretical foundation; chain/star/island failure modes
- [[spreading-activation]] — compilation strategy; every new source must propagate to 3-5 neighboring articles; the mechanism that makes the vault compound rather than accumulate; failure mode is a compile that touches only one article
- [[stub-as-signal]] — stubs are the graph's demand signal, never errors; four-dimension scoring (inbound links, cross-domain reach, MOC alignment, synthesis potential); the stub list is the vault's honest statement of what it needs next
- [[hook-enforcement]] — hard fails (structural + graph) and soft flags (quality); the enforcement layer that makes graph degradation visible immediately rather than gradually; hard/soft separation is load-bearing
- [[agent-traversal]] — the read cycle; standard path (MOC → core articles → connections, 2-4 hops) and fast path (concept shortcut, 2-3 hops); traversal failure modes: orphans, weak nodes, island clusters, unnamed connections
- [[query-invisible-articles]] — structurally present, graph-healthy, and invisible to every enforcement layer; hooks miss them (not structural failures), lint misses them (not orphans), benchmark misses them (never reached); the confirmed first instance is `[[observability]]`; detection requires diff-based lint check in run_lint.py using the same pattern as orphan detection in hooks.py
- [[moc-as-argument]] (stub) — MOCs must deliver domain shape and central tension in one hop
- [[backlink-architecture]] (stub) — inbound links as the graph's immune system; orphaned nodes are structural failures

*(Product vision and architecture — vault operational decisions live in [[vault-moc]]; Braindex product decisions live in [[braindex-moc]]. These are cross-domain connections, not knowledge-work articles.)*

### Philosophy and Positioning
The foundational commitments that prevent the system from degrading into another closed note-taking app.

- [[external-cognition]] — the vault as infrastructure, not database; the design criterion shifts from storage/retrieval fidelity to what synthesis the system makes possible; file-over-app and agent-operated as direct consequences; theoretical grounding in Clark & Chalmers and Hutchins
- [[file-over-app]] (stub) — inspectability and portability as non-negotiable
- [[byoai]] (stub) — the wiki as stable context; any capable LLM as interchangeable interface

### Skill Layer
The practice layer of the vault: procedural knowledge that makes declarative knowledge executable. Skills are linked to the theory articles they depend on, so when understanding evolves, skills surface for review. They update through use.

- [[skill-layer-architecture]] — the theory article establishing why skills belong in the graph; the four-layer hierarchy (MOC → concepts → theory → skills); the theory/skill distinction (knowing vs. applying); skills as MOCs for action; build order for Tier 1–3 skills
- [[compilation-skill]] — the vault's primary growth mechanism; 8-step execution sequence; known failure modes (skipped spreading activation, hook enforcement as final step, stale MOC); canonical source (Vault/COMPILATION_PROMPT.md deleted)
- [[session-opener-skill]] — structured session orientation; directed mode (pull → domain orientation → work) and open mode (pending review → stub scoring → concept prompt); canonical source (Vault/SESSION_OPENER.md deleted)
- [[audit-skill]] — session-end capture; structured raw/ file with Reasoning, Decisions Made, Open Threads, Context Manifest; the single point of failure in the compounding mechanism; session bookend with session-opener-skill
- [[benchmark-skill]] — weekly traversal quality test; 10 fixed queries; TD/SQ/GH/SU scoring; context manifest distinguishes vault failure from agent failure; Tier 1 skill layer now complete
- [[cross-domain-synthesis-skill]] — explicit procedure for queries spanning multiple MOCs; seven-step sequence from domain identification through claim encoding; removal test + non-obviousness test + actionability test as claim validity checks; [[observability]] and [[audit-loop]] as canonical worked examples
- [[lint-skill]] — standalone lint invocation separate from compilation; five-category inspection procedure (graph health, topology, content, contradictions, growth suggestions); decouples structural health checking from new-source compilation
- [[lint-fix-skill]] — the correction counterpart to lint-skill; translates a lint report into targeted repairs; three-phase triage (mechanical → structural → content); closes the observability loop that lint-skill opens

### Cross-Project Concepts
Dense neighborhood of abstractions that appear across multiple domains and create small-world shortcuts.

- [[knowledge]] — the parent concept that grounds the information/knowledge distinction; data → information → knowledge as a compounding hierarchy; AOKS, the vault compilation step, and the audit loop are all knowledge-production mechanisms; operative in teaching (knowledge acquisition vs. recall), APEX (calibrated classification vs. labeled data), and TCX (student profiles as knowledge artifacts)
- [[concept]] — the foundational unit: what qualifies as a cross-domain abstraction, the four vault criteria (cross-domain, classification function, inferential potential, abstract), and the measuring stick for `_concepts/` membership; the meta-article that makes the concept folder self-auditing
- [[observability]] — the operational principle that makes classification-and-action systems correctable; four-stage loop (signal capture → classification → inspection → correction+encoding) is active in APEX (audit + UI), TCX (Validation Gate), and teaching (formative assessment + omtest); the inspection layer is what separates a system that improves from one that drifts
- [[honesty]] — the prior commitment that whatever comes from truth is superior to any alternative regardless of surface appearance; structurally distinct from observability (the mechanism) and transparency (the visibility property); instances in APEX (no-gap principle, fail-loud audit), teaching (omtest retest over convenient snapshot), TCX (surfacing agent disagreement), and vault (derivability filter, source attribution)
- [[transparency]] — the commitment to no hidden agendas, no consciously hidden information, and truthful answers to questions; instances: SectorGrid tooltip (APEX signal visibility), IUP documentation (teaching trajectory visibility), TCX agent disagreement surfaced to teacher, vault file-over-app and source attribution; the always-on visibility property that complements observability (event-triggered) and honesty (internal disposition)
- [[honesty-transparency-observability-applications]] — the three concepts applied as a unified design audit lens; not a concept definition but an operational article showing how to use the triad actively across all four domains
- [[complementary-functions]] — the meta-framework; specialized parts working as a whole, only as strong as the weakest link (always at an interface); honesty, transparency, and observability are the three conditions that make complementary functions actually complement rather than coexist; instances across all four domains; the growth-together temporal dimension — corrections at interfaces compound, making the whole stronger than the sum
- [[trust]] — the prerequisite; earned through repeated proof, not declared; the accumulated evidence that commitments are real; without trust, honesty is performed, transparency is surveillance, observability is theater, and complementary functions coexist without functioning
- [[audit-loop]] — the compounding mechanism that makes classification-and-action systems improve rather than drift; three instances: APEX mechanical_checks.py (19 checks encoding past incidents, nightly), vault Step 2C hook enforcement (post-write, blocking), TCX Validation Gate (per-interaction); the correction+encoding stage of the observability loop that makes correction permanent rather than local
- [[bayesian-inference]] — the mathematical framework for updating degree-of-belief given evidence; prior × likelihood → posterior; probability as degree of belief, not frequency; four domain instances across APEX (regime-bayes LR chain), teaching (diagnostic profiling, omtest as second observation), TCX (Validation Gate DELTA_THRESHOLD), and vault (stub scoring as informal Bayesian aggregate); the formal theory underlying any classification-and-action system that handles uncertainty correctly
- [[corroboration-architecture]] — the design pattern of requiring agreement from multiple independent checks before consequential action; each additional independent check multiplies required corroboration, reducing false positives multiplicatively; four instances: Lock Leading (2-of-4), TCX Inspector (5-dimension), APEX two-layer audit (mechanical + LLM), vault hook enforcement (structural + graph + quality); distinct from [[complementary-functions]] — this is specifically an agreement-before-action protocol

### Tool Evaluations
External implementations of the agent-operated knowledge pattern. Each evaluation identifies where the vault is ahead, what architectural gaps the tool exposes, and whether any specific pattern is worth borrowing.

- [[hyperspell-tool-evaluation]] — managed cloud memory layer for AI agents; 80+ OAuth connectors; two retrieval modes (indexed search with embeddings, live search with no data storage); procedural memory via trace extraction; complementary to the vault's compilation layer as a cloud workspace ingest solution; live search mode avoids interference vulnerability; `file-over-app` violation is the adoption constraint
- [[wiki-vs-notebooklm-stress-test]] — Artemxtech stress test of Karpathy-style wiki vs NotebookLM on Ray Dalio's Principles; surfaces token efficiency (~44k tokens/query) as unmeasured gap; validates MOC-as-argument design (his INDEX failed the same way a catalog MOC fails); exposes actionable-output gap (decision templates as missing output type); embedding index suggestion rejected on interference grounds
- [[llm-wiki-compiler]] — v0.1.0 TypeScript CLI; behind vault on every quality dimension but ahead on one pattern worth borrowing: two-phase compilation (concept extraction across all sources before article generation) eliminates order-dependence and enables cross-source concept merging; hash-based incremental updates (SHA-256 per source) relevant at product scale; fabricated summary incident confirms ingest-manifest.json provenance discipline

## Cross-Domain Connections

- [[apex-moc]] — APEX nightly audit (25 mechanical checks, scheduler catch-up, fail-loud design) is the corpus's most developed instance of automated knowledge maintenance; direct architectural transfer to vault hooks and compilation
- [[tcx-moc]] — TCX applies the agent-operated pattern to reduce teacher cognitive load; the vault applies the same pattern to Niclas's own thinking
- [[teaching-moc]] — assessment tracking and longitudinal records are knowledge-work problems in disguise; future automated report generation will reuse vault patterns
- [[inspiration-moc]] — image handling and aesthetic briefing articles are a distinct knowledge modality; how visuals enter the graph is a knowledge-work concern
- [[observability]] — the concept article creates a three-domain shortcut between theoretical formulation (this MOC), APEX implementation, and TCX Validation Gate
- [[general-moc]] — the transit domain that stages cross-project articles before they graduate to knowledge-work or another domain; general-moc and knowledge-work-moc share the most overlap of any two MOCs; when a general/ article accumulates enough knowledge-work connections, it moves here
- [[vault-moc]] — the vault's own structural domain; every vault infrastructure decision is a test of the knowledge-work theoretical position; vault-structure-consolidation and nightly-audit-architecture are the most load-bearing vault articles for knowledge-work theory

## Synthesis Claims

1. Every automation failure in the corpus shares the same root: a silent "nothing happened" case that masks real drift. The universal fix is to make the null case explicit and detectable — whether in schedulers, write-back, or audit loops.

2. The wiki is finished when an agent can reach relevant context from any entry point in under four hops. Comprehensiveness (more articles) and traversability (better-linked articles) are different goals; optimizing for the former at the expense of the latter is the most common failure mode in personal knowledge systems.

3. Automation infrastructure (schedulers, CI pipelines, write-back) and knowledge architecture (MOCs, wikilinks, spreading activation) are the same problem instantiated at different abstraction layers. Improving one without improving the other is incoherent.

4. The highest-density knowledge production occurs through unplanned concept emergence from operational reflection, not planned stub-filling. A single well-connected concept article advances graph topology more than several weakly-linked domain articles. Session openers surface planned work; the highest-value work is often the unplanned insight noticed while executing the plan.

5. The vault's operational rigor (session close ritual, spreading activation, incident learning ritual) is not maintenance overhead — it is the product development process. The guinea pig design loop converts every use into a design constraint. Skipping these steps is equivalent to shipping without testing the product being built.

6. The benchmark's S-type queries (S1, S2) are not only quality checks — they are low-cost synthesis sessions. A claim that surfaces in S1/S2 and does not exist in any article is a high-value stub candidate generated by vault structure alone. The 2026-04-17 S2 run independently derived the four-stage observability loop from MOC synthesis claims without opening `observability.md`. A high S-type score is a MOC quality signal, not a vault depth signal; a high S-type score on a well-written MOC is consistent with the article layer being structurally invisible to the current query design.

## Open Territory

- **Product template extraction:** When is the vault "ready to generalize"? The template needs defined success criteria — N months autonomous operation, benchmark score threshold, no human-mediated fixes for M months. No article defines this yet.
- **Feedback-loop completeness concept:** "Feedback-loop completeness" surfaced 2026-04-17 as a concept candidate — the distinction between observability (measurement exists) and active feedback (measurement drives structural change). Instances: vault (lint runs but loop was not closed until this session), APEX (CHECKs grow from incidents = active; benchmark scores = passive). If a TCX instance confirms the third domain, qualifies for `_concepts/`.
- **Standalone architecture article:** How does the vault work with no cloud dependencies? The local scheduler, local LLM interface layer, and setup script are not yet documented as a coherent architecture. [[standalone-vault-vision]] is the vision; an architecture article would specify the implementation.

- Does the growing `_concepts/` neighborhood (now 11 articles after 2026-04-11 concept audit and reclassification) require its own argumentative mini-MOC or orientation document? At what scale does traversal into concepts degrade without an explicit entry point? Note: [[concept]] now acts as the entry point and quality gate — assess whether that is sufficient or whether a dedicated _concepts-moc is needed.
- How should the compilation agent handle contradictions between a new raw source and existing wiki articles? Current lint flags them, but no escalation path beyond human review is defined.
- The incident-learning-ritual and session-close-ritual are now well-established, but the meta-layer (rituals and configuration files themselves) lacks a lightweight Validation Gate. When does the automation infrastructure need its own observability layer?
- At what vault scale do we need meta-MOCs (MOCs of MOCs) to maintain navigability across dozens of domains and hundreds of articles?
- [[simple-interface-for-vault]] has a deployed realization — [[vaultnix-interface-deploy]] is the build record; voice capture and file upload are confirmed priorities (Niclas 2026-04-17) but not yet implemented; the open design question is now implementation sequencing, not whether to build.
- [[picture-pipeline]] is still draft; OCR tooling decision and intake folder location are the blocking decisions.
- ~~No session-close ritual~~ Resolved 2026-04-11: audit-skill supersedes; files to raw/[domain]/ and fires compile trigger.
- ~~No skill layer~~ Resolved 2026-04-10: wiki/_skills/ created; Tier 1 skills (compilation-skill, session-opener-skill) live in the graph; Tier 2 priority is cross-domain-synthesis-skill; theory article at skill-layer-architecture.md
- **Benchmark finding (2026-04-10):** Surprise and Synthesis track different graph properties. Surprise tracks inversely with stub density at cross-domain bridge points; Synthesis tracks with MOC synthesis claim coverage. The session-opener scoring model uses "Synthesis potential" as a proxy for both — but they require different stub types to improve. Should the scoring model split into five dimensions, with "Cross-domain bridge potential" as an explicit dimension separate from "Synthesis potential"?
