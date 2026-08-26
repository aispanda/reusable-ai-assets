# Reusable AI Asset Inventory

Read this file to select an asset; then open only the linked `ASSET.md`. Do not load unrelated asset folders.

## Rules

1. One stable ID, folder and `ASSET.md` per reusable asset.
2. Inventory rows stay concise: category, need/keywords, record, status and verification date.
3. `ASSET.md` links the complete transferable package and separates reusable core, project profile, evidence and exclusions.
4. The central package is canonical. Project repositories link to it and retain only their project profiles or thin wrappers.
5. Publish by staged copy → clean verification → project repoint → duplicate removal. Never move a working source first.
6. Never package credentials, customer data, personal machine paths, dependency folders, generated output or unreviewed third-party code.

## Assets

| ID | Category | Asset | Use when / keywords | Record | Status | Verified |
|---|---|---|---|---|---|---|
| RA-001 | Data architecture / visualization | Data Model Exploration Suite | DBML, ERD, schema review, data dictionary, relationships, public explorer | [`Data Model Exploration Suite/ASSET.md`](Data%20Model%20Exploration%20Suite/ASSET.md) | Reusable v1.0 | 2026-08-06 |
| RA-002 | Cloud deployment | Deployment Automation | GCP, Cloud Build, Cloud Run, preflight, approval gate, verification, **custom domain mapping (zero-cost)** | [`Deployment Automation/ASSET.md`](Deployment%20Automation/ASSET.md) | Reusable; domain-map path added | 2026-08-07 |
| RA-003 | AI workflow / governance | Create Reusable Asset skill | identify reusable work or skill gaps; create, update, validate, register and continuously strengthen assets through issue feedback | [`Asset-creation-skill/ASSET.md`](Asset-creation-skill/ASSET.md) | Reusable v1.5; expanded evaluation pending | 2026-08-07 |
| RA-004 | AI operations / governance | Model-Routing Template | model selection, task routing, bake-off, cost, quality, fallback, refresh | [`Model-Routing Template/ASSET.md`](Model-Routing%20Template/ASSET.md) | Reusable v1.0; broader evaluation pending | 2026-08-06 |
| RA-005 | Consulting delivery / project governance | AI-Native Rapid Solution Delivery Kit | project governance, issue-ready preflight, Git/PR/release gates, project scaffolding, research, discovery, decisions, architecture and build readiness | [`AI-Native Rapid Solution Delivery Kit/ASSET.md`](AI-Native%20Rapid%20Solution%20Delivery%20Kit/ASSET.md) | Pilot-ready v0.17; governance enforcement pilot and adoption scaffold added; cross-repository evaluation pending | 2026-08-26 |
| RA-006 | Engineering / Web Delivery | AI-Native Website Delivery System | website idea, stakeholder intake, brand, emotion→interface mapping, content, writing craft (typed prose), product capabilities, architecture, UI/UX research/patterns/tools, page-craft decision loop, single-page/longread craft, responsive build, accessibility, SEO, social previews, live demos, community evolution, QA, launch readiness | [`AI-Native Website Delivery System/ASSET.md`](AI-Native%20Website%20Delivery%20System/ASSET.md) | Pilot-ready v1.7; writing-craft; emotion→interface; evaluation pending | 2026-08-08 |
| RA-007 | AI workflow / Natural Language Processing | Indic Translation & Summarization Engine | Translation, Summarization, Indic, Gujarati, Routing, Evaluation, LLM-as-a-judge | [`Indic-language-tools/ASSET.md`](Indic-language-tools/ASSET.md) | Draft | Not verified |
| RA-008 | AI workflow / Architecture | Multi-Agent Orchestration Knowledge Base | Multi-Agent, Evaluator-Optimizer, LLM-as-a-Judge, CoT, Actor-Critic | [`Multi-Agent-Orchestration/ASSET.md`](Multi-Agent-Orchestration/ASSET.md) | Draft v2 | Not verified |

## Active library backlogs

Parked cross-project work. Owning `ASSET.md` holds detail; do not duplicate in consumer repos.

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

**Trigger keywords:** brand voice, vibe identity, mission vision north star, onlyness, personal blog posture, emotion to interface, logo from feeling  
**Decision:** Enhance existing RA-005 + RA-006; **no new RA** (owner ACCEPT).  
**RA-005 owns:** seed capture, brand-voice-identity-flow (Q1–Q16 + entity/commercial posture), vibe brief template, privacy/gitignore rules for private transcripts.  
**RA-006 owns:** brand-identity-system contract, emotion-to-interface mapping, visual/UX expression, **writing-craft** (typed public prose including principles rows).  
**Excluded from reusable core:** any consumer’s employment, visa, lawsuit, spiritual-provenance-as-IP, or unreleased positioning text (AR-019).  
**Record:** RA-005 / RA-006 `ASSET.md`  
**Pending:** three-case evaluation of brand flow; owner may still DEFER personality/voice questions per project.

| ID | Pending | When |
|---|---|---|
| BRAND-1 | Optional eval: personal-blog posture vs company product vs deferred personality | When scheduling RA-005/006 evaluations |
| BRAND-2 | Publish library updates only with explicit approval | After owner requests commit/push |

See [`Deployment Automation/CUSTOM_DOMAIN.md`](Deployment%20Automation/CUSTOM_DOMAIN.md) backlog **CD-B1…B5** (split DNS asset, paid ALB, etc.). Live cutovers stay in the consuming project.
