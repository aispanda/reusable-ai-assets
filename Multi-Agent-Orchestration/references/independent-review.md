# Independent fresh-context review

## Purpose

Reduce anchoring and self-approval by assigning evaluation to a separate agent instance with a bounded role, authoritative evidence and no execution authority.

## Independence contract

A reviewer is independent when it:

- did not implement the artifact under review;
- cannot change or approve the implementation;
- receives source requirements and observed evidence directly;
- identifies conflicts and missing evidence rather than filling gaps;
- has a separate context/session where practical;
- reports to the human decision owner or designated arbitrator.

“Fresh context” does not mean an empty or ignorant reviewer. Provide only what is needed to judge correctly:

1. quality contract or authoritative acceptance criteria;
2. artifact, diff or final state;
3. verification commands and observed results;
4. architecture/security boundaries and known risks;
5. explicit review scope, budget and stop conditions.

The implementer's explanation may be included as an attributed claim, not as evidence.

## Review flow

```text
validate inputs
 -> extract obligations and invariants
 -> inspect artifact and final-state evidence
 -> run authorized checks
 -> list evidence-linked findings by severity
 -> issue PASS / RETURN / QUARANTINE / BLOCKED
 -> human or authorized pipeline decides next action
```

## Verdicts

| Verdict | Meaning |
|---|---|
| `PASS` | All required evidence is present; no unresolved finding exceeds the accepted threshold |
| `RETURN` | Correctable defects exist; implementer receives bounded findings |
| `QUARANTINE` | Evidence conflicts, high-risk uncertainty exists, or reviewer disagreement remains |
| `BLOCKED` | Required source, tool, authority or environment is unavailable |

The reviewer never returns `APPROVED`. Approval belongs to the named human or authorized deterministic release policy.

## Anti-patterns

- Asking the implementer to “review your own work.”
- Giving a fresh reviewer no authoritative project context.
- Treating reviewer confidence as evidence.
- Requiring verbose hidden reasoning instead of concise findings and citations.
- Spawning many reviewers without a distinct risk question or budget.
- Silently merging contradictory reviewer outputs.


## Bounded delivery reviewer contract

A bounded delivery run uses one independent reviewer identity. The reviewer must not have implemented any stream, and no worker or supervisor may self-approve. Each finding identifies the stream, severity, requirement, inspected evidence, observed result, and required correction; unsupported confidence is not evidence.

The reviewer checks the authoritative requirements, final artifact/diff, stream handback, ledger state transitions, and observed verification results. It returns one evidence-linked verdict per stream and one reconciled run verdict.

When the verdict is `RETURN`, the supervisor may authorize a targeted repair against listed findings only. The same reviewer instance performs the re-check so reviewer identity remains independent and stable; a repair re-check is not a new reviewer. Each stream has at most two targeted repair passes. After the second unsuccessful pass, or whenever an unresolved high-severity finding cannot be corrected within authority or budget, the stream becomes `BLOCKED` and the reviewer returns `BLOCKED` or `QUARANTINE` as appropriate. Do not spawn another repair loop or specialist reviewer without new authorization.

Evidence-linked review cannot convert missing proof into `PASS`. Completion requires observed proof and a worker handback with exactly `Changed / Verified / Pending / Recommend` sections.
