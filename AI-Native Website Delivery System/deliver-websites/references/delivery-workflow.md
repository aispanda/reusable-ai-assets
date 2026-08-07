# Website delivery workflow

Use this workflow for a new site or a material redesign. Scale the evidence, not the quality bar.

| Phase | Required decision | Minimum artifact | Exit gate |
|---|---|---|---|
| 0. Intake | Is a website the right intervention? | Problem statement | Outcome and owner named |
| 1. Discovery | Who needs what, and why now? | Website brief | Audience, primary action, constraints, success measure approved |
| 2. Scope | What is in the first release? | Route/capability map | In/out scope and assumptions explicit |
| 3. Architecture | What must happen at build time, browser time, or request time? | Architecture decision | Data, security, cost, and operations fit reviewed |
| 4. Experience | How does the user understand and act? | IA, page archetypes, content model, design tokens | Representative desktop/mobile flow approved |
| 5. Vertical slice | Can one real journey work end to end? | Working slice | Content, states, metadata, accessibility, and analytics boundary proven |
| 6. Build | Are all approved routes/components complete? | Build candidate | Automated checks pass; no placeholder or hardcoded production values |
| 7. Release readiness | Is public launch safe and reversible? | QA record and rollback plan | Human and automated gates accepted |
| 8. Deploy | Is there explicit authorisation? | Deployment record | Production verification passes |
| 9. Operate | Who owns updates, incidents, cost, and learning? | Operations note | Monitoring, correction path, and review cadence active |

## Fast discovery questions

Ask in this order and stop when sufficient:

1. What should a visitor understand or do within the first minute?
2. Who is the primary visitor, and what brings them here?
3. What is the smallest credible first release?
4. Who owns each content type and approves changes?
5. Does anything require login, payment, private data, real-time updates, user uploads, or personalised output?
6. Which laws, policies, languages, regions, accessibility needs, or safety concerns constrain the design?
7. What makes launch successful after one week and after three months?
8. Who can approve production deployment, DNS, spend, and third-party services?

## Decision discipline

- Record consequential assumptions; do not ask about reversible preferences prematurely.
- Present a recommendation first, then one or two credible alternatives with cost and risk.
- Validate the riskiest user journey before polishing low-value pages.
- Reuse page and component contracts; vary content and tokens through data.
- Keep an explicit `not now` list to prevent accidental scope growth.

## Roles

One person may hold several roles, but every responsibility must have an owner:

- sponsor/outcome owner;
- content owner/editor;
- design and accessibility owner;
- technical owner;
- privacy/security/legal reviewer when relevant;
- deployment and operations owner.
