# Coordination log - {bounded outcome}

| Field | Value |
|---|---|
| Handoff ID/version | {immutable-id}@{version} |
| Decision owner | {human or owning role} |
| Journal owner | {single agent or role allowed to edit this file} |
| Writable channel | {task/thread messaging interface or human relay} |
| Participants | {address -> responsibility} |
| Owning issue/repository | {canonical source of status and implementation} |
| Last reconciled | {UTC timestamp and evidence revision} |

> This journal records durable coordination deltas. It does not grant authority and does not replace the owning issue, repository, test evidence or deployment record. Shared chat links are read-only context unless a writable interface is explicitly available.

## File ownership

| Path or resource | Current writer | Other participants may |
|---|---|---|
| {path} | {one owner} | read / send proposal / none |

## Question queue

Keep no more than three open questions per receiver. Use `OPEN`, `ACKNOWLEDGED`, `ANSWERED`, `BLOCKED` or `CLOSED`.

| ID | Status | From -> to | Question | Needed for | Answer/evidence | Next owner/action |
|---|---|---|---|---|---|---|
| Q-001 | OPEN | {sender} -> {receiver} | {one bounded question} | {decision/task} | Pending | {owner/action} |

## Decisions

| ID | Date | Decision | Evidence | Owner | Supersedes |
|---|---|---|---|---|---|
| D-001 | {UTC date} | {decision} | {link/path/result} | {owner} | none |

## Status deltas

| ID | Date | Observed change | Evidence | Impact / next action |
|---|---|---|---|---|
| S-001 | {UTC date} | {new fact, blocker or ownership change} | {link/path/result} | {bounded effect} |

## Closeout

- **Open questions:** {IDs or none}
- **Verified outcome:** {evidence-backed state}
- **Unverified:** {remaining uncertainty or none}
- **Next owner/action:** {one bounded action or none}
