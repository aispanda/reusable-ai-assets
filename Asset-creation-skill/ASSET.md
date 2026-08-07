# RA-003 — Create Reusable Asset Skill

| Metadata | Value |
|---|---|
| Category | AI workflow / governance |
| Select when | Repeated project work may become portable code, a template, process, reference or AI skill |
| Skill | [`create-reusable-asset/SKILL.md`](create-reusable-asset/SKILL.md) |
| Status | Reusable v1.4; expanded cross-agent evaluation pending |

## Outcome

Guide an AI agent through deciding whether work merits reuse, separating core/profile/evidence, packaging it into this central library, validating portability and repointing project documentation/automation routers without duplicate sources of truth.

## Transfer manifest

- `create-reusable-asset/SKILL.md`: concise workflow and guardrails.
- `create-reusable-asset/references/asset-record-template.md`: standard `ASSET.md` structure.
- `create-reusable-asset/references/asset-patterns.md`: token-light playbooks for code, process, reference, use-case model and AI-skill assets.
- `create-reusable-asset/references/evaluation-cases.md`: three portable forward-test cases and pass criteria.
- `create-reusable-asset/references/issue-resolution-patterns.md`: reusable failures, root causes, safe resolutions and prevention improvements.
- `create-reusable-asset/references/validation-policy.example.json`: copyable, project-owned public-release rules; prevents client and environment assumptions from entering validator code.
- `create-reusable-asset/scripts/scaffold_asset.py`: creates and registers a standard Draft asset without rewriting boilerplate.
- `create-reusable-asset/scripts/validate_asset.py`: deterministic inventory/record/package checks.
- `create-reusable-asset/scripts/test_asset_tools.py`: isolated smoke test for scaffolding, duplicate protection and validation.
- `create-reusable-asset/agents/openai.yaml`: Codex UI metadata.

## Verification

```powershell
python -m pytest
python create-reusable-asset/scripts/test_asset_tools.py
python create-reusable-asset/scripts/validate_asset.py <asset-library-root> --strict-clean --policy <validation-policy.json>
```

Keep each project's forbidden terms, extra secret/path patterns and generated folders in its policy file. The validator retains only generic safety defaults; an active working library may contain ignored local dependencies/build output.
The process/template case completed on RA-004 with successful scaffolding, registration and validation. The public-library release path additionally passed configurable boundary scans, clean staging, runtime-aware representative tests and Git's staged-diff gate. Code/tool, use-case-model and independent multi-surface evaluations remain pending.

## Standards and scale path

The skill uses the open Agent Skills structure (`SKILL.md`, `scripts/`, `references`, `assets`) and progressive disclosure for portability across capable agents. Keep the filesystem inventory while it remains fast; if discovery later becomes remote, multi-user or unwieldy, expose records as read-only MCP resources rather than loading every asset into context.

- [Agent Skills specification](https://agentskills.io/specification)
- [Anthropic skill-authoring practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [MCP resources specification](https://modelcontextprotocol.io/specification/2025-11-25/server/resources)

## Boundaries

The skill may identify candidates, but it must not register unverified work as reusable, move a working source before the central copy passes, or package credentials/customer data/licence-incompatible content. MCP publication is a later discovery mechanism, not required for a local library.
