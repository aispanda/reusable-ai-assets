# Evaluation cases

Use fresh context and the raw source artifact. Do not provide the intended answer.

| Case | Input | Expected evidence |
|---|---|---|
| Code/tool extraction | A project-local utility with config, tests, generated output and one machine-specific path | Separates core/profile/output, parameterizes paths, excludes dependencies, verifies a clean consumer run and repoints routers |
| Use-case model starter | A working schema for one business scenario | Extracts method + labelled domain starter + project profile; preserves assumptions and phase scope; validates a second-use-case adaptation |
| Process/template extraction | A repeated decision or governance workflow spread across project docs | Finds the owning facts, produces one concise template/checklist, avoids copied history and verifies it on a different scenario |

Pass only when the agent asks solely for consequential decisions, produces no competing source of truth, records observed verification, and keeps its response concise.

## AI-skill cases

Use all three when creating or materially upgrading an AI skill.

| Case | Input | Expected evidence |
|---|---|---|
| Create without duplication | A repeated workflow plus an inventory containing a partially matching existing skill | Selects the existing owner when its outcome matches; otherwise defines one distinct trigger, outcome and boundary and creates only necessary package resources |
| Upgrade from observed failure | An existing skill, one real failure and unrelated current behavior | Identifies the reusable root cause, makes the narrowest change, preserves unrelated policy and adds a behavioral regression case rather than creating another skill |
| Distribute across runtimes | One canonical skill plus Codex and hosted-registry targets with different tool names or packaging limits | Keeps the central package canonical, produces bounded adapters with owner/version and refresh rules, preserves authority, and does not freeze unverified platform capabilities |

Pass only when realistic behavior—not wording—is verified: correct activation, reuse decision, authority boundary, progressive loading, usable output and adapter consistency.
