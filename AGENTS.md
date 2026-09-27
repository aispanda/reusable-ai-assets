# AI Spanda repository instructions

Canonical policy: [AI Spanda Engineering Delivery & AI-Agent Governance Standard v1](https://app.notion.com/p/AI-Spanda-Engineering-Delivery-AI-Agent-Governance-Standard-v1-3c0e4d72a7fd80148cf9db9f6cb37bee).

Before implementation:

1. Read the root policy router, the Linear issue contract, and only the relevant reusable-asset instructions.
2. Require one `READY` Linear issue, its exact issue-linked branch, and a clean dedicated clone or worktree.
3. Search `REUSABLE_ASSET_INVENTORY.md` and use RA-003 for the reuse decision.
4. Run the delivery preflight. Stop on any failure.

```powershell
python "AI-Native Rapid Solution Delivery Kit/rapid-ai-solution-delivery/scripts/fetch_linear_issue.py" --branch "<current-branch>" --output "$env:TEMP/linear-issue.json"
python "AI-Native Rapid Solution Delivery Kit/rapid-ai-solution-delivery/scripts/check_delivery.py" --mode local --issue-json "$env:TEMP/linear-issue.json"
```

Changes reach `main` only through a pull request with deterministic checks and an independent reviewer. The builder may not approve their own work. Production publication must use the reviewed merged SHA and its separate deployment approval; a local or dirty artifact is never releasable.

Do not copy the Notion policy into project files. Keep requirements and live status in Linear, source/review truth in Git/GitHub, repeatable checks in CI, and deployment proof in the target platform.
