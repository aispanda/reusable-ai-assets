# Reusable AI Asset Inventory

Read this file to select an asset; then open only the linked `ASSET.md`. Do not load unrelated asset folders.

## Rules

1. One stable ID, folder and `ASSET.md` per reusable asset.
2. Inventory rows stay concise: category, need/keywords, record, status and verification date.
3. `ASSET.md` links the complete transferable package and separates reusable core, project profile, evidence and exclusions.
4. The central package is canonical. Project repositories link to it and retain only their project profiles or thin wrappers.
5. Publish by staged copy → clean verification → project repoint → duplicate removal. Never move a working source first.
6. Never package credentials, customer data, personal machine paths, dependency folders, generated output or unreviewed third-party code.
7. Token/cost guard: load only the selected owner's necessary resources and stop when evidence is sufficient for the current decision. Before materially expanding research, implementation, evaluation or context, state why it may change the outcome, give the counterpoint, and ask the owner for the smallest required decision. Do not interrupt for routine, reversible judgment.
8. Research-intent and two-corpus gate: before external comparison or inspiration research, ask what decision it should inform, scope, constraints and stop condition. Store named evidence only in a designated private research corpus with no consumer identifiers or decisions; product and reusable roots receive only independently authored conclusions or generic methods and contain no named comparative details. Verify both directions before handover.

## Assets

| ID | Category | Asset | Use when / keywords | Record | Status | Verified |
|---|---|---|---|---|---|---|
| RA-001 | Data architecture / visualization | Data Model Exploration Suite | DBML, ERD, schema review, data dictionary, relationships, public explorer | [`Data Model Exploration Suite/ASSET.md`](Data%20Model%20Exploration%20Suite/ASSET.md) | Reusable v1.1 | 2026-08-10 |
| RA-002 | Cloud deployment | Deployment Automation | GCP, Cloud Build, Cloud Run, isolated staging, exact-image promotion, evidence receipts, approval gates, verification, **custom domain mapping (zero-cost)** | [`Deployment Automation/ASSET.md`](Deployment%20Automation/ASSET.md) | Reusable direct and staged-release paths | 2026-08-26 |
| RA-003 | AI workflow / governance | Create Reusable Asset skill | identify reusable work or skill gaps; create or upgrade AI skills and other assets; validate, register, distribute and continuously strengthen them without duplicate ownership | [`Asset-creation-skill/ASSET.md`](Asset-creation-skill/ASSET.md) | Reusable v2.0; portable AI-skill authoring and distribution-adapter governance added; expanded behavioral evaluation pending | 2026-08-26 |
| RA-004 | AI operations / governance | Model-Routing Template | model selection, task routing, bake-off, preflight gate, cost, quality, fallback, refresh | [`Model-Routing Template/ASSET.md`](Model-Routing%20Template/ASSET.md) | Reusable v1.1; bake-off skill + preflight | 2026-08-09 |
| RA-005 | Consulting delivery / project governance | AI-Native Rapid Solution Delivery Kit | project research and documentation governance, AI-native software factory operating model, quality contracts, controlled learning changes, two-corpus separation, discovery, decisions, CEO briefs, architecture and build readiness | [`AI-Native Rapid Solution Delivery Kit/ASSET.md`](AI-Native%20Rapid%20Solution%20Delivery%20Kit/ASSET.md) | Pilot-ready v0.21; factory operating model and quality/learning contracts added; evaluation pending | 2026-08-13 |
| RA-006 | Engineering / Web Delivery | AI-Native Website Delivery System | website or application UI, UI/UX research/patterns/tools, authenticated content applications, authoring/publishing, comments/moderation, persistent user-funded AI credentials, OAuth callback handoffs, record list/detail workspace, page-craft decision loop, responsive build, accessibility, content, brand, discovery, live demos, QA, launch readiness | [`AI-Native Website Delivery System/ASSET.md`](AI-Native%20Website%20Delivery%20System/ASSET.md) | Pilot-ready v1.16; authenticated content application, encrypted-vault/server-relay and OAuth handoff contracts; first consumer local proof passed, live and independent proof pending | 2026-08-17 |
| RA-007 | AI workflow / Natural Language Processing | Indic Translation & Summarization Engine | Translation, Summarization, Indic, Gujarati, Bhashini, Sarvam, preflight, Routing, Evaluation, LLM-as-a-judge, DoH DNS fallback | [`Indic-language-tools/ASSET.md`](Indic-language-tools/ASSET.md) | Reusable v1.2; preflight_indic + Bhashini client | 2026-08-09 |
| RA-008 | AI workflow / Architecture | Multi-Agent Orchestration Knowledge Base | Multi-Agent, bounded supervisor-worker-reviewer delivery, durable ledger, max-three parallel streams, independent fresh-context review, bounded repair, truthful state, role separation, checkpoints, budgets and disagreement quarantine | [`Multi-Agent-Orchestration/ASSET.md`](Multi-Agent-Orchestration/ASSET.md) | Reusable v2.2; bounded delivery independently validated (6/6 cases; nonblocking notes) | 2026-08-17 |
| RA-009 | Content / research publishing / sense-making | Insight Forge | public blog, essay, brief or white paper from research; deconstruct, reconstruct, flavor matching; not project research/documentation governance | [`Insight-Forge/ASSET.md`](Insight-Forge/ASSET.md) | Draft v0.5; human guide, documentation router, canonical ownership, and duplicate-rule consolidation added; fresh routing test pending | 2026-08-15 |
| RA-010 | AI workflow / governance | Cross-Agent Handover Protocol | handoff, handover, cross-agent, cross-model, cross-IDE, continuity, bounded delegation, execution mode, authority, token budget | [`Cross-Agent Handover Protocol/ASSET.md`](Cross-Agent%20Handover%20Protocol/ASSET.md) | Pilot v1.2; control-gate evaluation pending | 2026-08-11 |
| RA-012 | Legal drafting / AI workflow | Source-Grounded Legal Drafting | legal drafting, agreements, memoranda, deeds, settlements, source-locked, current-law verification, preserve source files | [`Source-Grounded-Legal-Drafting/ASSET.md`](Source-Grounded-Legal-Drafting/ASSET.md) | Reusable v0.1; privacy scan and three fictional evaluations passed | 2026-08-11 |
| RA-013 | AI workflow / SDLC automation | Agent Linear API Integration | bounded agent-managed Linear issues, status updates, comments, credential isolation, audit logging and retry safety | [`RA-013-agent-linear-api/ASSET.md`](RA-013-agent-linear-api/ASSET.md) | Pilot v0.1; build checkpoint, expanded validation pending | 2026-08-19 |

