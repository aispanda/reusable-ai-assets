---
name: create-reusable-asset
description: Identify, extract, scaffold, package, register, transfer, and verify reusable assets from completed or repeated project work with minimal context. Use when code, automation, templates, prompts, decision frameworks, governance processes, reference mappings, use-case data models, starter architectures, or AI skills may benefit other projects; when closing an activity and checking what should be retained; when centralizing a shared tool; or when auditing an asset library for portability, duplication, missing routers, unsafe data, unclear ownership, or stale copies.
---

# Create Reusable Asset

Turn valuable project work into one portable, governed package without duplicating the source of truth.

## Fast lane

1. Read the central `REUSABLE_ASSET_INVENTORY.md`, then the project documentation and automation routers. Use targeted search only; do not load the whole project.
2. List candidates in one compact table: proposed ID/name, reusable outcome, reusable core, project-specific profile, value, and recommendation. Merge with an existing asset when it already owns the outcome.
3. Package only candidates with repeated use, cross-project applicability, expensive rediscovery, deterministic automation, or a high-value governance pattern.
4. Classify every component as reusable core, replaceable project profile, evidence/provenance, or excluded generated/dependency output.
5. Choose the appropriate pattern and risk tier from [asset-patterns.md](references/asset-patterns.md). For a new record, run [scaffold_asset.py](scripts/scaffold_asset.py); do not hand-write standard boilerplate.
6. Replace embedded project facts and machine paths with relative configuration or explicit parameters. Keep one representative fictional example when it materially improves adoption or testing.
7. Publish safely: staged copy -> clean verification -> consumer wrapper/router repoint -> obsolete duplicate removal. Never move the working source first.
8. Resolve approved runtimes and verify one representative utility before testing. Run narrow tests, consumer tests, [validate_asset.py](scripts/validate_asset.py), and `--strict-clean` against a staged transfer package. For AI skills or judgment-heavy processes, run the three cases in [evaluation-cases.md](references/evaluation-cases.md). Mark `Reusable` only from observed evidence.
9. When a failure reveals a reusable workflow weakness, add the evidence, root cause, safe resolution and prevention to [issue-resolution-patterns.md](references/issue-resolution-patterns.md). Do not log routine project defects that teach nothing reusable.

## Specific use-case models

Do not relabel one project's schema as universal. Separate three layers:

- **Method/core:** elicitation checklist, naming rules, DBML/data-dictionary format, generators, validators and review workflow.
- **Domain starter:** a clearly labelled starting profile such as customer-support case management, with assumptions and POC/MVP/later boundaries.
- **Project profile:** local entities, terminology, fields, rules, examples and integrations; it remains owned by the consuming project.

Prefer configuration and profiles over copied forks. State that starter fields are recommendations that projects may tailor.

## Token discipline

- Read inventory -> selected `ASSET.md` -> only linked components needed for the task.
- Search routers and filenames before opening owning documents.
- Link source files; never paste their contents into `ASSET.md`.
- Reuse one template, fixture and verification command per behavior; do not package historical narration or screenshots as core.
- Batch inventory/router edits after asset files pass checks.
- Report only outcome, files/routers changed, verification, real limitation and required decision.

## Decisions requiring the user

Ask only when the answer changes the reusable boundary, canonical ownership, destructive movement, licence acceptance, secrets/customer-data handling, external publication, or material cost. Otherwise choose safe names, IDs, folders and defaults from existing conventions.

Present a required decision as: recommendation, business benefit, impact/risk, and exact approval needed.

## Quality gate

Do not mark an asset reusable unless it has:

- One clear outcome, need-based trigger, stable ID, central owner and entry point.
- A manifest separating core, profile, evidence and exclusions.
- Defined inputs, outputs, dependencies, licences, cost, limitations and source-of-truth boundary.
- Replaceable project configuration and no credentials, customer data, tracked machine paths, dependencies or generated builds.
- Executed verification plus one clean adoption/consumer test where applicable.
- Three representative evaluations for AI skills or judgment-heavy assets; test more than one capable agent/model surface when available.
- Central inventory and affected project routers pointing to the canonical asset.
- No competing active copy without an explicit migration status.
- A staged public-release package passes `--strict-clean` and a project-owned `--policy` file before any commit or push. Keep client names, private projects, extra secret patterns, local roots and tool-output folders in that external JSON policy; use repeatable `--forbid-term` only for one-off additions. Start from [validation-policy.example.json](references/validation-policy.example.json).
- The staged package has a reviewed file count/size, contains no dependencies or generated evidence, passes credential and personal-identity scans, and preserves only fictional examples.
- Before public commit: verify remote visibility, privacy-safe author identity, the authenticated Git principal's access to the target owner/repository, licence decision, explicit publication approval, and `git diff --cached --check`. Commit author and remote credentials are separate identities. Rerun affected functional tests after mechanical formatting.
