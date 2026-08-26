# Bounded Delivery Control Block

## Authority and limits

- **Outcome:** {{OUTCOME}}
- **Owning requirements:** {{OWNING_DOCUMENTATION}}
- **Task actions:** {{TASK_TRACKER_REFERENCE}}
- **Planning status:** {{PLANNING_SURFACE_REFERENCE}}
- **RA-010 control/handover linkage:** {{RA010_CONTROL_BLOCK_REFERENCE}}
- **Editable/read allowlist:** {{ALLOWLIST}}
- **Explicit exclusions:** {{EXCLUSIONS}}
- **Stop conditions:** overlap, ownership conflict, leakage, insufficient budget, failed validation, unresolved high-severity review, or requested work outside the allowlist

## Budgets

- **Maximum concurrent independent streams:** 3
- **Workers:** one worker per stream; no duplicate worker on a stream
- **Worker budget:** {{PER_WORKER_BUDGET}}
- **Supervisor/reconciliation budget:** {{SUPERVISOR_BUDGET}}
- **Independent reviewer budget:** {{REVIEWER_BUDGET}}
- **Total ceiling:** {{TOTAL_BUDGET}}
- **Targeted repair limit:** 2 passes per stream, re-checked by the same independent reviewer instance

## Durable ledger (supervisor-owned)

| Entry | Stream/request | Owner | Classification | State | Attempt | Repair pass | Evidence/reference | Decision/next action |
|---|---|---|---|---|---:|---:|---|---|
| {{ID}} | {{ITEM}} | {{OWNER}} | `NOW | PARK | QUESTION | NEW THREAD` | `queued | running | blocked | restarting | review | complete` | {{N}} | {{N}} | {{EVIDENCE}} | {{NEXT}} |

Only the supervisor updates this authoritative ledger. Record mid-run requests before action. ?In progress? is truthful only while the stream state is `running` and execution is active.

## Dispatch and failure rules

1. Confirm stream independence, non-overlapping edits, authority, allowlist, evidence needs, and budget before dispatch.
2. Dispatch no more than three streams, with exactly one worker assigned to each stream.
3. On timeout or failure, immediately close `running`; move to `restarting` if attempt budget remains, otherwise `blocked`.
4. Scope or authority ambiguity fails closed through the linked RA-010 control block.
5. A worker cannot change scope, ledger state, ownership, budget, or approval status.
6. Send stopped execution and observed evidence to the one independent reviewer identity in `review`.
7. Authorize only targeted repairs named in a `RETURN` verdict. After two unsuccessful passes, set `blocked`; do not add another loop or reviewer.
8. Set `complete` only after observed proof and the standard handback are present.

## Stream handback

```markdown
## Changed
{{CHANGED}}
## Verified
{{OBSERVED_CHECKS_AND_RESULTS}}
## Pending
{{PENDING_OR_NONE}}
## Recommend
{{NEXT_BOUNDED_ACTION}}
```

## Reconciliation

- **Ledger completeness check:** {{RESULT}}
- **Authorized diff/evidence check:** {{RESULT}}
- **Independent review verdict:** {{PASS_RETURN_QUARANTINE_BLOCKED}}
- **High-level planning status:** {{STATUS_ONLY}}
- **Task tracker actions updated:** {{RESULT}}
- **Owning documentation updated:** {{RESULT}}
