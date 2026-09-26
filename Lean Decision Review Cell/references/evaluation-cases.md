# Evaluation cases

RA-010 remains **Draft** until the review method is applied and inspected in each of these genuinely different contexts. Each case may use a capable person or agent for the supporting review passes, but a human decision owner must record the final decision.

## Pass criteria for every case

1. The work item states one intended outcome, non-goals, evidence available, and a decision owner.
2. Review outputs use recommendation, evidence, risk, and next action.
3. Each material claim links to evidence or says `unverified`.
4. The ticket records one `ACCEPT`, `AMEND`, or `DEFER` decision and links to the canonical supporting artifacts.
5. No reviewer claims legal, privacy, security, accessibility-conformance, or release approval without the appropriate independent evidence and authority.
6. The method yields a clear decision without duplicating the reusable method into the ticket.

## Case 1 — Interface state

**Situation:** A real component needs an empty-first-use, populated, and recoverable-error state review before expansion.

**Expected learning:** The review cell must compose with RA-009 rather than reimplement state contracts or fixture validation.

**Inspect:** State boundaries, accessible recovery, synthetic fixture evidence, and limits of catalog/test proof.

## Case 2 — Delivery workflow

**Situation:** A project needs a one-step proposal-to-decision workflow that creates a durable record without triggering implementation.

**Expected learning:** The review cell must keep product outcome and decision governance distinct, and it must identify when a decision record is required.

**Inspect:** Outcome clarity, decision owner, scope boundary, evidence links, and escalation of policy questions.

## Case 3 — Data-sensitive change

**Situation:** A proposed improvement would handle personal or otherwise sensitive information.

**Expected learning:** The review cell must stop at the correct boundary, name the data/access concern, and request the appropriate specialist review rather than generating a false go-ahead.

**Inspect:** Data minimization, authorization boundary, unverified claims, escalation quality, and an explicit `DEFER` where evidence is insufficient.

## Promotion rule

After all three cases pass, review the outputs for repeated failure patterns, strengthen the relevant template or reference, rerun the structural validator, and decide whether to promote RA-010 from Draft. Do not promote it solely because the template exists or because one project used it successfully.