## Capability map — AI-native delivery operating system

Use this map to find the owner; do not reorganize the library by copying or moving canonical packages.

| Delivery capability | Canonical owner | What it contributes |
|---|---|---|
| Intent, scope, quality contract, architecture gate and CEO decision | RA-005 | Governs the delivery lifecycle and the definition of acceptable evidence |
| Data/schema foundation | RA-001 | Models authoritative data, integrity and relationships |
| Deployment foundation | RA-002 | Repeatable preflight, gated deployment and verification |
| Model selection | RA-004 | Evidence-based model routing, bake-offs, cost and fallback |
| Interface and accessibility quality | RA-006 | Reusable web/application workspace and rendered QA patterns |
| Bounded multi-agent delivery and independent review | RA-008 | Preserves a durable queue, dispatches up to three non-overlapping worker streams, enforces truthful state and bounded repair, and requires one independent reviewer |
| Cross-agent execution contract | RA-010 | Transfers one bounded task with explicit authority, verification and stop rules |
| Learning and reusable-asset promotion | RA-003 | Routes lessons to an owner, validates changes and prevents duplicate assets |
| Research-to-public insight | RA-009 | Produces claim-disciplined blogs, briefs and white papers |

**Operating rule:** projects generate evidence; existing asset owners receive versioned improvement proposals; independent checks and human approval precede promotion. Learning may be continuous, but reusable-core mutation is never silent or autonomous.

## Active library backlogs

Parked cross-project work. Owning `ASSET.md` holds detail; do not duplicate in consumer repos.

### Candidate — Application Security & Data Boundary Delivery System (2026-08-12)

