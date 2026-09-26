# Guardrails and escalation

## What the review cell can do

The review cell can structure a bounded recommendation. It can make assumptions visible, inspect available evidence, identify gaps, and prepare one human decision.

It does **not** authorize code changes, deployments, publication, spending, data access, access-control changes, external communication, contractual action, or a production release.

## Evidence language

Use the smallest accurate claim for the evidence available.

| Evidence available | It may support | It does not independently support |
|---|---|---|
| Static component catalog | A real component renders under named deterministic inputs. | Live data behavior, authorization, privacy, security, full-flow behavior, or release readiness. |
| Interaction test | A local interaction follows the asserted behavior under test conditions. | Whole-system behavior, real-world performance, or policy compliance. |
| Accessibility scan | Detection of some automatable issues. | Full accessibility conformance or usability for all people and assistive technologies. |
| Visual review | Identification of visible difference or apparent hierarchy issue. | Correctness of hidden behavior, access, data integrity, or legal suitability. |
| Whole-flow test | A specified cross-surface path works in the tested environment. | All edge cases, field reliability, security, privacy, or approval for release. |
| Human decision | An owner accepted the stated next step. | Evidence that the next step will succeed. |

## Scope-control rules

1. State one intended outcome and one next decision before assigning review roles.
2. Treat an unrelated observation as a future candidate, not an addition to the active review.
3. State non-goals explicitly whenever the topic could be mistaken for a broader program.
4. Require a concrete evidence link or an explicit `unverified` label for every material assertion.
5. Keep reviewer outputs to the review-packet template; do not create an unbounded discussion transcript.

## Escalation triggers

Stop and request the appropriate specialist or human decision when the work introduces or changes any of the following:

| Trigger | Required response |
|---|---|
| Personal, confidential, or production data | Confirm data minimization and authorized handling before review continues. |
| Access control, identity, or permission model | Request security and authorization review. |
| Legal, regulatory, contractual, or intellectual-property question | Record the question and obtain appropriate specialist advice. |
| Safety-sensitive, safeguarding, or vulnerable-person impact | Pause and obtain specialist review. |
| Financial commitment, payment, procurement, or paid-service activation | Obtain explicit human authorization. |
| Public communication, publishing, or deployment | Obtain explicit human authorization and follow the relevant release process. |
| Material disagreement between reviewers | Present at most two decision-ready options with trade-offs to the human decision owner. |

## Originality and data boundary

Write original summaries and role outputs. Do not copy expressive language, private work, personal details, credentials, or live records into a reusable review packet. Use fictional or synthetic examples when an example is necessary for teaching or validation.
