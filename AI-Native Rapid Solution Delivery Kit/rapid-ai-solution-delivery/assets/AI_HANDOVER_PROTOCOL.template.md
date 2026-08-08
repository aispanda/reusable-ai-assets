# {{PROJECT_NAME}} — AI Handover Protocol

Use this stable protocol across AI tools and agents. Keep live state in `AI_HANDOVER.md`; do not turn this file into session history.

## Artifact ownership

- `DOCUMENTATION_ROUTER.md`: canonical read order and document ownership.
- `AI_HANDOVER_PROTOCOL.md`: stable transfer rules.
- `AI_HANDOVER.md`: compact current verified state.
- `prompts/ai-exchange/`: dated bounded execution briefs when activated.

## Required handover

1. Read `DOCUMENTATION_ROUTER.md`, then `AI_HANDOVER.md`, then `PROJECT_PLAN.md`, then any bounded exchange brief.
2. Identify the current gate, accepted decisions, unresolved blockers, authorized write scope, and prohibited actions.
3. Label evidence `OBSERVED`, interpretation `INFERRED`, and reversible defaults `ASSUMED`.
4. Never treat research, recommendations, or another AI’s output as accepted project law.
5. Change only owning documents; update routers in the same change.
6. Verify Git status/HEAD and deployed state before relying on reported live state.

## Authority boundaries

Permission to edit does not imply permission to commit, push, deploy, change IAM/DNS, spend money or contact people. Record each applicable gate separately and stop when required authority is absent.

## Required handback

- Outcome and files changed.
- Decisions accepted, amended, deferred, or still required.
- Verification actually performed and results.
- Risks, assumptions, and anything not verified.
- One next action with its required authority.
- Repository/branch, local HEAD, deployed revision and whether they match; use `n/a` where appropriate.
- Sensitive or generated paths that must remain uncommitted.

Keep responses concise. Do not paste full logs or duplicate document contents.
