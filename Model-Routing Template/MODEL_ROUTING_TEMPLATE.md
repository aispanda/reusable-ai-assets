# [Project] Model-Routing Matrix

**Owns:** Which AI model/agent surface and effort level to use for each project task.
**Does not own:** Product runtime-model architecture, feature scope, security policy, or permanent leaderboard scores.
**Status:** Living | **Last verified:** YYYY-MM-DD | **Human owner:** [name]

## 1. Operating rule

1. Use the cheapest model already proven adequate for the task.
2. Escalate high-risk, ambiguous or failed work to a stronger model/agent.
3. Cross-review consequential decisions with a different model family or independent method.
4. Treat tests and accepted outputs as the contract; vendor and public benchmarks are candidate signals only.
5. Let users override the default when permitted; show the expected quality, cost, speed or privacy trade-off.

## 2. Scope and gates

| Item | Project answer |
|---|---|
| Work being routed | [development, research, documents, multimodal, etc.] |
| Excluded work | [customer-facing runtime AI, regulated decisions, etc.] |
| Mandatory quality gate | [tests/acceptance criteria] |
| Safety/privacy gate | [data allowed, provider controls, human review] |
| Cost unit | [API tokens, subscription quota, elapsed agent time—never mix silently] |
| Review trigger | [major release, price/retirement change, failure pattern, or before changing a default] |

## 3. Candidate fact sheet

Keep three or four finalists per task, not a universal catalogue.

| Candidate | Provider/model ID/surface | Stable or preview | Relevant capabilities | Data/privacy boundary | Price basis | Official source | Verified |
|---|---|---|---|---|---|---|---|
| [A] | [...] | [...] | [...] | [...] | [...] | [link] | YYYY-MM-DD |

Evidence labels:

- **OFFICIAL:** model identity, supported features, limits, lifecycle and price from provider sources.
- **INDEPENDENT SIGNAL:** dated benchmark with category, harness and settings stated.
- **OBSERVED:** result from this project's controlled task and environment.
- **DECISION:** human-accepted route; never infer it from a benchmark alone.

## 4. Task routes

| Task class | Default | Why | Fallback | Escalation trigger/route | Manual choice | Evidence / last tested |
|---|---|---|---|---|---|---|
| [bounded routine work] | [...] | [...] | [...] | [...] | Allowed / restricted | [...] |
| [high-risk work] | [...] | [...] | [...] | [...] | Human approval | [...] |

Do not translate effort labels across providers as if they were equivalent. Record the exact valid setting for each surface and prove it on the task.

## 5. Small representative bake-off

Use identical source context, prompt/brief, tools, time boundary and acceptance tests. Test only work representative of the intended route.

| Candidate | Gates passed? | Critical/major defects | Human corrections | Elapsed time | Input/output/cache usage | Total cost basis | Repeat-run variance | Evidence link |
|---|---|---:|---:|---:|---:|---:|---:|---|
| [A] | Yes/No | [...] | [...] | [...] | [...] | [...] | [...] | [...] |

Selection rule:

1. Reject any candidate failing correctness, security, privacy or mandatory acceptance gates.
2. Among passing candidates, select the lowest total cost including human correction/review effort.
3. Use elapsed time and repeatability as tie-breakers.
4. If results remain close, run one harder representative task—not a broad benchmark programme.

## 6. Decision record

| Task | Accepted default | Fallback/escalation | Why versus finalists | Known limitation | Accepted by | Date |
|---|---|---|---|---|---|---|
| [...] | [...] | [...] | [...] | [...] | [...] | YYYY-MM-DD |

## 7. Lifecycle and refresh

- Recheck immediately before changing a default and after material release, retirement, pricing, privacy or failure-pattern changes.
- Otherwise review on the project's chosen cadence; volatile facts must carry a verified date.
- Preserve the last proven fallback until its replacement passes the same gates.
- Never copy live Elo/rank alone; category, harness, tool access, inference settings and date can reverse results.
- Archive test evidence or link it; keep the routing matrix concise.

## 8. Concise handback

Report only: routes changed, observed evidence, cost/quality impact, unresolved risk, and exact human decision required.
