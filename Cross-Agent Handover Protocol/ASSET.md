# RA-010 - Cross-Agent Handover Protocol

| Metadata | Value |
|---|---|
| Category | AI workflow / governance |
| Select when | handoff, handover, cross-agent, cross-model, cross-IDE, continuity, bounded delegation |
| Entry point | `ASSET.md` |
| Status | Pilot v1.2; control-gate evaluation pending |
| Verified | 2026-08-11 package structure checked; multi-surface evaluation pending |

## Outcome

Transfer one bounded task between agents without losing context, widening authority, creating false substitutes, or wasting tokens. The receiver knows what mode it is in, what it may change, what it must not do, what evidence proves completion, and when it must stop.

## Ownership boundary

- **RA-010 owns:** the cross-agent task contract: execution mode, authorized scope, output contract, budget, receipt, stop conditions, verification and handback.
- **RA-005 owns:** project delivery stages, documentation topology and the human/CEO decision brief.
- **RA-008 owns:** runtime multi-agent topology, checkpoints, arbitration and orchestration budgets.
- **Project and API contracts own:** product facts, credentials, identity flows, schemas, endpoints and acceptance values.

RA-010 complements those owners; it does not copy or replace them.

## Reuse boundary

**Reusable core:** this protocol, the handoff template, anonymized failure pattern and evaluation cases.

**Project-specific:** every completed handoff, project paths, current state, user identities, provider configuration, data samples, budgets and approvals. These stay in the consuming project.

**Excluded:** credentials, tokens, customer data, personal machine paths, private research, dependency folders, generated output and unapproved external actions.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `ASSET.md` | Canonical protocol and ownership boundary | Reusable core |
| `templates/handoff_base.md` | Copyable bounded handoff template | Reusable core |
| `examples/receiver_overexecution_postmortem.md` | Anonymized failure and prevention pattern | Evidence |
| `evaluations/handoff_evaluation_cases.md` | Three representative acceptance cases | Verification |

## Execution modes

Every handoff declares exactly one mode. If mode or approval is absent or contradictory, default to `REVIEW_ONLY`.

| Mode | Receiver may do | Receiver must not do |
|---|---|---|
| `REVIEW_ONLY` | Inspect supplied evidence and report findings | Write files, run mutating commands, install dependencies or change external state |
| `PLAN_ONLY` | Produce only the named plan artifact | Implement, edit configuration/code/status docs, install dependencies or claim readiness |
| `IMPLEMENT_BOUNDED` | Change only the authorized paths/actions and run named verification | Expand scope, use new agents/services, commit, deploy or change external state unless separately authorized |
| `VERIFY_ONLY` | Run the named read-only checks and report observed results | Repair failures, rewrite files or convert an unknown state into a pass |

Changing mode requires a new explicit approval or a versioned delta. Permission to plan never implies permission to implement.

## Authoritative control block

Only this block grants execution authority. Purpose, narrative, desired outcomes, examples, acceptance criteria and the output contract do not grant permission.

Each handoff must declare:

| Field | Required value |
|---|---|
| Handoff ID/version | Immutable identifier and revision |
| Execution mode | One mode from the table above |
| Execution authorization | `NOT_GRANTED` initially; bounded implementation requires exact later authorization |
| Allowed reads/writes | Exact paths or resources; use `none` |
| Allowed commands | Exact commands or bounded categories |
| External side effects | Exact permitted actions or `none` |
| Delegation/parallelism | `forbidden` unless an explicit limit is stated |
| Security-sensitive | `yes` or `no`, plus protected boundary |
| Mock/stub/fallback policy | `forbidden` unless an exact test-only use is approved |
| Budget | Tool/command calls, parallel workers, time and paid spend when observable |
| Required verification | Exact checks and evidence |
| Rollback | Scoped reversal that preserves pre-existing work |
| Status-document authority | Exact files allowed to change or `none` |
| Stop conditions | Conflicts, missing prerequisites, insufficient budget, failed checks or scope gaps |

If this block is missing, unrecognized or conflicts with another section, apply the most restrictive interpretation and remain in `REVIEW_ONLY`.

## Non-negotiable controls