**Trigger keywords:** application security requirements, information classification, approved data boundary, privacy-preserving AI, PII minimization, controlled information, default-deny egress, threat model, control ownership, security evidence, regulated deployment profile
**Outcome:** A vendor-neutral, commercial-first method for any application to classify information, map trust boundaries, assign control ownership, constrain identity/network/AI access, select proportionate open or managed controls, preserve human authority, and produce testable evidence without claiming automatic compliance. It should progress from secure-commercial baseline to obligation-specific regulated profiles while preserving optional compatibility with stronger public-sector assessment.
**Reusable core candidate:** elicitation questionnaire; data-flow/threat model; handling-policy matrix; authorization and default-deny disclosure patterns; separate authentication, authorization and domain-context proof paths so one failed match cannot masquerade as failed identity; AI minimization/redaction/approved-endpoint gate; secrets/encryption/audit/supply-chain/incident/recovery checklists; cost/complexity profiles; acceptance tests; independent-review and claim-language gates.
**Boundary:** Detectors are secondary defences and cannot guarantee classification. Assurance statements must distinguish designed, implemented, tested, independently assessed, formally certified, customer-responsibility and unsupported states. No provider names, customer data, compliance promises, project configuration, credentials or deployment-specific evidence enter the reusable core.
**Owner decision:** Use RA-005 to govern seed/research and RA-003 to decide promotion. Do not assign an RA ID or create the package until a second independent application confirms the outcome and three representative evaluations pass.
**Status:** Seed candidate; first consumer evidence observed; cross-project proof pending.

### Candidate — Cross-Provider Technology Choice & Learning Matrix (2026-08-13)

**Trigger keywords:** IaaS choice, cloud comparison, provider-neutral architecture, LLM selection, ML platform, managed service, open-source alternative, portability, cost model, security boundary, beginner explanation, technology landscape, build-versus-buy
**Outcome:** Help a business owner understand unfamiliar infrastructure, data, AI and machine-learning capabilities and choose the smallest proven option without creating vendor lock-in or an unmaintainable product catalogue.
**Recommendation:** Keep this as a seed candidate, not a new RA asset yet. Extend RA-005 for the decision/learning workflow and RA-004 for model-specific bake-offs. Promote only after a second independent application repeats the need and three representative evaluations show that the matrix improves a real technology decision.
**Reusable core candidate:** normalized capability taxonomy; one row per capability rather than one provider column per spreadsheet; plain-language definition; example outcome; fit/avoid signals; portability; security and data-boundary questions; cost shape (fixed, usage, per-seat, self-hosted); maturity and lifecycle check; operational burden; replacement options; evidence date; confidence; decision owner; stop/refresh rule; compact beginner and technical views.
**Project profile:** current provider names, service names, prices, rankings, regional availability, live offerings, credentials, architecture choices and recommendations remain in a designated private research/profile corpus; they must not enter the reusable core or inventory narrative.
**Boundary:** This is a decision aid, not a universal ranking, procurement approval, compliance certification, product recommendation or exhaustive inventory. Current facts expire; every comparison needs a dated scope, official-source evidence and a refresh condition. Retrieve only the category and decision rows needed for an agent prompt.
**Owner decision:** Use RA-005 to govern the learning/decision brief, RA-004 for model routing and bake-offs, and RA-003 for eventual promotion. No new RA ID or package until cross-project evidence exists.
**Status:** Seed candidate; first consumer evidence observed; cross-project proof pending.

### RA-005 — AI-Age Engineering Philosophy (2026-08-07)

