# Lean Decision Review Cell

This is a **master reusable process asset** for reaching a high-quality decision with a small review group. It is designed for bounded work: one journey, component, workflow, policy, or implementation slice that needs a clear next decision.

> **Core idea:** The review cell is not a committee. It is three narrow checks that create one decision-ready packet for a human owner.

## The source-of-truth model

| Concern | Canonical location | What belongs there |
|---|---|---|
| Reusable review method | This asset | Role questions, templates, stop rules, escalation logic, and evaluation criteria. |
| Current work-item scope and decision | Consuming ticket | Intended outcome, actual findings, decision owner, `ACCEPT` / `AMEND` / `DEFER`, and next action. |
| Product strategy and delivery authorization | Project governance records | Priority, investment, dependencies, and authorization boundaries. |
| Production behavior and tests | Consumer repository | Component code, local tests, commands, and test outputs. |
| UI-state evidence | RA-009 and the consumer evidence location | State contracts, deterministic fixtures, catalog/test results, and evidence limits. |
| Durable human decision | Decision record | Approved choice, rationale, owner, review date, and exception. |

The ticket is the **authoritative work record**. It tells a reviewer what is true now and where proof lives. It should link to the reusable method; it should not copy the method wholesale.

## When to use this asset

Use the review cell when a work item is small enough to state one intended outcome and one next decision, but important enough that assumptions about usefulness, usability, evidence, or risk should be visible before expansion.

Do not use it as a substitute for specialist or regulated review. Escalate rather than compress legal, privacy, security, safeguarding, accessibility-conformance, financial, or release decisions into a generic review pass.

## The four responsibilities

| Responsibility | Core question | Output limit | Cannot decide |
|---|---|---|---|
| **Product-outcome reviewer** | Does the bounded work help a named person complete one meaningful outcome with a clear next step? | One recommendation, up to three risks, one success signal. | Priority, brand, release, or implementation authorization. |
| **Experience and accessibility reviewer** | Can the affected person understand hierarchy, act, recover, and use the surface with the applicable accessibility basics? | Material state and interaction gaps, plus the smallest corrective recommendation. | Product scope, policy, or launch approval. |
| **Evidence and risk reviewer** | Does each claim have proportionate proof, and are data, originality, and access boundaries explicit? | Claim-to-evidence gaps, blocked assumptions, and a go/no-go recommendation for the next review stage. | Legal, privacy, security, or release approval. |
| **Human decision owner** | Which bounded next step should be authorized? | `ACCEPT`, `AMEND`, or `DEFER`, with one reason and one review point. | Delegating final accountability to a reviewer. |

A capable person or agent may perform one supporting responsibility. Keep the logical responsibilities separate whenever the work has material risk or the same person would otherwise be reviewing their own unchallenged assumption.

## Review sequence

1. **Bound the work.** Record one intended outcome, non-goals, relevant roles, evidence available now, and the decision owner.
2. **Review outcome.** The product-outcome reviewer proposes one coherent journey or change, not a list of unrelated improvements.
3. **Review experience.** The experience and accessibility reviewer inspects only the states and interactions needed for that bounded outcome.
4. **Review evidence.** The evidence and risk reviewer states what the available material can prove, what it cannot prove, and what needs escalation.
5. **Decide.** The human decision owner records `ACCEPT`, `AMEND`, or `DEFER` in the ticket.
6. **Promote learning.** If the review reveals a repeated cross-project lesson, propose a specific update to the owning reusable asset.

## Stop rules

- Each reviewer uses the same four fields: **recommendation / evidence / risk / next action**.
- Do not expand scope while reviewing; create a separate candidate item if a new opportunity emerges.
- Reduce material disagreement to at most two decision-ready options with clear trade-offs.
- Do not claim a quality dimension beyond the evidence available.
- Do not perform external, irreversible, paid, or sensitive actions through this method without explicit approval.

## Adoption shape

```text
reusable asset library/
└─ Lean Decision Review Cell/        # canonical reusable method

project work item/
├─ scope and intended outcome         # ticket owns the work record
├─ review outputs                     # ticket or linked evidence folder
├─ evidence links                     # source artifacts remain canonical
└─ decision and next action           # ticket owns current truth
```

## Start here

1. Read [`references/role-cards.md`](references/role-cards.md).
2. Copy [`templates/REVIEW_PACKET.md`](templates/REVIEW_PACKET.md) into a bounded work item.
3. Apply only the relevant sections.
4. Use [`references/guardrails-and-escalation.md`](references/guardrails-and-escalation.md) whenever a claim, risk, or requested action exceeds the review cell’s authority.
5. Follow [`references/evaluation-cases.md`](references/evaluation-cases.md) when evaluating the method for broader reuse.
