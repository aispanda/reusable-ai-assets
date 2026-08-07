# RA-004 - Model-Routing Template

| Metadata | Value |
|---|---|
| Category | AI operations / governance |
| Select when | model selection, task routing, bake-off, cost, quality, fallback, refresh |
| Entry point | [`MODEL_ROUTING_TEMPLATE.md`](MODEL_ROUTING_TEMPLATE.md) |
| Status | Reusable v1.0; one consumer proven, broader cross-model evaluation pending |

## Outcome

Select the cheapest model proven adequate for each task while preserving quality, independent review, user choice, safe escalation and rapid replacement as models change.

## Reuse boundary

The stable asset is the decision method, evidence separation, routing table, bake-off and refresh process. Current model names, prices, rankings, project tasks and accepted defaults remain replaceable project profiles.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `MODEL_ROUTING_TEMPLATE.md` | Provider-neutral routing and evaluation template | Reusable core |
| Consuming project's routing matrix | Current candidates, tasks, prices, tests and decisions | Project profile; never copy back into core |
| Provider documentation, benchmarks and test output | Evidence for a dated project decision | Evidence; link or regenerate |

## Inputs and outputs

Inputs are task classes, quality/safety gates, candidate models, official provider facts, independent signals and representative local trials. Output is a dated default/fallback/escalation route per task with a human-approved change record.

## Use / transfer

1. Copy `MODEL_ROUTING_TEMPLATE.md` into the consuming project's governed documentation area.
2. Replace placeholders with project tasks and current sourced facts.
3. Run only the smallest representative bake-off needed for material defaults.
4. Keep the completed project profile local; link this central method from its document router.

## Dependencies, cost and licensing

Markdown has no runtime dependency or recurring cost. Model/API trials may cost money; cap the candidate set and test budget before execution. Follow each provider's terms and data-handling requirements.

## Verification

- The template was checked against an existing project routing matrix: its fast rule, candidates, task routes, bake-off, effort labels, sources and refresh policy map without importing project facts or volatile model claims.
- Central scaffold/validator and standard asset-library validation pass.
- Independent use on additional projects/model surfaces remains pending.

## Boundaries and limitations

This asset routes AI used to perform project work. It does not select a product's customer-facing runtime model, guarantee benchmark transferability, freeze prices/rankings, or authorize sending sensitive data to a provider. Human owners accept or reject material defaults.
