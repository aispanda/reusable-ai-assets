# RA-001 — Data Model Exploration Suite

| Metadata | Value |
|---|---|
| Category | Data architecture / visualization |
| Select when | DBML, ERD, schema review, data dictionary, relationship exploration or public schema presentation |
| Entry point | `open_data_model_workspace.ps1` |
| Status | Reusable v1.0 |

## Outcome

Turn one canonical DBML file into disposable interactive local/public views and a keys-only ERD without a live database, paid diagram API or duplicate schema source.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `workspace/` | React/TypeScript viewer, parser, validation, ELK layout, tests and static build | Reusable core |
| `open_data_model_workspace.ps1` | Build, launch and browser entry point | Reusable automation |
| `generate_keys_only_erd.ps1` | Optional keys-only DBML/SVG generator | Reusable automation |
| `examples/SAMPLE_MODEL.dbml` | Runnable example and project-profile acceptance fixture | Replace in consuming project |
| `workspace/workspace.config.json` | Default schema path | Replaceable project profile |

Do not transfer `node_modules/`, `generated/`, `dist*/`, `review/`, `test-results/`, `playwright-report/`, `qa-evidence/`, credentials, customer data or project screenshots/PDFs.

## Capabilities

- Tables-only, keys/relationships and all-fields views from one model.
- Search, domain filtering, compact filtered layout and relationship paths.
- PK/FK/required markers, types, field dictionary, Crow's Foot cardinality and relationship explanations.
- Accessible pan/zoom/fit controls and responsive desktop/tablet/mobile layouts.
- Local annotations and a public static build with write paths removed.

## Use

```powershell
.\open_data_model_workspace.ps1 -DbmlPath ".\examples\SAMPLE_MODEL.dbml"
```

For a permanent project profile, set `schemaPath` in `workspace/workspace.config.json` to a repository-relative DBML path. Prefer `-DbmlPath` when the central asset serves several projects.

## Transfer and adapt

1. Keep this central folder canonical; add a thin project wrapper that supplies the project's DBML.
2. Update project-specific acceptance examples/counts while preserving parser, model, layout, accessibility and public-build safety tests.
3. Register the central asset record in the project's document router and its code/launcher in the automation router.
4. Run the verification below before deleting any previous project-local copy.

## Dependencies and cost

Node 24+, npm and PowerShell 5.1+ are required by the Windows launcher. Versions are pinned in `workspace/package-lock.json`. React Flow/React/Vite/TypeScript are MIT-compatible, `@dbml/core` is Apache-2.0 and ELK is EPL-2.0. Local/static use has no required subscription.

## Verification

From `workspace/`:

```powershell
npm.cmd install --no-audit --no-fund
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run build:public
npm.cmd run test:e2e
```

Also verify the public bundle contains no absolute machine paths, annotation write APIs, credentials or private data.

## Boundaries

The viewer reviews DBML; it does not edit schema or migrate a database. Public output is read-only. The bundled sample is an example, not a universal schema.
