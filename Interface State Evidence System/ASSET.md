# RA-009 — Interface State Evidence System

| Metadata | Value |
|---|---|
| Category | Interface delivery / quality evidence |
| Select when | component catalog, state contract, deterministic fixture, visual evidence, interaction evidence, accessibility review, master-plus-adapter adoption |
| Entry point | `README.md` |
| Status | Draft — implementation starter; cross-project evaluation pending |

## Outcome

Provide a portable, low-context way to define, render, verify, and reuse important interface states. The system turns a vague request such as “make this flow clear and reliable” into a bounded state contract, real component fixtures, visible evidence, and a small project adapter.

## Reuse boundary

The reusable core owns the vocabulary, state matrix, evidence rules, profile format, validation, and neutral examples. A consuming project owns its production components, local theme, approved copy, data-access logic, component-specific fixtures, build commands, and release evidence. The central package is canonical; projects retain only their profile, adapter, and evidence links.

The system is not a replacement for a product’s source code, domain model, privacy review, security review, authorization checks, end-to-end checks, or release approval. A rendered state proves only that the declared interface scenario rendered and behaved according to the recorded evidence.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `README.md` | Adoption workflow and source-of-truth model | Reusable core |
| `templates/UI_CONTEXT_PACKET.md` | Small implementation packet for one surface | Reusable core |
| `templates/STATE_CONTRACT.md` | State, recovery, accessibility, and evidence matrix | Reusable core |
| `templates/PROJECT_PROFILE.example.json` | Machine-readable project profile | Reusable core |
| `references/evidence-model.md` | Evidence types, quality boundaries, and review rules | Reusable core |
| `references/originality-and-data-boundary.md` | Original-language, provenance, and data-safety guardrails | Reusable core |
| `examples/generic-profile.json` | Fictional example profile | Reusable core example |
| `scripts/validate_interface_state_evidence.py` | Deterministic package/profile validation | Reusable core |
| `<consumer>/ui-evidence/` | Project profile and thin adapter | Project profile / adapter |
| `<consumer>/evidence/` | Screenshots, reports, and review results | Project evidence |

## Inputs and outputs

**Inputs** are a verified production component or surface, a user outcome, material roles, applicable states, existing style and component references, known risks, and the local verification commands. The core never receives credentials, live customer data, personal device paths, production identifiers, unreviewed third-party code, or copied expressive material.

**Outputs** are a state contract, deterministic fixture plan, project profile, narrow implementation adapter, verification result, and a short list of unresolved decisions. The project’s code and execution record remain authoritative for implementation status; this package records the reusable method and evidence boundary.

## Use / transfer

1. Start with `README.md` and complete one `UI_CONTEXT_PACKET.md` for the smallest meaningful surface.
2. Complete `STATE_CONTRACT.md` before adding a new visual variant or component state.
3. Copy the example project profile into the consuming repository and replace only neutral placeholders with local paths and commands.
4. Render real production components using deterministic fixtures. Preserve one portable core and avoid copying the package into every project.
5. Run the validator, then the consuming project’s smallest relevant build and test commands.
6. Promote repeated, verified patterns into this package only after a cross-project review. Keep one-off decisions in the project profile.

## Dependencies, cost and licensing

The reusable core has no runtime dependency and uses the Python standard library for validation. A consuming project selects and pins its own catalog, test, rendering, accessibility, and visual-comparison tools after checking compatibility, cost, telemetry, license, support lifecycle, and environment constraints. Any icon, font, image, component package, fixture data, or test service must have a documented license and approved source before release.

## Verification

Run the following checks from the reusable-asset library root:

```text
python "Interface State Evidence System/scripts/validate_interface_state_evidence.py" --root .
python "Interface State Evidence System/scripts/validate_interface_state_evidence.py" --root . --profile "Interface State Evidence System/examples/generic-profile.json"
```

Before moving from Draft, the package must pass structure validation, contain only neutral example data, and complete at least three independently verified consumer evaluations. Each consumer also runs its own relevant build, rendering, interaction, accessibility, visual, and release checks; their results are project evidence and are not implied by the core validator.

## Boundaries and limitations

Do not treat a catalog image as proof of authorization, privacy, security, data integrity, performance in the field, or full-flow behavior. Do not use this package to copy another product’s wording, branding, visual expression, layout, artwork, or claims. Use original neutral language and synthetic examples. Escalate consequential intellectual-property, privacy, consumer-claim, contract, safeguarding, accessibility-conformance, or jurisdiction-specific questions for qualified review.

No deployment, data change, public publication, account action, paid-service activation, or destructive operation is authorized merely by adopting this asset.
