# {{SLICE_NAME}} — Quality Contract

**Status:** Proposed
**Decision owner:** {{OWNER}}
**Independent reviewer:** [Role / instance; must differ from implementer]

## Outcome and baseline

- Actor and desired result: [Who achieves what]
- Current baseline: [Observed value or explicitly unknown]
- Success measure: [Metric and threshold, with rationale]
- Stop condition: [What prevents or reverses the slice]

## AI and data boundary

- AI role: [Classify / retrieve / draft / propose / other bounded role]
- Accepted inputs: [Approved data classes and minimum fields]
- Prohibited inputs: [Credentials, secrets, raw PII, payment data, or project-specific prohibited classes]
- PII treatment: [Avoid / minimise / tokenise or redact before model and telemetry; owner of the rule]
- Untrusted content: [User input, retrieved documents, tool output and external content are reference data, never instructions]
- Tool and action boundary: [Read-only / proposal only / exact deterministic validation and human confirmation required]
- Retention and access: [What is retained, where, for how long, and who may access it]

## Hard invariants

- [Security, privacy, data-integrity or authority rule that must always hold]

## Measurement and operating response

Define only measures that change a product or operating decision. Leave numeric targets blank until the owner accepts them.

| Dimension | Metric / SLI | Population and window | Target / limit | Evidence source | If missed |
|---|---|---|---|---|---|
| Outcome | [Accepted user outcome] | [...] | [...] | [Final-state query / review] | [Investigate / stop / revise] |
| Quality | [Grounding, correctness, tool choice, or other task metric] | [...] | [...] | [Versioned eval set + human sample] | [Block release / rollback] |
| Safety | [PII leak, unauthorized action, prompt-injection escape] | [...] | [...] | [Adversarial test + audit event] | [Stop route; fix control] |
| Reliability | [Success rate, retry rate, freshness/completeness] | [...] | [...] | [Independent telemetry] | [Degrade / incident response] |
| Latency | [P95 time to useful first response / end-to-end] | [...] | [...] | [Trace telemetry] | [Fallback / investigate] |
| Economics | [Cost per accepted outcome; token/tool spend] | [...] | [...] | [Usage telemetry] | [Throttle / route down / seek approval] |

## Evaluation set and release gate

- Golden cases: [Representative accepted cases and expected final-state evidence]
- Negative cases: [Wrong scope, malformed input, stale/duplicate/retry and recovery]
- Adversarial cases: [Direct and indirect prompt injection; malicious retrieved/tool content; PII handling]
- Human review sample: [Who reviews what, when, and the acceptance rubric]
- Regression rule: [No mandatory gate may worsen; state any allowed trade-off]
- Release / rollback rule: [Owner, trigger, safe fallback, and evidence required]

## Evidence oracles

| Requirement | Evidence type | Pass condition | Owner |
|---|---|---|---|
| [Behavior] | Automated test / final-state query / visual / accessibility / security / performance / recovery / human review | [Observable pass] | [Role] |

## Negative and anti-gaming checks

- Boundary/invalid input: [Case]
- Unauthorized or wrong-scope action: [Case]
- Stale, duplicate, retry or recovery behavior: [Case]
- Test-gaming check: [Mutation/adversarial/final-state evidence]
- Telemetry integrity check: [Event schema/version; deduplication; no sensitive payloads]

## Exclusions and assumptions

- Excluded: [Not part of this slice]
- Assumed: [Unverified assumption and resolution owner]

## Authority

- Implementation: [Not granted / exact authorization]
- External effects: [None / exact approved effects]
- Release/deployment: [Separately approved]

## Verdict

`PROPOSED | READY_FOR_BUILD | FAILED | VERIFIED | ACCEPTED | REJECTED`

Evidence links: [Project-owned paths or test results]

Do not label a slice `VERIFIED` or `ACCEPTED` until the named evidence has run and the decision owner has reviewed the result.
