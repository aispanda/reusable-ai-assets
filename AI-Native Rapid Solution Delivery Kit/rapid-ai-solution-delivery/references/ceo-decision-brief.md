# CEO Decision Brief

Use this brief whenever a stakeholder must decide scope, business risk, external impact, spend, release, or policy. It is the human-facing translation layer for agent and delivery-team work. Keep technical detail in linked evidence rather than making the decision owner reconstruct it.

## Required brief

```markdown
# Decision brief — {plain-English title}

**Decision needed:** {one question; answerable with ACCEPT, AMEND: ..., or DEFER}
**Why now:** {business or user consequence of waiting}
**Recommended option:** {one sentence}
**Expected value:** {who benefits and how}

## Evidence
- {test, observation, source, screenshot or measured result}
- {link to the owning artifact; label OBSERVED, INFERRED or ASSUMED}

## Options
| Option | Benefit | Time/cost | Risk | Reversible? |
|---|---|---|---|---|
| A | ... | ... | ... | yes/no |
| B | ... | ... | ... | yes/no |

## Approval boundary
- **This approval authorizes:** {exact actions}
- **It does not authorize:** {send, deploy, purchase, data access, or other excluded actions}
- **Acceptance proof:** {observable tests or outcome}
- **Rollback:** {how to undo or stop safely}

## Uncertainties and stop rule
- **Unknowns:** {what is not yet verified}
- **Stop if:** {evidence, authority, safety, budget or approval is missing}

**CEO decision:** ACCEPT / AMEND: ... / DEFER
**Decision owner:** {person}
**Decision date:** {date}
```

## Communication rules

- Lead with the decision and business consequence; put implementation language after it.
- Give no more than three options and recommend one.
- Separate observed evidence, inference and assumption.
- State the exact boundary of approval. Silence is not approval.
- If evidence, authority, safety, budget or approval is missing, report `BLOCKED` and stop; do not convert uncertainty into a default decision.
- Record the decision in the owning project document. The brief is a decision interface, not a second source of product truth.

## Delivery states

`PROPOSED → EVIDENCE NEEDED → READY FOR APPROVAL → APPROVED → IMPLEMENTED → VERIFIED`

Use `BLOCKED`, `REJECTED` or `ROLLED BACK` when applicable. A state change requires the evidence or human disposition that justifies it.

## Boundary

This is a vendor-neutral communication and approval pattern. It does not authorize application code, deployment, spending, external communication, production mutation or autonomous changes to its own governance. Project facts, actors, credentials, customer data, paths and decisions stay in the consuming project.
