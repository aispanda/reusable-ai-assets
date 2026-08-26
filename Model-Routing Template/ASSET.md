# RA-004 - Model-Routing Template

| Metadata | Value |
|---|---|
| Category | AI operations / governance |
| Select when | model selection, task routing, bake-off, preflight, cost, quality, fallback, refresh |
| Entry point | [`model-routing-bakeoff/SKILL.md`](model-routing-bakeoff/SKILL.md) · matrix [`MODEL_ROUTING_TEMPLATE.md`](MODEL_ROUTING_TEMPLATE.md) |
| Status | Reusable v1.1; bake-off skill + preflight gate added |

## Outcome

Select the cheapest model proven adequate for each task while preserving quality, independent review, user choice, safe escalation and rapid replacement as models change. **Preflight before long runs** so failures surface in seconds.

## Reuse boundary

The stable asset is the decision method, preflight gate, bake-off method, evidence separation, routing table and refresh process. Current model names, prices, rankings, project tasks and accepted defaults remain replaceable project profiles. Executable Indic clients live in RA-007.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `model-routing-bakeoff/SKILL.md` | Agent skill: preflight → bake-off → decision | Reusable core |
| `model-routing-bakeoff/references/PREFLIGHT_GATE.md` | Mandatory pre-run checks | Reusable core |
| `model-routing-bakeoff/references/BENCHMARK_METHOD.md` | Small representative bake-off design | Reusable core |
| `model-routing-bakeoff/references/TASK_ROUTING_GUIDE.md` | Task-class routing map | Reusable core |
| `MODEL_ROUTING_TEMPLATE.md` | Project matrix template | Reusable core |
| Consuming project's routing matrix / bake-off outputs | Live defaults and evidence | Project profile / evidence |

## Inputs and outputs

Inputs: task classes, quality/safety gates, candidate models, credentials via env, official provider facts, local trials.
Outputs: dated default/fallback/escalation per task; `preflight.json`; bake-off artifacts; human-approved change record.

## Use / transfer

1. Copy or link this folder; agents open the skill first.
2. Run preflight (RA-007 `preflight_indic.py` when Indic MT is in scope).
3. Copy `MODEL_ROUTING_TEMPLATE.md` into the project docs area and fill it.
4. Run only the smallest bake-off needed; keep evidence local.
5. Log reusable failures into RA-003 issue patterns and strengthen this skill or RA-007.

## Dependencies, cost and licensing

Markdown skill has no runtime cost. Trials may cost API money—cap candidates and require preflight. Follow each provider's terms.

## Verification

- Method mapped from live GU→EN MT bake-off + DNS/DoH preflight lessons (2026-08-09).
- Broader cross-project evaluation still pending.

## Boundaries and limitations

Routes AI used to perform project work. Does not select a product's customer-facing runtime model, freeze prices, or authorize sending sensitive data to a provider. Human owners accept material defaults.
