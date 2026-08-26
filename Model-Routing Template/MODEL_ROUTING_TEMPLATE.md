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
| Budget horizon and owner | [Per request / user / day / project cap; who may raise it] |
| Cost guardrails | [Input/output cap, tool-call cap, rate limit, cache policy, and scope rejection] |
| Budget response | [Warn / throttle / route to cheaper proven fallback / require human approval / stop] |
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

| Task class | Default | Why | Fallback | Escalation trigger/route | Cost guardrail | Manual choice | Evidence / last tested |
|---|---|---|---|---|---|---|---|
| [bounded routine work] | [...] | [...] | [...] | [...] | [...] | Allowed / restricted | [...] |
| [high-risk work] | [...] | [...] | [...] | [...] | [...] | Human approval | [...] |
| [specialist MT, e.g. GU→EN slices] | [NMT API / LLM-MT] | [cost + faithfulness + completeness] | [other MT or multilingual LLM on source] | [DNS/quota failure, critical error rate] | [Budget/cap action] | Allowed | [bake-off link] |
| [EN-only downstream after MT] | [cheap/local EN] | [MT already normalized language] | [stronger EN] | [quality gate fail] | [Budget/cap action] | Allowed | [...] |

Do not translate effort labels across providers as if they were equivalent. Record the exact valid setting for each surface and prove it on the task.

Separate **specialist MT reachability** (network/DNS/VPN/quota) from **MT quality**. A provider that is unreachable is not a quality loser — log an ops failure and keep the last proven reachable route.

## 5. Small representative bake-off

Use identical source context, prompt/brief, tools, time boundary and acceptance tests. Test only work representative of the intended route.

| Candidate | Gates passed? | Critical/major defects | Human corrections | Elapsed time | Input/output/cache usage | Total cost basis | Repeat-run variance | Evidence link |
|---|---|---:|---:|---:|---:|---:|---:|---|
| [A] | Yes/No | [...] | [...] | [...] | [...] | [...] | [...] | [...] |

Selection rule:

1. Reject any candidate failing the project's **named** mandatory gates (correctness, security, privacy, completeness, or other declared caps).
2. Among passing candidates, apply the **accepted priority mix** from the bake-off perspective map (speed / quality / cost / privacy / completeness—and combinations). Do not assume “lowest $” is always primary.
3. Use elapsed time and repeatability as tie-breakers when the mix does not decide.
4. Separate ops reachability from quality scores. If results remain close on the chosen mix, run one harder representative task—not a broad benchmark programme.
5. Keep bake-off write-ups neutral (metrics + perspectives); record the chosen default here with human ACCEPT.

Cost controls may lower usage or select a cheaper proven fallback; they must not bypass a mandatory quality, safety or privacy gate. Budget exhaustion has the documented response in Section 2, not silent degraded behavior.

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