**Trigger keywords:** 99/10, AI-age engineering, 9 Sutras, engineering principles research, vendor-neutral philosophy
**Brief:** [`AI-Native Rapid Solution Delivery Kit/rapid-ai-solution-delivery/assets/AI_AGE_ENGINEERING_RESEARCH_PROMPT.template.md`](AI-Native%20Rapid%20Solution%20Delivery%20Kit/rapid-ai-solution-delivery/assets/AI_AGE_ENGINEERING_RESEARCH_PROMPT.template.md)
**Canonical principles:** [`AI-Native Rapid Solution Delivery Kit/rapid-ai-solution-delivery/assets/ENGINEERING_PRINCIPLES.template.md`](AI-Native%20Rapid%20Solution%20Delivery%20Kit/rapid-ai-solution-delivery/assets/ENGINEERING_PRINCIPLES.template.md)
**Done so far:** owner-supplied **9 Sutras** + **intent/direction progressive-elaboration operating model** (owner flow, 2026-08-07) integrated into RA-005 principles brain; **writing craft** generalized into RA-006 (2026-08-08) with `principle-sutra` as one content type; 99/10 + efficiency guardrails + evolution loop retained; evidence note forbids unread bibliographies as derivation claims; SKILL points agents at the principles brain and RA-006 writing-craft; no commit/push/deploy from this backlog alone.
**Evidence matrix:** [`AI-Native Rapid Solution Delivery Kit/rapid-ai-solution-delivery/assets/AI_AGE_ENGINEERING_EVIDENCE_MATRIX.md`](AI-Native%20Rapid%20Solution%20Delivery%20Kit/rapid-ai-solution-delivery/assets/AI_AGE_ENGINEERING_EVIDENCE_MATRIX.md)
**Record:** [`AI-Native Rapid Solution Delivery Kit/ASSET.md`](AI-Native%20Rapid%20Solution%20Delivery%20Kit/ASSET.md)
**Done so far:** owner-supplied **9 Sutras** integrated; **13-book seed bibliography** filed with `OBSERVED` citations and `INFERRED` sutra maps; gaps noted for HITL standards, scale-to-zero, and outcome pricing; no commit/push/deploy.

| ID | Pending | When |
|---|---|---|
| AIE-1 | Receive ChatGPT/Gemini research outputs (paste or path) | Done — owner supplied 9 Sutras (2026-08-07) |
| AIE-2 | Verify cited sources; label `OBSERVED` vs `INFERRED` | Partial — bibliography `OBSERVED`; theme maps `INFERRED`; chapter/page verification still open |
| AIE-3 | Propose concise principle amendments (no silent material edits) | Two optional notes pending owner `ACCEPT` / `AMEND` / `DEFER` (Sutra 6 IA/retrieval; Sutra 2 fitness-function wording) |
| AIE-4 | Owner accept / amend / reject | Awaiting disposition on AIE-3 optional notes |
| AIE-5 | Apply accepted edits; rerun RA-005 tests + strict-clean staged validation | Template + evidence matrix in place; re-verify after AIE-4 |
| AIE-6 | Publish only with explicit approval | After AIE-5 |

### RA-005 / RA-006 — Brand strategy → expression (2026-08-08)

**Trigger keywords:** brand voice, vibe identity, mission vision north star, onlyness, personal blog posture, emotion to interface, logo from feeling, ChatGPT image prompt pack, brand-visual fast path
**Decision:** Enhance existing RA-005 + RA-006; **no new RA** (owner ACCEPT).
**RA-005 owns:** seed capture, brand-voice-identity-flow (Q1–Q16 + entity/commercial posture), vibe brief template, privacy/gitignore rules; After-flow handoff to RA-006 fast path.
**RA-006 owns:** brand-identity-system, emotion-to-interface, **brand-visual-fast-path**, **CHATGPT_IMAGE_PROMPT_PACK.template**, writing-craft.
**Excluded from reusable core:** any consumer’s employment, visa, lawsuit, spiritual-provenance-as-IP, or unreleased positioning text (AR-019).
**Record:** RA-005 / RA-006 `ASSET.md` · AR-020 / WEB-031
**Pending:** three-case evaluation of brand flow; owner may still DEFER personality/voice questions per project.

| ID | Pending | When |
|---|---|---|
| BRAND-1 | Optional eval: personal-blog posture vs company product vs deferred personality | When scheduling RA-005/006 evaluations |
| BRAND-2 | Publish library updates only with explicit approval | After owner requests commit/push |
| BRAND-3 | Fast path + image prompt pack (load order, one-thread hygiene, SVG/CSS finish) | **Done** 2026-08-08 |
| BRAND-4 | Pilot: first consumer UI apply after rasters; log WEB-032…034; Case 4 eval | In progress — owner live ACCEPT on home |

See [`Deployment Automation/CUSTOM_DOMAIN.md`](Deployment%20Automation/CUSTOM_DOMAIN.md) backlog **CD-B1…B5** (split DNS asset, paid ALB, etc.). Live cutovers stay in the consuming project.
