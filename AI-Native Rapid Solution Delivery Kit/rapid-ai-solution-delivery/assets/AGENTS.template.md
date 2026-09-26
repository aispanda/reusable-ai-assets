# {{PROJECT_NAME}} instructions

Canonical policy: [AI Spanda Engineering Delivery & AI-Agent Governance Standard v1](https://app.notion.com/p/AI-Spanda-Engineering-Delivery-AI-Agent-Governance-Standard-v1-3c0e4d72a7fd80148cf9db9f6cb37bee).

Read `docs/DOCUMENTATION_ROUTER.md`, `docs/AI_HANDOVER_PROTOCOL.md`, `docs/AI_HANDOVER.md`, and `docs/PROJECT_PLAN.md` before acting.

- Require one `READY` Linear issue, its issue-linked branch, and a clean dedicated clone or worktree before implementation.
- Fetch into the operating system's temporary directory, outside the repository, then run `python governance/check_delivery.py --mode local --issue-json "<temporary-path>/linear-issue.json"`; stop on failure.
- One fact has one owning document; link instead of duplicating.
- Label unresolved claims `OBSERVED`, `INFERRED`, or `ASSUMED`.
- Recommendations are not decisions until the named owner accepts them.
- Do not write application code until the build-readiness gate is accepted.
- Register documents in the documentation router and scripts in the automation router.
- Merge only through a checked pull request and independent review. Do not commit, deploy, spend money, or change external systems without authority.
- Publish only the reviewed merged SHA through a separately approved production gate.
- Keep responses concise: outcome, changes, verification, risks, and next decision.
