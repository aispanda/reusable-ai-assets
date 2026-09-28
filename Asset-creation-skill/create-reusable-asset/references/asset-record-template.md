# Asset record template

```markdown
# RA-NNN - Asset name

| Metadata | Value |
|---|---|
| Category | ... |
| Select when | Need-based keywords |
| Entry point | ... |
| Authoritative source | Library path or upstream/standalone repository URL |
| Source revision | Reviewed release or commit, when applicable |
| Status | Discovered / Reviewed / Pilot / Reusable vN, scoped to observed evidence |

## Outcome
One business result.

## Reuse boundary
State what is generic, what is a domain starter, and what remains project-specific.

## Transfer manifest
Link each component and classify it as reusable core, project profile, evidence, or excluded/generated.
For an external owner, link the actual upstream files and list only the adapter/configuration maintained here; do not mirror the implementation.

## Inputs and outputs
State contracts and source-of-truth boundaries.

## Use / transfer
Give the shortest safe command or adoption steps.

## Dependencies, cost and licensing
Pin tools where practical; state recurring cost and licence obligations.

## Verification
List executable checks, the tested environment and source revision, last observed result, and untested limitations; distinguish reading, installation, and successful execution.

## Maintenance
State the owner, upstream/update trigger, affected consumer check, and replacement path if the asset is retired.

## Boundaries and limitations
State what the asset must not do and known assumptions.
```

Link source files; do not duplicate them. Keep project facts in project profiles and examples clearly labelled.
