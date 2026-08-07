# Data Model Workspace

Reusable DBML-to-browser explorer used by RA-001. The authoritative contents, transfer, dependency, limitation and QA record is [`RA-001_DATA_MODEL_EXPLORATION_SUITE.md`](../../docs/reusable-assets/RA-001_DATA_MODEL_EXPLORATION_SUITE.md).

## Quick start (local, one command)

From the **repo root**:

```powershell
powershell -NoProfile -File scripts/Main-scripts/open_data_model_workspace.ps1
```

This installs dependencies if missing, builds model + per-view layouts from the DBML selected in `workspace.config.json`, starts the local dev server, and opens the browser at `http://localhost:5174`.

Options:

| Switch | Meaning |
|---|---|
| `-Port 5175` | Use a different port. |
| `-SkipInstall` | Skip `npm install` (assumes dependencies already installed). |
| `-PublicMode` | Serve the read-only public mode locally for verification. |
| `-DbmlPath <file>` | Temporarily override the configured canonical DBML. |

## Commands inside `tools/data-model-workspace`

| Command | Purpose |
|---|---|
| `npm run build:all` | Parse DBML, validate, emit `generated/model.json` + per-view `positions-*.json`. |
| `npm run dev` | Build artifacts then start the governance dev server. |
| `npm run build` | Production static build (local-governance assets) into `dist/`. |
| `npm run build:public` | Read-only public build into `dist-public/` (annotations/write paths excluded). |
| `npm test` | Unit tests (parser, model, views, graph, selectors, annotations, layouts). |
| `npm run typecheck` | TypeScript strict mode. |

## Modes

- **Local governance (default):** shows an **Annotations** panel. Notes are stored in `review/annotations.json` (versioned JSON, stable selectors). Saving is explicit (Save annotations button) and never touches the canonical DBML. Orphaned notes are reported after schema renames/removals.
- **Public build (`npm run build:public`):** read-only. The annotations panel, local write APIs and governance controls are excluded at build time. Suitable for static hosting. Set optional `VITE_HOST_NAME` and `VITE_HOST_URL` values to show a consuming-site return link without hardcoding its brand into this asset.

## Views

`Tables only` · `Keys & relationships` (default) · `All fields` — all three derive from the same parsed model; no reparsing or duplicate schema copies.

## Deep links

Shareable state lives in the URL hash (`#dm=...`): view, search, domain filter, and an exact table/field/relationship selector. Examples:

```
#dm=view%3Dkeys%26select%3Dtable%253Asupport_cases
#dm=view%3Dall-fields%26select%3Dfield%253Asupport_cases.subject
#dm=view%3Dkeys%26select%3Drel%253Acase_messages.tenant_id%25E2%2586%2592tenants.id
```

Selectors are stable across regeneration (`table:<name>`, `field:<table>.<field>`, `rel:<from>.<col>+<col>→<to>.<col>+<col>`).

## Accessibility

Pan/zoom/fit/reset, minimap, keyboard focus rings, readable cardinality/optionality in the details panel, and colour-independent shapes (PK/FK/optional labels, not colour alone). Relationship labels use progressive disclosure: select a line to reveal its exact field mapping without cluttering the full canvas.

## Generated artifacts

`generated/` is git-ignored. It contains `model.json`, full-schema `positions-{tables-only,keys,all-fields}.json`, and compact `positions-domains.json`. ELK precomputes layouts per view and domain at build time so filtering remains readable without adding browser-side layout cost.

## Dependencies (pinned, recorded)

| Package | Purpose | Licence |
|---|---|---|
| `@xyflow/react` 12.11.2 | Interactive canvas (pan/zoom/minimap, focusable nodes/edges) | MIT |
| `@dbml/core` 9.1.1 | Canonical DBML parsing via `dbmlv2` | Apache-2.0 |
| `elkjs` 0.12.0 | Deterministic layered layout, build-time only | EPL-2.0 |
| `react`/`react-dom` 19.2.8 | UI runtime | MIT |
| `vite` 8.2.1, `@vitejs/plugin-react` 6.0.5 | Build/dev server | MIT |
| `typescript` 5.9.3, `vitest` 4.1.10, `tsx` 4.23.9 | Types, tests, TS runner | MIT/Apache-2.0 |
| `cross-env` 7.0.3 | Cross-platform env var for public build | MIT |

All installs and generated output stay inside `tools/data-model-workspace`; the repository root `package.json` is untouched.
