---
name: create-reusable-asset
description: Check reusable options and capability readiness before build work; discover, adopt, create, improve, verify, and maintain reusable assets and Agent Skills. Use when selecting local or GitHub assets, equipping agents with relevant skills and context, extracting a repeated workflow, or preparing a portable skill or asset repository. This skill prepares reuse and readiness; it does not replace the project's delivery workflow.
---

# Create Reusable Asset

Turn useful project learning into a maintainable asset, or adopt one that already does the job.

**Reuse when useful; adapt when better; invent when necessary.** Keep judgment flexible and make only genuine correctness, safety, and delivery constraints mandatory.

## Find the best existing owner first

1. Establish the requested outcome and scope: discovery, structure proposal, adoption, authoring, improvement, evaluation, registration, or publication. Respect a request to stop after planning; do not scaffold or publish from planning approval alone.
2. Search the local inventory, installed capabilities, and user-provided research registries by outcome. Inspect only the selected records. Follow promising external candidates to their authoritative repositories and current documentation before deciding to build.
3. Use the discovery reference below to choose direct adoption, composition, a thin adapter, an upstream improvement, a justified fork, or new work. An external asset can remain externally owned; registration does not require copying it into the library.
4. Before editing, state the observed reusable gap and proposed improvement. Keep unproven opportunities as candidates. Separate reusable core, replaceable project profile, evidence, and excluded/generated material.
5. Create a new reusable asset only for demonstrated repeated or cross-project value, costly rediscovery, or a high-value reusable method that existing owners do not cover. Otherwise keep the work project-specific or record a deferred candidate.

## Confirm readiness before building

Before substantive build or integration work, use [Build readiness](references/build-readiness.md) to confirm the reuse decision, authoritative sources, selected skill instructions actually read, repository/version, available tools/access, role-specific context, and observable acceptance checks. Reuse recent evidence when its assumptions remain valid; do not repeat discovery for every edit.

Use the smallest team that can resolve the task's uncertainty. For consequential or contested choices, obtain an independent challenge and resolve material disagreements against evidence. A listed capability, simulated contender, agent vote, or judge score is not proof that an operation works. Missing execution prerequisites block only dependent work, not useful research or preparation.

## Load only what the task needs

| Task | Read |
|---|---|
| Find and assess existing assets before building | [Discovery and adoption](references/discovery-and-adoption.md) |
| Confirm resources and agent context before a build | [Build readiness](references/build-readiness.md) |
| Choose an asset type or separate a domain starter from its method | [Asset patterns](references/asset-patterns.md) |
| Author or improve a portable Agent Skill | [Skill authoring](references/skill-authoring.md) |
| Choose repository structure, register ownership, publish, or maintain an asset | [Repository lifecycle](references/repository-lifecycle.md) |
| Create or update the asset's concise record | [Asset record template](references/asset-record-template.md) |
| Design or run behavioral evaluations | [Evaluation cases](references/evaluation-cases.md) |
| Diagnose a recurring packaging or reuse failure | [Issue-resolution patterns](references/issue-resolution-patterns.md) |
| Prepare a public package's private validation policy | [Policy example](references/validation-policy.example.json) |

## Build the smallest useful change

- Define inputs, outputs, dependencies, and observable success before writing extensive guidance.
- Keep reusable instructions independent of this conversation, private planning documents, and personal machine paths. Use relative paths, replaceable configuration, and fictional or redistributable examples.
- Keep one owner for each instruction. Put shared decisions in the entry point and conditional detail in directly linked references; do not copy provider manuals or load every catalog by default.
- Use available authoring tools. For a new local catalog record, use [scaffold_asset.py](scripts/scaffold_asset.py); it creates a Draft record, not a finished skill or repository. For a standalone or external asset, keep only a pointer record in the catalog.
- Do not add scripts, schemas, compatibility matrices, CI, or extra governance files without an actual consumer need. Reuse established helpers when deterministic behavior is necessary.
- Preserve unrelated work. Use an isolated branch or checkout when the existing working tree contains other changes.

## Verify before claiming reuse

1. Resolve an available runtime and run relevant existing checks. Run new or changed executable helpers; instruction changes need behavioral checks, not tests that merely match their wording.
2. Check skill metadata and relative links, then try a clean installation containing only the transferable package. Provider metadata alone does not prove portability.
3. For a new or substantially changed judgment-heavy asset, run at least three representative evaluations selected for its actual behavior. A small correction needs the affected case and relevant regression checks. Record what ran, failed, was fixed, or remains untested.
4. Compare with the previous version or a no-skill baseline when claiming a quality or speed improvement. Structural validation alone does not establish either claim.
5. For library records, run [validate_asset.py](scripts/validate_asset.py). For public transfer, run its `--strict-clean --policy <external-policy.json>` check on a staged package, review the actual diff and included files, and verify one consuming workflow. The scanner is a limited check, not a safety guarantee.
6. Keep Draft or Pilot status until the claimed scope has observed evidence; distinguish a published experimental package from a verified release.

## Publish and maintain one source of truth

- Follow the repository lifecycle reference for publication. Confirm destination, existing authorization, license decision, and applicable repository controls before the public write; do not repeatedly ask for authority already granted for that action.
- Transfer safely: stage intended content, verify the clean copy, repoint the consumer, and only then retire an obsolete copy when authorized. Never move a working source first.
- Keep inventory and consumer links aligned with the authoritative package. Hosted registrations and installed copies are versioned adapters or distribution copies, not independent owners.
- Classify feedback before changing instructions: source/input, reusable guidance, catalog, tool/environment, or one-off output. Strengthen the owning asset only when evidence supports a reusable correction, then verify both the asset and its consumer.
- Keep private evidence and named comparative research outside the public package. Summarize only generic lessons, observed verification, and known limits in the asset record.

Ask only for missing decisions that materially change ownership, scope, licensing, publication, destructive movement, sensitive-data handling, or cost. Complete authorized preparation first. Finish with the outcome, changed files, verification, remaining limitations, and any required next decision.
