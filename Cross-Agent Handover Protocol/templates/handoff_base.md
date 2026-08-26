# Handoff - {bounded outcome}

| Field | Value |
|---|---|
| From | {sender} |
| To | {receiver} |
| Date | {date} |
| Handoff ID/version | {immutable-id}@{version} |
| Execution mode | REVIEW_ONLY / PLAN_ONLY / IMPLEMENT_BOUNDED / VERIFY_ONLY |
| Execution authorization | NOT_GRANTED initially |
| Decision owner | {human or owning role} |
| Handback destination | {project-owned file or channel} |

> If execution mode or approval is missing or contradictory, default to `REVIEW_ONLY` and report the conflict.

## 1. Outcome

{One observable result.}

## 2. Canonical source map

| Source | Owns | Required read |
|---|---|---|
| {relative path or resource} | {fact or contract it owns} | yes/no |

Do not paste durable facts already owned elsewhere.

## 3. Observed current state

- **Verified state:** {facts inspected directly}
- **Unverified claims:** {claims requiring inspection}
- **Existing changes:** {dirty files, untracked work or n/a}
- **Known blockers:** {blockers or n/a}

## 4. Authority envelope

- **Allowed reads:** {paths/resources}
- **Allowed writes:** {exact paths, or none}
- **Allowed commands/tools:** {exact classes of action}
- **Allowed external systems:** {system plus read/write boundary, or none}
- **External side effects:** {exact permitted actions or none}
- **Delegation/parallelism:** {forbidden or explicit limit}
- **Security-sensitive:** {yes/no and protected boundary}
- **Forbidden:** {commit, push, deploy, send, purchase, credential access, deletion, etc.}
- **Mock/stub policy:** forbidden unless explicitly authorized and visibly labelled
- **Status-document authority:** {exact files or none}

Permission to plan does not authorize implementation. Permission to edit does not authorize commit, push, deployment, spending, credential access or communication.

## 5. Output contract (not execution authority)

- **Produce:** {one artifact or bounded implementation}
- **Location/format:** {exact project-owned destination}
- **Do not produce:** {parallel plans, duplicate owners, unrequested code/config/docs}
- **Completion language:** {proposed / prepared / implemented / verified}

## 6. Budget envelope

- **Turns/time/tool calls:** {limits or n/a}
- **Parallel agents:** {number or none}
- **Paid spend:** {amount or zero}
- **Verification:** {named checks and maximum repetitions}
- **Expansion rule:** stop and request approval before material expansion

## 7. Acceptance proof

| Requirement | Proof | Pass condition |
|---|---|---|
| {requirement} | {test, inspection or evidence} | {observable condition} |

No acceptance proof means no `implemented`, `verified`, `ready`, `connected`, `sent` or `deployed` claim.

## 8. Stop conditions and rollback

- **Stop if:** {missing authority, identity, dependency, endpoint, decision, evidence or budget}
- **On stop:** report `BLOCKED`; do not fabricate a value or create mock success
- **Rollback:** {reversible steps within authority, or human-owned rollback}

## 9. Receiver receipt

Before consequential execution, reply with only:

```text
RECEIPT {handoff-id}@{version}
MODE:
OUTPUT:
ALLOWED WRITES/ACTIONS:
FORBIDDEN:
BUDGET:
BLOCKERS/CONFLICTS:
REQUIRED VERIFICATION:
READY TO PROCEED: yes/no
EXECUTION APPROVAL REQUIRED: yes/no
```

If any line conflicts with this handoff, stop for clarification. For `IMPLEMENT_BOUNDED`, stop after the receipt and wait for `AUTHORIZE {handoff-id}@{version}` from the decision owner.

## 10. Handback

- **Outcome:** {completed / partial / blocked}
- **Files/actions:** {exact scope}
- **Verification actually run:** {results, not intended commands}
- **Not verified:** {remaining uncertainty}
- **Next action and authority:** {one bounded next step}
