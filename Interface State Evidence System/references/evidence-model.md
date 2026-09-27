# Evidence model

## Purpose

Choose evidence that matches the claim. The goal is neither maximal testing nor a persuasive-looking artifact; it is a reliable, proportional record of what was actually checked and what remains outside the evidence boundary.

## Claim-to-evidence matrix

| Claim | Suitable evidence | What it can establish | What it cannot establish by itself |
|---|---|---|---|
| A declared state renders | Production-backed fixture and render result | The real component rendered with stable inputs | Full flow, data integrity, access enforcement, field performance |
| A local control produces an expected result | Interaction test or controlled manual procedure | Local behavior, visible result, focus, and declared recovery | Cross-service behavior, real authorization, transaction safety |
| Common detectable accessibility concerns are absent | Automated accessibility scan plus critical-path manual review | Detected violations and selected keyboard/focus behavior | Full conformance, assistive-technology coverage, legal compliance |
| Appearance did not change unexpectedly | Stable visual comparison and reviewer disposition | Difference from an approved baseline in the tested environment | Correct behavior, intentionality, all devices, all data states |
| A full journey works | Whole-flow test against a controlled environment | End-to-end behavior in the declared environment | Production reliability, field performance, all permissions and failures |
| A release is safe | Approved release gate with relevant operational evidence | The documented gate was satisfied | Absolute safety, all legal duties, future reliability |

## Evidence hierarchy

Prefer evidence closest to the claimed behavior. A local component claim starts with a production-backed fixture. A whole-flow claim requires a controlled end-to-end run. A release claim requires the project’s release gates. Do not make a downstream claim from upstream evidence alone.

| Evidence level | Typical artifact | Use when | Review question |
|---|---|---|---|
| E1 — Contract | Context packet and state contract | Before implementation | Is the intended behavior unambiguous and bounded? |
| E2 — Render | Named fixture or story | One state must render repeatably | Is the right real component visible with stable inputs? |
| E3 — Interaction | Component test or controlled manual step | A local action changes state | Does the action, focus, status, and recovery match the contract? |
| E4 — Quality signal | Accessibility scan, visual comparison, responsive review | A quality characteristic is relevant | What was checked, in what environment, and what are its limits? |
| E5 — Whole-flow | Controlled integration or end-to-end test | Behavior crosses components or services | Does the declared journey work under the specified conditions? |
| E6 — Release | Project release checklist and approval | External impact is possible | Is the release bounded, observable, reversible, and approved? |

## Evidence record minimum

Every evidence record should include the surface ID, code or configuration revision, fixture ID, environment or viewport where relevant, command or procedure, result, reviewer if manual, known limitation, and link to the execution record. Avoid screenshots without fixture IDs, dates, or review disposition.

## Honest language examples

| Prefer | Avoid |
|---|---|
| “The populated fixture rendered the production component in the declared local environment.” | “The feature is proven.” |
| “The controlled keyboard path completed for the listed controls.” | “The interface is fully accessible.” |
| “The approved visual baseline did not show an unintended difference for the tested states.” | “The design is correct everywhere.” |
| “This check does not validate real authorization or data integrity.” | Leaving the evidence boundary unstated |
