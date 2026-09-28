# RA-003 — Create Reusable Asset Skill

| Metadata | Value |
|---|---|
| Category | AI workflow / governance |
| Select when | Check reusable options and capability readiness before building; adopt or improve portable code, templates, processes, references or AI skills |
| Skill | [`create-reusable-asset/SKILL.md`](create-reusable-asset/SKILL.md) |
| Status | Pilot v1.6; structural checks and three fresh-context proposal behavior checks passed; live consumer validation pending |

## Outcome

Help an agent find and adopt existing local or open-source capabilities, establish build readiness, create only the missing reusable value, and maintain one evidence-backed owner over time.

## Reuse boundary

RA-003 owns asset discovery/adoption, portable packaging, resource-readiness checks, verification, and maintenance guidance. Project delivery authorization remains with the delivery owner; detailed team orchestration remains with the orchestration owner. Source registries, named candidate comparisons, credentials, private pilot material, and project-specific decisions stay outside the runtime package.

## Transfer manifest

- `create-reusable-asset/SKILL.md`: concise workflow and guardrails.
- `create-reusable-asset/references/discovery-and-adoption.md`: assess existing local and upstream assets before creating or copying capabilities.
- `create-reusable-asset/references/build-readiness.md`: verify relevant skills, sources, repos, tools and agent context before dependent build work.
- `create-reusable-asset/references/skill-authoring.md`: portable, selective, decision-oriented skill authoring and source refresh.
- `create-reusable-asset/references/repository-lifecycle.md`: repository/runtime separation, external ownership, publication, and evidence-led maintenance.
- `create-reusable-asset/references/asset-record-template.md`: standard `ASSET.md` structure.
- `create-reusable-asset/references/asset-patterns.md`: token-light playbooks for code, process, reference, use-case model and AI-skill assets.
- `create-reusable-asset/references/evaluation-cases.md`: representative reuse/readiness and asset-extraction behavioral cases with evaluator criteria.
- `create-reusable-asset/references/issue-resolution-patterns.md`: reusable failures, root causes, safe resolutions and prevention improvements.
- `create-reusable-asset/references/validation-policy.example.json`: copyable, project-owned public-release rules; prevents client and environment assumptions from entering validator code.
- `create-reusable-asset/scripts/scaffold_asset.py`: creates and registers a standard Draft asset without rewriting boilerplate.
- `create-reusable-asset/scripts/validate_asset.py`: deterministic inventory/record/package checks.
- `create-reusable-asset/scripts/test_asset_tools.py`: isolated smoke test for scaffolding, duplicate protection and validation.
- `create-reusable-asset/agents/openai.yaml`: Codex UI metadata.

## Verification

```powershell
python create-reusable-asset/scripts/test_asset_tools.py
python create-reusable-asset/scripts/validate_asset.py <asset-library-root> --strict-clean --policy <validation-policy.json>
```

Keep each project's forbidden terms, extra secret/path patterns and generated folders in its policy file. The validator retains only generic safety defaults; an active working library may contain ignored local dependencies/build output.
Earlier verification: the process/template case completed on RA-004 with successful scaffolding, registration and validation; publication checks covered staged-content and identity boundaries. New v1.6 evidence is recorded after evaluation, not inferred from these earlier results.

Observed for v1.6 on 2026-09-28:

- Existing scaffold/validator smoke test and installed Skill Creator metadata validation passed.
- Relative Markdown links passed in a clean staged package; strict-clean scanning passed with an external project policy after two inherited issue-log examples were de-identified.
- Three fresh-context agents completed synthetic, proposal-only checks: adopt an upstream renderer; propose a standalone coordination skill without authoring; and separate local preparation from missing hosted execution access while comparing competing proposals.
- A separate judge reviewed the supplied response excerpts against the evaluation criteria and found no material behavioral failure; it did not rerun the actor tasks or packaging checks. A separate scope review checked the full change set.

These checks establish scoped proposal behavior, not successful live integration, a completed infographic pilot, or measured quality/speed gains. No previous-version comparison, independent second model surface, actual consumer installation workflow, or hosted-adapter deployment is claimed. Those remain pending before broader reuse/release claims.

## Inputs, outputs, and adoption

Input is a scoped user outcome, relevant project context, and any available asset inventory or research registry. Output is a supported adoption/improvement decision, sufficient resource and agent context for the next build step, and the requested package or update with verification limits.

Use the skill folder as the portable unit. Its three existing Python helpers use Python 3.10+ and the standard library. Established external skill validators may require additional packages; resolve those in the test environment rather than adding them to the runtime package. Provider UI metadata is optional and contains no required connector configuration.

Original repository content has no standalone license declaration; this update does not select or replace a license. Third-party assets retain their own terms and must be assessed before adoption or redistribution.

## Maintenance

Maintain the source here; external adopted assets remain authoritative upstream. Recheck affected cases when task scope, dependencies, provider behavior, or consumer failures change. In this library, discover RA-005 for project delivery and RA-008 for detailed orchestration through their records; do not copy their templates or depend on unmerged local versions. Update the record and inventory together, retaining truthful maturity and test scope.

## Standards and scale path

The skill uses the portable Agent Skills structure and progressive disclosure. Current authoring and repository sources are linked and dated in the relevant references; provider features remain adapters rather than universal format requirements. Keep the filesystem inventory while useful and link authoritative standalone or upstream repositories without mirroring them.

- [Agent Skills specification](https://agentskills.io/specification)
- [Anthropic skill-authoring practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [MCP resources specification](https://modelcontextprotocol.io/specification/2025-11-25/server/resources)

## Boundaries

The skill may identify candidates, but it must not register unverified work as reusable, retire a working source before its replacement passes, or package credentials, private data, or content incompatible with the intended reuse rights. External ownership does not require a local implementation copy. Detailed delivery and orchestration remain with their existing owners; MCP or hosted publication is not required for a local library.
