# Role cards

Use these cards as **responsibilities**, not job titles. Assign only the cards needed for the bounded work item. A card's output must use the review-packet fields: recommendation, evidence, risk, and next action.

## 1. Product-outcome reviewer

**Use when:** a proposed change, journey, workflow, or component needs a clear reason to exist.

**Question:** Does this bounded work help a named person complete one meaningful outcome with a clear next step?

| Check | Expected answer |
|---|---|
| Person | Who is affected, described without personal data? |
| Outcome | What can that person understand, do, or decide after the change? |
| First action | What is the smallest meaningful action? |
| Visible result | What changes visibly after the action? |
| Recovery | What can the person do if they cannot proceed? |
| Success signal | What observable signal would justify learning more? |

**Output limit:** one recommended journey or change, at most three material risks, and one success signal.

**Boundary:** Do not decide priority, brand, access policy, release, or implementation authorization.

## 2. Experience and accessibility reviewer

**Use when:** a person will encounter an interface, content hierarchy, interaction, decision prompt, or recovery state.

**Question:** Can the affected person understand hierarchy, act, recover, and use the surface with the applicable accessibility basics?

| Check | Expected answer |
|---|---|
| Hierarchy | Is the purpose and primary action understandable without guesswork? |
| State | Which entry, populated, empty, error, restricted, pending, or resolved states materially change the experience? |
| Interaction | What happens on keyboard, focus, selection, submission, and retry where applicable? |
| Recovery | Is the next safe action visible when a person is blocked or receives an error? |
| Accessibility basics | Are semantic structure, visible focus, readable contrast, text scaling, and reduced-motion implications considered where applicable? |
| Scope discipline | Which concerns are deliberately outside this slice? |

**Output limit:** material gaps and the smallest corrective recommendation. State what was not inspected.

**Boundary:** Do not make a product-policy decision, assert full accessibility conformance, or approve release readiness.

## 3. Evidence and risk reviewer

**Use when:** the work item makes a claim about quality, behavior, safety, access, data, or readiness.

**Question:** Does each claim have proportionate proof, and are data, originality, and access boundaries explicit?

| Check | Expected answer |
|---|---|
| Claim | What exactly is being claimed? |
| Evidence | Which command, review, fixture, test, source, or approval supports it? |
| Limit | What does the evidence not establish? |
| Data | Is the reviewed material synthetic, minimized, authorized, and appropriate for the context? |
| Originality | Is the wording, structure, and material original or appropriately licensed? |
| Access | Which roles can see, act, or remain restricted? |
| Escalation | Does a legal, privacy, security, safeguarding, compliance, or release question require specialist review? |

**Output limit:** claim-to-evidence gaps, blocked assumptions, and a recommendation for the next review stage.

**Boundary:** Do not make legal, privacy, security, compliance, or release approvals.

## 4. Human decision owner

**Use always.** One named human owns the final decision.

**Question:** Is the bounded next step justified by the available evidence and risk posture?

Record exactly one of the following in the consuming ticket:

| Decision | Meaning |
|---|---|
| `ACCEPT` | The bounded next step is authorized as written. |
| `AMEND` | The outcome is useful, but the scope, evidence, risk boundary, or next action needs a stated change. |
| `DEFER` | The decision should wait because a prerequisite, owner, evidence source, or policy choice is missing. |

The decision owner records one reason, one next action, and a review point when work remains open.
