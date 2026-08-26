---
name: rapid-ai-solution-delivery
description: Guide business stakeholders from an unstructured idea to a governed, build-ready first solution slice using adaptive discovery, rapid AI-assisted prototyping, progressive project scaffolding, evidence-backed decisions, and human approval gates. Use when starting a software, data, automation, or AI consulting/SI engagement; capturing seed ideas or flow writing; deriving mission, vision, north star, principles or brand feeling from vibe; defining vision, objectives, roadmap, requirements, technology, architecture, data, or UX; recovering a poorly organized project; or deciding whether enough is known to authorize the first implementation script.
---

# Rapid AI Solution Delivery

Turn informal stakeholder intent into a clear, testable first slice without imposing a long questionnaire or heavyweight methodology.

## Operating brain (load when judgment is needed)

Before locking planning, acceptance or “are we ready to generate?” decisions, read [`assets/ENGINEERING_PRINCIPLES.template.md`](assets/ENGINEERING_PRINCIPLES.template.md)—especially **Operating model — Intent, direction and progressive elaboration** and **Sutra 1**. That file is the vendor-neutral judgment brain for this kit: intent and direction first; journeys and acceptance criteria unfold through elaboration with humans, reusable assets and AI; humans remain accountable for high-stakes gates.

When a human decision-maker must approve scope, risk, release, spending or external impact, use [`references/ceo-decision-brief.md`](references/ceo-decision-brief.md). Translate the recommendation into plain business language, show evidence and alternatives, state the exact approval boundary and stop when evidence, authority, safety, budget or approval is missing.

## AI-native factory operating model

When the work involves AI-generated implementation, independent reviewers, reusable guardrails or lessons from failures, read [`references/ai-native-software-factory.md`](references/ai-native-software-factory.md).

- Before bounded implementation, create a project-owned quality contract from [`assets/QUALITY_CONTRACT.template.md`](assets/QUALITY_CONTRACT.template.md). Tests are important evidence, but the contract may also require security, accessibility, visual, recovery, performance or human evidence.
- Use RA-008 for independent fresh-context review and RA-010 for the bounded execution handoff. An implementer cannot approve its own work.
- When a defect reveals a reusable weakness, fix the project first, then create a candidate from [`assets/LEARNING_CHANGE.template.md`](assets/LEARNING_CHANGE.template.md). Route it through RA-003. Never let an agent silently rewrite a shared prompt, skill, policy or baseline.

When drafting or refining principle language (sutra, rule, practical test, example) or other public prose, use RA-006 [`../../AI-Native Website Delivery System/deliver-websites/references/writing-craft.md`](../../AI-Native%20Website%20Delivery%20System/deliver-websites/references/writing-craft.md): pick the content type first (for principles rows: `principle-sutra`), then universal practices, then the type recipe. Legacy pointer: [`references/sutra-writing-craft.md`](references/sutra-writing-craft.md).

## Start with evidence, not questions

1. Inspect supplied files, project routers, reusable-asset inventory and existing decisions before asking anything.
2. If little context exists, ask only: **“Describe what you want to accomplish in your own words. Attach anything useful; you do not need to organize it.”**
3. If the input is a flow dump, mission metaphor, brand feeling or uncommitted opportunity, capture it first with [seed-idea-management.md](references/seed-idea-management.md) and, when identity is in scope, [brand-voice-identity-flow.md](references/brand-voice-identity-flow.md): raw `SEED_CAPTURE` → register row → optional `VIBE_IDENTITY_BRIEF`. Ask public **entity/commercial posture** early. Gitignore private transcripts. After locks, hand visuals to RA-006 `brand-visual-fast-path.md` (do not reload full trees). Do not tidy raw speech in the same pass.
4. Convert the response into a concise discovery canvas: outcome, stakeholder/user, current problem, proof of value, constraints, exclusions, evidence and assumptions.
5. Label claims `OBSERVED`, `INFERRED` or `ASSUMED`. Never convert an assumption or recommendation into an accepted decision.
6. Recommend a delivery mode using [delivery-modes.md](references/delivery-modes.md). Default to Lite.
7. Activate the research vault only when external/current evidence affects decisions. Activate AI exchange when work crosses AI tools or agents, and follow [ai-agent-handover.md](references/ai-agent-handover.md).

## Ask decisions efficiently

Use [stakeholder-interview.md](references/stakeholder-interview.md). Ask at most three questions per round and only when the answer changes scope, outcome, risk, cost, architecture or authorization.

For every question provide:

- stable ID and plain-English decision;
- recommendation first;
- why it cannot wait;
- no more than three options with business impact;
- safe assumed default when available; and
- response syntax: `ACCEPT`, `AMEND: ...`, or `DEFER`.

Research and recommend technical options yourself. Ask stakeholders about business trade-offs, not jargon they hired the delivery team to resolve.

## Run five gated rounds

1. **Definition:** problem, actor, intended outcome, proof metrics, constraints and non-goals.
2. **Scope:** first demonstration, Must/Should/Won’t, later roadmap, dependencies and time box.
3. **Decision:** research credible options, recommend one, record human disposition and exit path.
4. **Design:** user/data workflow, architecture, data, trust/security and failure behavior needed by the first slice.
5. **Build readiness:** exact vertical slice, acceptance tests, exclusions, environment, verification and authorization.

At each gate, show only: proposed outcome, decisions required, assumptions, contradictions, artifacts affected and next gate. Use [quality-gates.md](references/quality-gates.md) before advancing.

## Create artifacts progressively

Preview before writing when the target or ownership is unclear. After authorization, run:

```text
scripts/scaffold_project.py <project-root> --project-name "..." --owner "..." --mode lite --stage kickoff [--with-research] [--with-ai-exchange]
```

Activate Standard or Controlled modules only when their triggers apply. At the build gate, rerun with `--stage build-ready` to add the automation router and empty implementation folders. Never overwrite existing files; integrate surgically when a project already exists.

Run `scripts/audit_project.py` after scaffolding and at every gate, using the same optional flags. It checks activated structure, router coverage, local links, and handover freshness. Use `--require-complete` only when testing build readiness; it also rejects unfinished placeholders and proposed decisions.

## Preserve ownership and agility

- One fact has one owning artifact; other files link to it.
- Research is evidence, not commitment. Recommendations become law only through recorded human acceptance.
- Keep named comparative evidence and consuming-product documentation in separate corpora. The private evidence corpus contains no consumer identifiers or decisions; project and reusable roots contain only independently authored requirements or generic methods, without named comparative details. Minimal custody manifests are the only routing exception.
- When strict separation is required, run the project audit with protected-root forbidden terms and an optional external evidence root plus consumer terms. Review compressed documents separately when the audit reports an unsupported binary.
- Keep current state compact; archive historical handovers and detailed evidence rather than loading them every session.
- Prefer a walking skeleton: user input → business rule → durable result → visible output → automated test.
- Use reusable assets by reference; do not copy their methods into the project.
- Do not create application code, commit, deploy, spend money or change external state without authorization.

## Handoff

For same-session stakeholder review, finish each round with: what changed, decisions accepted/deferred, assumptions, verification, next gate and exact stakeholder action.

When work crosses a session, IDE, model, agent or operator, read [ai-agent-handover.md](references/ai-agent-handover.md). Update the compact live handover, verify Git/deploy state, and create a dated exchange brief only for a bounded delegated task. Keep the response concise enough to approve in one sitting.