1. **Authority envelope:** list allowed reads, writes, commands, external systems and explicitly forbidden actions. Edit permission is distinct from commit, push, deploy, spend, credential access and communication authority.
2. **Fail-closed prerequisites:** if a required identity, credential reference, dependency, endpoint, decision or acceptance value is missing, report `BLOCKED` and stop. Never fabricate it.
3. **No false substitutes:** mock, stub, synthetic success, hard-coded identity, relaxed validation or placeholder-as-ready behavior requires explicit authorization and must be visibly labelled. It cannot count as live proof.
4. **Budget envelope:** state relevant limits for turns, time, tool calls, parallel agents, paid spend and verification. If omitted, use no paid services, no additional agents and no material scope expansion.
5. **Receiver receipt:** before consequential execution, restate handoff ID/version, mode, output, allowed writes, forbidden actions, budget and blockers. If they conflict, stop rather than choosing the broader interpretation.
6. **Evidence before status:** `implemented`, `verified`, `ready`, `connected`, `sent`, `deployed` and similar claims require the named acceptance proof. Otherwise use `proposed`, `prepared`, `partial`, `blocked` or `not verified`.
7. **Preserve existing work:** inspect repository or file state before edits. When Git is unavailable, record an explicit before/after file manifest. Do not overwrite unrelated or unreviewed changes.
8. **One output, then stop:** produce only the contracted output and concise handback. Use a delta for later changes; do not replay the whole handoff.

## Confirmation gate

For `REVIEW_ONLY`, `PLAN_ONLY` and `VERIFY_ONLY`, the receiver may perform only the declared non-mutating or single-artifact task, then stop.

For `IMPLEMENT_BOUNDED`, the receiver first returns `RECEIPT {handoff-id}@{version}` and stops. Execution starts only after the human decision owner replies `AUTHORIZE {handoff-id}@{version}` and the write/action allowlist is complete. Approval for another version, silence, previous discussion or an output contract is not authorization. Security, identity, external-state, destructive, paid or customer-facing work also requires the applicable human approval even if an agent recommends proceeding.

## Evidence-based status

| Status | Meaning |
|---|---|
| `PLANNED` | A plan exists; implementation is not implied |
| `CHANGED_UNVERIFIED` | Authorized changes exist, but required checks have not all passed |
| `VERIFIED` | Every required check ran and passed with recorded evidence |
| `BLOCKED` | A stop condition occurred; no safety-reducing workaround was used |
| `ROLLED_BACK` | Only the receiver's scoped changes were reversed and the prior baseline was preserved |

Do not mark work done, ready or implemented in an owning status document unless that file is an allowed write and all required checks passed.

## Baseline and rollback gate

Before mutation, record the repository/workspace baseline and distinguish pre-existing changes. Stop if an allowed file contains overlapping unowned changes. Roll back only the receiver's scoped changes using the declared method; never use a destructive workspace reset. If the remaining budget cannot cover required verification and rollback, do not begin implementation.

## Inputs and outputs

**Minimum inputs:**

1. Outcome and execution mode.
2. Canonical source map and observed current state.
3. Authority envelope and approval state.
4. Output contract and acceptance proof.
5. Budget, stop conditions, rollback and handback destination.

**Outputs:**

1. One project-owned handoff or dated delta.
2. Receiver receipt when required.
3. Concise handback: outcome, files/actions, actual verification, unverified items, stop reason and next authority needed.

Use `templates/handoff_base.md`; do not reconstruct the contract from chat history.

## Use / transfer

1. Read the consumer's router, current verified state and owning plan.
2. Copy the template into the consumer project and complete every required field; use `n/a`, not omission.
3. Choose the narrowest execution mode that can achieve the outcome.
4. Resolve contradictions before execution and obtain the required approval.
5. Receiver issues the compact receipt, performs only the authorized work, verifies, and stops.
6. Record durable decisions in their owning project documents; the handoff is not a second source of truth.

## Related Implementations

| Asset | Connection | Pattern |
|---|---|---|
| RA-013: Agent Linear API Integration | Demonstrates cross-agent credential delegation and handover when Spark needs bounded Linear API access; uses GSM for credential gating and escalation rules for authority boundaries | `IMPLEMENT_BOUNDED` mode with explicit credential refresh and audit logging |

## Dependencies, cost and licensing

- **Dependencies:** none; plain Markdown.
- **Recurring cost:** zero for the protocol. Each handoff declares its execution budget.
- **Licensing:** MIT.

## Verification

Before promotion from Pilot, the package must pass the three cases in `evaluations/handoff_evaluation_cases.md` on SOL plus one other capable surface:

- plan-only work produces one plan and no implementation;
- blocked security/integration work refuses mock success and remains fail-closed;
- bounded implementation touches only authorized paths and claims completion only after observed proof.

The package-structure and boundary checks are complete. Multi-surface behavioral evaluation remains pending. Promotion to `Reusable v1.2` requires recorded before/after manifests, command counts and truthful status claims for all cases.

## Boundaries and limitations

- Human-mediated handoff, not a live orchestration engine.
- Does not replace project governance, API contracts, authentication design or source control.
- Does not carry credentials or grant authority; it records references and gates only.
- A receiver can still ignore instructions. Consequential work therefore needs independent review and deterministic verification.
