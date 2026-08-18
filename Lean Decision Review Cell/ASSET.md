# RA-010 — Lean Decision Review Cell

| Metadata | Value |
|---|---|
| Category | Delivery governance / quality assurance |
| Select when | A bounded work item needs a clear product-outcome, experience/accessibility, and evidence/risk review before a human authorizes the next stage. |
| Entry point | [`README.md`](README.md) |
| Status | Draft — structurally validated; three independent application evaluations pending |

## Outcome

Turn one bounded work item into a concise, decision-ready review packet without creating a large committee, duplicating source material, or delegating human accountability. The method assigns three focused review passes and one human decision owner. It produces a scoped recommendation, visible evidence limits, a small set of risks, and one explicit next decision.

## Why this is a separate asset

This asset owns the **reusable review method**: role questions, output format, review sequence, stop rules, and escalation logic. It does not own product strategy, interface design standards, code, launch gates, or a project's specific decision.

It composes with, but does not duplicate:

- **RA-005** for broader delivery discovery, decision governance, and implementation authorization;
- **RA-006** for website delivery, accessibility, and release readiness;
- **RA-009** for component-state contracts, deterministic fixtures, and proportional interface evidence.

## Reuse boundary

| Layer | What belongs here |
|---|---|
| Reusable core | The three review passes, human decision-owner role, compact review-packet template, sequencing, stop rules, escalation rule, and evaluation criteria. |
| Project-specific profile | The actual work item, intended outcome, affected roles, constraints, local evidence links, reviewer assignment, and decision. |
| Evidence | Review packet, test output, visual review, research notes, approvals, and known limitations remain with the consuming work item. |
| Excluded | Customer or production data, credentials, personal information, confidential strategy, legal conclusions, live screenshots, generated builds, dependencies, and project-specific implementation files. |

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| [`README.md`](README.md) | Adoption guide and source-of-truth map | Reusable core |
| [`templates/REVIEW_PACKET.md`](templates/REVIEW_PACKET.md) | Compact, ticket-ready review-packet template | Reusable core |
| [`references/role-cards.md`](references/role-cards.md) | Role questions, output limits, and decision boundaries | Reusable core |
| [`references/guardrails-and-escalation.md`](references/guardrails-and-escalation.md) | Scope control, evidence limits, and escalation rules | Reusable core |
| [`references/evaluation-cases.md`](references/evaluation-cases.md) | Three cross-project evaluation cases and pass criteria | Evidence / verification plan |
| [`examples/fictional-review-packet.md`](examples/fictional-review-packet.md) | Neutral worked example | Fictional example |
| [`scripts/validate_review_cell.py`](scripts/validate_review_cell.py) | Structural validator for the reusable package and packet template | Reusable core |

## Inputs and outputs

**Minimum inputs:** a work-item link or identifier, one intended outcome, scope and non-goals, affected roles, available evidence, known constraints, and a human decision owner.

**Outputs:** one review packet containing the product-outcome recommendation, experience/accessibility findings, evidence/risk findings, unresolved assumptions, an `ACCEPT` / `AMEND` / `DEFER` decision request, and links to the supporting evidence.

> **Source-of-truth rule:** The reusable asset defines how the review works. The consuming ticket is the authoritative record of what was reviewed, the actual findings, the current decision, and evidence links. Supporting repositories and evidence stores remain canonical for their own specialist artifacts.

## Use / transfer

1. Read [`README.md`](README.md), then copy [`templates/REVIEW_PACKET.md`](templates/REVIEW_PACKET.md) into the work item or its project-local evidence folder.
2. Select only applicable review passes; do not invent a review stage merely because a template has a section for it.
3. Name one decision owner who alone records `ACCEPT`, `AMEND`, or `DEFER`.
4. Keep the work-item ticket concise: scope, actual review outputs, decision, evidence links, limitations, and next action.
5. Preserve detailed test output, visual artifacts, production code, and specialist source material in their canonical locations.
6. Record an escalation instead of making legal, privacy, security, safeguarding, compliance, release, spending, deployment, or external-communication decisions through the review cell.

## Dependencies, cost and licensing

- Markdown and Python 3.11+ standard library only.
- No provider, subscription, service, or paid feature is required.
- The method does not grant permission to access data, invoke external systems, publish work, or change production systems.

## Verification

- Run `python3 scripts/validate_review_cell.py --root .` to verify the package structure and template anchors.
- Apply the method to the three representative cases in [`references/evaluation-cases.md`](references/evaluation-cases.md).
- Record observed outcomes and update the asset only after a repeated, portable learning is established.
- Run the central asset-library validator before a future commit or push.

## Boundaries and limitations

- The review cell produces a structured recommendation; it does not replace user research, usability testing, legal advice, accessibility conformance assessment, privacy/security assessment, or release approval.
- One review pass can be performed by a capable person or agent, but the roles must remain logically separate when conflicts or material risk exist.
- A visual catalog confirms only the declared rendered state. It does not by itself prove service behavior, authorization, privacy, security, live-data correctness, whole-flow behavior, or release readiness.
- No code change, configuration change, repository publication, deployment, purchase, or external communication is authorized merely by applying this asset.
