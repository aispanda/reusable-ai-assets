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
4. **For story/build execution:** Keep the Linear issue and Git/PR as the default contract and implementation evidence. Create Build Components only for a complex, multi-phase, cross-agent, or audit-sensitive build; create a Story Retro after material failure, rework, repeated friction, or a completed slice with reusable learning. Architecture/ADR documents record material decisions and rationale; Git remains the source of truth for code. Create a temporary issue/PR-linked handoff only when continuity requires it.
5. Classify every component as reusable core, replaceable project profile, evidence/provenance, or excluded generated/dependency output.
6. Choose the appropriate pattern and risk tier from [asset-patterns.md](references/asset-patterns.md). When the primary pattern is an AI skill, read [skill-authoring.md](references/skill-authoring.md) before editing or creating the package. For a new record, run [scaffold_asset.py](scripts/scaffold_asset.py); do not hand-write standard boilerplate.
7. Replace embedded project facts and machine paths with relative configuration or explicit parameters. Keep one representative fictional example when it materially improves adoption or testing.
8. Publish safely: staged copy -> clean verification -> consumer wrapper/router repoint -> obsolete duplicate removal. Never move the working source first.
9. Resolve approved runtimes and verify one representative utility before testing. Run narrow tests, consumer tests, [validate_asset.py](scripts/validate_asset.py), and `--strict-clean` against a staged transfer package. For provider SDK adapters, make test doubles enforce the real SDK request-builder parameter names and run one bounded live smoke after authorization; a permissive fake is not contract evidence. For history/change-feed adapters, test a resource deleted between listing and retrieval separately from an expired checkpoint, advance only through the authoritative returned checkpoint, and keep non-tombstone errors fatal. For AI skills, run the three AI-skill cases in [evaluation-cases.md](references/evaluation-cases.md); for other judgment-heavy processes, run the three general cases. Mark `Reusable` only from observed evidence.
   On managed Windows hosts, if policy blocks an exact reviewed project-local PowerShell script, use a new process with a process-scoped execution-policy bypass. Never change persistent user or machine policy.
10. When a failure reveals a reusable workflow weakness, add the evidence, root cause, safe resolution and prevention to [issue-resolution-patterns.md](references/issue-resolution-patterns.md). Do not log routine project defects that teach nothing reusable.
11. Route each reusable lesson to the asset that owns the affected behavior and strengthen its checklist, template, validator or test. If no existing asset owns the use case, highlight a candidate with its outcome and boundary; do not create it silently.

## Document strategy for multi-phase builds

When executing a complex RA (typically 6+ phases), use only the documents that add evidence or continuity:
- **Linear first:** Create justified story documents directly in Linear; do not create a local draft merely for conversion.
- **Build Components:** Record meaningful component areas, rationale, deletion, and canonical commit/PR evidence at decision-gate checkpoints. Do not duplicate the Git diff or update per generated file.
- **Story Retro:** Compare the issue contract with observed evidence after material failure, rework, repeated friction, or a completed slice. A blocked recovery may use an interim retro without claiming completion.
- **Architecture/ADR:** Record material design decisions and rationale. Code and the reviewed diff remain implementation truth.
- **Handoff:** Create temporary issue/PR-linked live state when an agent/session boundary requires continuity; stable doctrine remains with the handoff asset owner.
- **Deployment checkpoints:** Append concise dated receipts only when release state changes; link the canonical release evidence.
- **Credential scope:** For credential work, record aliases, projects, approved principals, access level, rotation, and cache/revocation behavior without secret values.
- **Tool rationale:** Include only when the choice is material to adoption, risk, or maintenance.

## Compounding improvement loop

`Deliver -> observe repetition/failure -> strengthen the owning asset or flag a genuine gap -> validate -> register -> reuse -> learn again.`

Prefer an improved existing skill over a growing catalogue of overlapping skills. The library compounds only when verified learning returns to the reusable owner.

## AI-skill authoring mode

RA-003 owns the reuse decision and lifecycle. [skill-authoring.md](references/skill-authoring.md) owns the portable authoring method used only when the selected asset is an AI skill.

- Keep the central reusable package canonical. Codex, TrueFoundry, project, or other platform registrations are distribution adapters, not competing owners.
- Treat platform-bundled authoring helpers as useful upstream guidance; do not copy them wholesale or depend on their presence in every runtime.
- Distil only portable, decision-changing principles into the central reference and record official-source or live-tool refresh conditions for capabilities that change.
- Update an existing skill when it already owns the outcome. Create a new skill only when the trigger, outcome and boundary are genuinely distinct.
- Test the skill's behavior on realistic requests. Structural validation alone does not prove that routing, authority or outputs are correct.

## Specific use-case models

Do not relabel one project's schema as universal. Separate three layers:

- **Method/core:** elicitation checklist, naming rules, DBML/data-dictionary format, generators, validators and review workflow.
- **Domain starter:** a clearly labelled starting profile such as customer-support case management, with assumptions and POC/MVP/later boundaries.
- **Project profile:** local entities, terminology, fields, rules, examples and integrations; it remains owned by the consuming project.

Prefer configuration and profiles over copied forks. State that starter fields are recommendations that projects may tailor.

## Token discipline

- Stop when the current decision has sufficient evidence. If more research, implementation, evaluation or context would materially expand scope or cost, pause with: the reason it may change the outcome, the counterpoint for stopping now, and the smallest owner decision needed. Continue without interruption for routine, reversible judgment.
- Before external comparison or inspiration research, ask the consuming user what decision it should inform, what they want researched, their constraints and the stop condition.
- Enforce a two-corpus boundary. A designated private evidence corpus may contain named sources, observations, prices and licence facts, but no consuming-product identifier, path, architecture, requirement, priority, backlog or decision. Product and reusable corpora may contain independently authored conclusions and generic methods, but no named comparative detail, claim or citation. Never combine both corpora in one artifact.
- Governance manifests may record minimal source and destination identity for custody; they must not become narrative comparison. Keep immutable pre-separation archives classified and excluded from active routing rather than silently rewriting or deleting them.
- Verify both directions with deterministic scans: evidence corpus contains no consumer identifiers, and every protected product/reusable/public root contains no forbidden comparative terms. Treat an intersection as a hard stop until separated.

- Reduce cost through targeted reads, progressive disclosure, reusable automation and evidence links; never reduce required quality, safety, scope or verification.
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
- For AI skills: valid frontmatter, a concise discriminating description, progressive disclosure, no unnecessary resources, aligned UI metadata where used, and no unverified platform-specific tool names in portable core instructions.
- Distribution adapters identify the canonical owner/version and refresh rule; they must not silently widen authority or become the only updated copy.
- Central inventory and affected project routers pointing to the canonical asset.
- No competing active copy without an explicit migration status.
- A staged public-release package passes `--strict-clean` and a project-owned `--policy` file before any commit or push. Keep client names, private projects, extra secret patterns, local roots and tool-output folders in that external JSON policy; use repeatable `--forbid-term` only for one-off additions. Start from [validation-policy.example.json](references/validation-policy.example.json).
- The staged package has a reviewed file count/size, contains no dependencies or generated evidence, passes credential and personal-identity scans, and preserves only fictional examples.
- Before public commit: verify remote visibility, privacy-safe author identity, the authenticated Git principal's access to the target owner/repository, licence decision, explicit publication approval, and `git diff --cached --check`. Commit author and remote credentials are separate identities. Rerun affected functional tests after mechanical formatting.
