# Evaluation cases

Use fresh context and the raw source artifact. Do not provide the intended answer.

| Case | Input | Expected evidence |
|---|---|---|
| Code/tool extraction | A project-local utility with config, tests, generated output and one machine-specific path | Separates core/profile/output, parameterizes paths, excludes dependencies, verifies a clean consumer run and repoints routers |
| Use-case model starter | A working schema for one business scenario | Extracts method + labelled domain starter + project profile; preserves assumptions and phase scope; validates a second-use-case adaptation |
| Process/template extraction | A repeated decision or governance workflow spread across project docs | Finds the owning facts, produces one concise template/checklist, avoids copied history and verifies it on a different scenario |

Pass only when the agent asks solely for consequential decisions, produces no competing source of truth, records observed verification, and keeps its response concise.
