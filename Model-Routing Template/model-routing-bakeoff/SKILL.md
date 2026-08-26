---
name: model-routing-bakeoff
description: Preflight providers, run small representative bake-offs, and route tasks to the cheapest adequate model with documented fallbacks. Use when choosing models, comparing MT vs LLM paths, fixing silent network hangs before long runs, or updating a project model-routing matrix.
---

# Model Routing Bake-off Skill (RA-004)

Select the cheapest model already proven adequate. Prove it with a **preflight gate** and a **small representative bake-off**, then write the decision into the project routing matrix.

## When to use

- Choosing default / fallback / escalation for a task class
- Comparing specialist APIs (e.g. NMT) vs LLM paths
- Before any long multi-provider run that can hang or burn tokens
- Refreshing routes after price, outage, DNS/VPN, or quality failures

## Do not use for

- Packaging a new library asset (RA-003)
- Indic client implementation details alone (RA-007 owns executables)
- Multi-agent topology design alone (RA-008)
- Public essay drafting alone (RA-009)

## Operating loop (token-efficient)

```text
1. Read inventory → this ASSET.md → only needed references below
2. PREFLIGHT (mandatory) — fail in seconds, not after a silent hang
3. Define task class + identical inputs + rubric + cost unit
4. Run smallest bake-off that can change the default (often 1 video / 8–12 slices)
5. Independent judge (different model family) OR human gold
6. Decision record: default / fallback / escalation / known limitation / budget guardrail and response
7. Update project MODEL_ROUTING matrix; strengthen owning asset if a reusable lesson appeared
```

## Mandatory preflight

Before expensive work:

1. Follow [`references/PREFLIGHT_GATE.md`](references/PREFLIGHT_GATE.md).
2. For Indic GU→EN stacks, run RA-007:

```powershell
$env:PYTHONUNBUFFERED="1"
$env:PYTHONIOENCODING="utf-8"
python -u path\to\Indic-language-tools\scripts\preflight_indic.py --profile mt_bakeoff --env-file .env --out-json preflight.json
```

3. If preflight fails: **stop**. Fix DNS/VPN/keys/timeouts. Do not start the bake-off.
4. Write `progress.json` / `preflight.json` before the first long loop.

## Bake-off method

Follow [`references/BENCHMARK_METHOD.md`](references/BENCHMARK_METHOD.md).
Route task classes with [`references/TASK_ROUTING_GUIDE.md`](references/TASK_ROUTING_GUIDE.md).
Fill the project copy of [`../MODEL_ROUTING_TEMPLATE.md`](../MODEL_ROUTING_TEMPLATE.md).

## Selection rule

1. Reject anything failing the project's **named** mandatory gates (correctness, privacy, completeness, critical-error caps—as declared for that project).
2. Among passers, apply the **accepted priority mix** from the bake-off perspective map (speed / quality / cost / privacy / completeness combinations).
3. Use latency and repeatability as tie-breakers when the mix does not decide.
4. Separate **ops reachability** (DNS/VPN/quota) from **quality scores**.
5. Keep benchmark docs neutral (metrics + perspectives); record the chosen default in the project routing matrix with human ACCEPT.

## Compose with

| Asset | Use |
|---|---|
| RA-007 | `preflight_indic.py`, `bhashini_client.py`, Indic MT executables |
| RA-008 | Dual-LLM / judge topologies; fail-open MT stage |
| RA-003 | Log AR-xxx when a failure teaches a reusable prevention |
| RA-009 | Public write-up of method (never paste secrets or private case facts) |

## Quality gates

- Preflight report exists and `ok=true` before long runs
- Blind translators (no taxonomy leakage) when MT quality is under test
- Judge is not one of the systems under test
- Benchmark includes metrics **and** a perspective map (not a single forced winner)
- Project default dated with evidence path + named priority mix + human ACCEPT
- Budget horizon, request/tool caps and the action on budget exhaustion are explicit; a cost guardrail never overrides a mandatory quality, safety or privacy gate
- No personal credential paths in reusable core (AR-006)
