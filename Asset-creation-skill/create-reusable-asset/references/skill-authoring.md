# Portable AI-skill authoring

Read this reference only when the selected reusable-asset pattern is **AI skill**.

## Ownership and reuse decision

1. Search the central inventory and candidate runtime registries before creating anything.
2. Identify the single outcome, trigger and boundary. If an existing skill owns that outcome, upgrade it instead of creating an overlap.
3. Keep the central reusable package canonical. Runtime registrations such as Codex or TrueFoundry are versioned distribution adapters.
4. Treat platform-bundled skill creators as upstream guidance, not a second canonical source. Distil portable principles; do not copy vendor instructions wholesale.

## Minimum package

Every skill needs a `SKILL.md` with valid YAML frontmatter:

```yaml
---
name: short-lowercase-name
description: State what the skill does and when it applies; include a boundary only when it prevents likely misrouting.
---
```

Use lowercase letters, digits and hyphens. Keep the name short and action-oriented.

Add only resources with a demonstrated purpose:

- `references/` for substantial conditional guidance, schemas or maintained source links;
- `scripts/` when repeated deterministic execution is safer than regenerating commands or code;
- `assets/` for files copied into deliverables, not instructions;
- `agents/openai.yaml` or an equivalent runtime manifest only when that platform uses it.

Do not add README files, examples, folders or duplicated manuals merely to make the package look complete.

## Instruction design

- Assume a capable agent. Include non-obvious guidance that changes decisions, prevents a demonstrated failure or preserves a required invariant.
- Preserve user intent, scope and authorization. A skill does not grant permission for external writes, deletion, deployment, publication, spending or credential access.
- Match specificity to risk. Use strict sequences only when deviation creates a concrete correctness, security or governance failure.
- Keep the entrypoint concise. Put shared outcome, routing, constraints and stop conditions in `SKILL.md`; move mode-specific detail into linked references.
- Keep examples fictional and minimal. Do not turn one project's terminology, paths, tools, evidence or preferences into universal instructions.
- Prefer live tool discovery and official documentation for capabilities that change. Record a refresh condition rather than freezing an unverified tool list.
- Define bounded retries and stopping conditions for external or expensive operations.

## Create or upgrade

For a new skill, initialize the smallest useful package with the runtime's supported scaffolder when available. Do not reinitialize an existing skill.

For an upgrade:

1. Read the current skill, its callers, manifest and relevant evaluation evidence.
2. Identify the observed weakness and its reusable root cause.
3. Make the narrowest change that fixes the reusable behavior.
4. Preserve unrelated invocation policy, metadata and resources.
5. Update adapters only after the canonical package passes validation.

## Runtime adapters

A distribution adapter may change installation metadata, tool prefixes or UI fields, but must preserve:

- canonical owner and version;
- outcome and activation boundary;
- authority and confirmation rules;
- required references and evaluation expectations;
- refresh conditions for changing platform capabilities.

Do not embed private paths or project facts in a hosted registry. If the registry cannot package references, produce one concise self-contained adapter and keep the richer canonical reference in the central library.

## Verification

Run the runtime's structural validator when available, then run the three AI-skill cases in [evaluation-cases.md](evaluation-cases.md) with fresh context and raw inputs.

Verify observable behavior rather than matching exact wording:

- the right requests activate the skill and adjacent requests do not;
- it reuses or upgrades the correct owner instead of duplicating it;
- it preserves authority boundaries and asks only consequential questions;
- it loads only relevant references;
- it produces usable outputs and evidence;
- a runtime adapter remains consistent with the canonical skill.

Mark the skill reusable only from observed evidence. Record untested platform behavior or cross-model evaluation as pending.

## Maintenance

Route a demonstrated reusable failure to the owning skill, update its regression case, validate the canonical package, then refresh distribution adapters. Never silently mutate the reusable core from one local incident.
