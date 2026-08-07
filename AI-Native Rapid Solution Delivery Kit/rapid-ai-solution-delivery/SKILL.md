---
name: rapid-ai-solution-delivery
description: Guide business stakeholders from an unstructured idea to a governed, build-ready first solution slice using adaptive discovery, rapid AI-assisted prototyping, progressive project scaffolding, evidence-backed decisions, and human approval gates. Use when starting a software, data, automation, or AI consulting/SI engagement; defining vision, objectives, roadmap, requirements, technology, architecture, data, or UX; recovering a poorly organized project; or deciding whether enough is known to authorize the first implementation script.
---

# Rapid AI Solution Delivery

Turn informal stakeholder intent into a clear, testable first slice without imposing a long questionnaire or heavyweight methodology.

## Start with evidence, not questions

1. Inspect supplied files, project routers, reusable-asset inventory and existing decisions before asking anything.
2. If little context exists, ask only: **“Describe what you want to accomplish in your own words. Attach anything useful; you do not need to organize it.”**
3. Convert the response into a concise discovery canvas: outcome, stakeholder/user, current problem, proof of value, constraints, exclusions, evidence and assumptions.
4. Label claims `OBSERVED`, `INFERRED` or `ASSUMED`. Never convert an assumption or recommendation into an accepted decision.
5. Recommend a delivery mode using [delivery-modes.md](references/delivery-modes.md). Default to Lite.
6. Activate the research vault only when external/current evidence affects decisions. Activate AI exchange only when multiple AI tools or agents will work on bounded tasks.

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
- Keep current state compact; archive historical handovers and detailed evidence rather than loading them every session.
- Prefer a walking skeleton: user input → business rule → durable result → visible output → automated test.
- Use reusable assets by reference; do not copy their methods into the project.
- Do not create application code, commit, deploy, spend money or change external state without authorization.

## Handoff

Finish each round with: what changed, decisions accepted/deferred, assumptions, verification, next gate and exact stakeholder action. Keep the response concise enough to approve in one sitting.
