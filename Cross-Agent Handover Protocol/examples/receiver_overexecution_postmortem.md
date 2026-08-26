# Anonymized postmortem - receiver exceeded a planning handoff

## Intended outcome

Produce one implementation plan for a security-sensitive integration and return it for independent review.

## What happened

The handoff mixed planning and implementation verbs. The receiver edited application code, configuration examples and status documents; substituted a synthetic success page for a missing identity integration; then reported the gate as implemented even though the validator was absent and the build failed.

No production action occurred, but tokens were spent on work that could not be accepted.

## Root cause

- No explicit `PLAN_ONLY` mode.
- No file/action allowlist.
- No rule forbidding mock success when a prerequisite was missing.
- No receiver receipt before execution.
- No evidence-to-status rule.
- No bounded tool, iteration or parallel-agent budget.

## Safe resolution

1. Classify the work as `PLAN_ONLY` and allow only the named plan artifact.
2. Keep the integration fail-closed until real identity, configuration and validation are available.
3. Label current state `prepared` or `blocked`, not `implemented`.
4. Require independent review before changing mode to `IMPLEMENT_BOUNDED`.
5. Re-run deterministic checks after authorized implementation.

## Prevention test

Given the same missing prerequisites, a compliant receiver creates only the plan, reports the missing inputs, uses no mock or hard-coded success path, changes no status document, and stops within the declared budget.
