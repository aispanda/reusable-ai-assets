# RA-005 - AI-Native Rapid Solution Delivery Kit

| Metadata | Value |
|---|---|
| Category | Consulting delivery / project governance |
| Select when | Starting or recovering an application, digital product, platform, data, automation, or AI initiative; capturing seed ideas; deriving mission/vision/north star/principles or brand feeling from vibe |
| Entry point | [`rapid-ai-solution-delivery/SKILL.md`](rapid-ai-solution-delivery/SKILL.md) |
| Status | Pilot-ready v0.16; writing via RA-006 writing-craft (sutra = one type); strategy→expression brand flow (Q1–Q16); independent evaluation pending |

## Outcome

Turn an informal stakeholder idea into a business-understandable, evidence-backed and governed first vertical slice, guided by vendor-neutral AI-Age engineering principles and ready for explicit build authorization.

## Reuse boundary

- **Reusable core:** interview method, five gates, quality checks, templates, scaffold, audit, and tests.
- **Project profile:** the stakeholder’s answers, scope, decisions, research, architecture, data model, risks, and build brief remain in that project.
- **Domain starter:** optional examples may accelerate a sector or use case but never redefine the generic method.
- **Evidence:** source-project lessons may inform the workflow; source-project facts and decisions are never copied into a new project.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `rapid-ai-solution-delivery/SKILL.md` | AI operating workflow and authority boundaries | Reusable core |
| `rapid-ai-solution-delivery/references/` | Stakeholder interview, delivery modes, and quality gates | Reusable core |
| `rapid-ai-solution-delivery/references/seed-idea-management.md` | Raw seed capture, register dispositions, vibe→mission/vision/north star/principles/brand feeling bridge | Reusable core |
| `rapid-ai-solution-delivery/references/brand-voice-identity-flow.md` | Flow Q1–Q16 + Q2b entity/commercial posture; strategy→expression; privacy gitignore rules | Reusable core |
| `rapid-ai-solution-delivery/references/ai-agent-handover.md` | Cross-IDE/session/agent continuity principles and capability adapter | Reusable core |
| `rapid-ai-solution-delivery/references/sutra-writing-craft.md` | Pointer only → RA-006 `writing-craft.md` type `principle-sutra` | Reusable core |
| `rapid-ai-solution-delivery/assets/` | Lite, Standard, Controlled, research-vault, AI-exchange, seed capture, vibe identity, and build-ready Markdown templates | Reusable core |
| `rapid-ai-solution-delivery/assets/SEED_CAPTURE.template.md` | Deep seed file: raw as-spoken section, metadata, lifecycle | Reusable core |
| `rapid-ai-solution-delivery/assets/VIBE_IDENTITY_BRIEF.template.md` | Feeling/thought/emotion/pulse → mission, vision, north star, principles, pre-visual brand tokens | Reusable core |
| `rapid-ai-solution-delivery/assets/SEED_IDEAS.template.md` | Uncommitted opportunity register with promotion links | Reusable core |
| `rapid-ai-solution-delivery/assets/ENGINEERING_PRINCIPLES.template.md` | Vendor-neutral AI-Age engineering philosophy (North Star, intent/direction operating model, 10 principles, 99/10 guardrails) — **system brain for delivery judgment** | Reusable core |
| `rapid-ai-solution-delivery/assets/AI_AGE_ENGINEERING_EVIDENCE_MATRIX.md` | Seed bibliography and sutra↔source map with OBSERVED/INFERRED/GAP labels | Evidence |
| `rapid-ai-solution-delivery/assets/AI_AGE_ENGINEERING_RESEARCH_PROMPT.template.md` | Source-backed books/research brief for challenging and enriching the philosophy | Reusable core |
| `rapid-ai-solution-delivery/scripts/scaffold_project.py` | Non-destructive progressive project scaffold | Reusable core |
| `rapid-ai-solution-delivery/scripts/audit_project.py` | Read-only structure and readiness audit | Reusable core |
| `rapid-ai-solution-delivery/scripts/test_delivery_tools.py` | Isolated smoke tests | Verification |
| `rapid-ai-solution-delivery/agents/openai.yaml` | Skill discovery metadata | Reusable core |

## Inputs and outputs

**Minimum input:** one unstructured description of the intended outcome plus any useful files.
**Optional input:** stakeholder examples, current process, constraints, systems, research, or existing project folder.
**Outputs:** a progressively activated project charter, plan, work items, decisions, stable cross-IDE handover protocol, compact verified live handover, first-slice brief, and—only when justified—research vault, bounded AI exchange, architecture, data, risk, compliance, and automation records.

## Use / transfer

1. Give the AI only this `ASSET.md`; it opens the skill entry point and only the referenced resources needed for the current gate.
2. Start Lite unless Standard or Controlled triggers apply. Add research or AI exchange only when their triggers apply.
3. Let the AI extract context before asking questions; answer decision packets with `ACCEPT`, `AMEND`, or `DEFER`.
4. After approving artifact creation, run the scaffold with a new or intentionally selected project folder.
5. Run the audit at every gate. Use `--require-complete` only before authorizing implementation.

```powershell
python rapid-ai-solution-delivery/scripts/scaffold_project.py C:\path\to\project --project-name "Project name" --owner "Decision owner" --mode lite --stage kickoff
python rapid-ai-solution-delivery/scripts/audit_project.py C:\path\to\project --mode lite --stage kickoff
```

Append `--with-research` and/or `--with-ai-exchange` to both commands only when those triggers apply.

## Dependencies, cost and licensing

- Python 3.10+ standard library and Markdown; no package installation or subscription required.
- AI/model and web-research usage may have provider charges; the method does not require a specific model, IDE, cloud, or low-code platform.
- Templates and original scripts are project-owned reusable material. Third-party evidence retains its own terms and is not bundled.

## Verification

- `python rapid-ai-solution-delivery/scripts/test_delivery_tools.py` verifies non-overwrite behavior, every mode/stage, conditional folders, router coverage, local links, freshness checks, incomplete documents, and unresolved decisions.
- Run the standard skill validator on `rapid-ai-solution-delivery`.
- Run the central reusable-asset validator against the asset-library root.
- Forward evaluation still required with three representative projects: a Lite business app, Standard integration/AI platform, and Controlled sensitive-data initiative.

## Boundaries and limitations

- This kit structures discovery and decisions; it does not substitute for stakeholder accountability or specialist legal, security, compliance, accessibility, or domain review.
- It does not authorize application code, commits, deployments, purchases, production changes, or external communications.
- Scaffolding never overwrites an existing file. Existing projects require surgical integration rather than forced standardization.
- Generated documents are starting points tailored to project need, not proof that a gate has been satisfied.

## Library backlog (canonical index)

Parked AI-Age Engineering Philosophy work (**AIE-1…AIE-6**) lives in the central [`REUSABLE_ASSET_INVENTORY.md`](../REUSABLE_ASSET_INVENTORY.md) under **Active library backlogs → RA-005**. Do not maintain a parallel consumer-repo backlog for this outcome.
