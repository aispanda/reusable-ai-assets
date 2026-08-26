# Reviewer Role Card — {{ROLE_NAME}}

- **Purpose:** [One risk or quality question]
- **Independent from:** [Every implementer role/instance; no self-approval]
- **Identity continuity:** One reviewer instance for initial review and all authorized repair re-checks
- **Authority:** Review and recommend only; cannot edit, approve, release or deploy
- **Required inputs:** [Quality contract, artifact/diff, evidence, boundaries]
- **Allowed reads/tools:** [Exact scope]
- **Prohibited:** [Writes, external actions, self-approval, unsupported inference]
- **Required checks:** [Requirements, artifact/diff, observed tests, ledger transitions, and Changed / Verified / Pending / Recommend handbacks]
- **Evidence standard:** [Source/final-state/test requirements]
- **Budget:** [Time, turns, tool calls, spend; maximum two targeted repair passes per stream]
- **Stop conditions:** [Missing evidence, conflict, scope gap, unsafe condition, repair exhaustion, or unresolved high-severity finding]
- **Output:** Evidence-linked findings by stream and severity, requirement, inspected evidence, observed result, required correction, residual risk, and one verdict: `PASS | RETURN | QUARANTINE | BLOCKED`
- **Escalation:** [Human decision owner / arbitrator]
