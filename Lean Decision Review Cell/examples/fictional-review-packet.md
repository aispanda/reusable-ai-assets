# Fictional example — resource request acknowledgement

**Teaching note:** Every name, role, label, and outcome below is fictional. This example demonstrates the method; it is not a model of any specific product or organization.

## 1. Work boundary

| Field | Record |
|---|---|
| Work-item link / ID | `EXAMPLE-17` |
| Intended outcome | A participant submits one structured request and understands what happens next. |
| In scope | The request form's submitted and recoverable-error states. |
| Non-goals | Account creation, policy design, notification delivery, moderation workflow, and live integrations. |
| Affected roles | Participant and steward. |
| Decision owner | Example owner. |
| Decision needed | `ACCEPT` / `AMEND` / `DEFER` the bounded prototype test. |
| Review point | After a local interaction test and accessibility review. |

## 2. Evidence available now

| Claim or question | Evidence | What it can establish | What remains unverified |
|---|---|---|---|
| The form renders a submitted state. | Named synthetic fixture in an isolated catalog. | The real component renders the visible acknowledgement under controlled input. | Service delivery, authorization, live data, and any external message. |
| The person can correct a missing required field. | Local interaction test. | The asserted validation path works under test conditions. | Other errors, full-flow behavior, and field usability. |

## 3. Product-outcome review

**Recommendation:** Test the journey “open request form → submit one structured request → see acknowledgement and next step.”
**Evidence:** The journey has one person, one action, and one visible result.
**Risk:** The acknowledgement might imply a response commitment that is not defined.
**Next action:** State a neutral acknowledgement with no time promise.
**Success signal:** A participant can accurately explain what they submitted and the next available action.

## 4. Experience and accessibility review

**Recommendation:** Keep the acknowledgement short, place the next action after it, preserve input on recoverable error, and return focus to the error summary when validation fails.
**Evidence:** The reviewed states are initial, validation error, and submitted acknowledgement.
**Risk:** An error message without a focus change could be missed by keyboard or assistive-technology users.
**Next action:** Add a focused error summary in the local interaction test.
**Not inspected:** Small-screen layout, text scaling, forced colors, and actual service response.

## 5. Evidence and risk review

**Recommendation:** `AMEND` before testing the bounded prototype.
**Evidence:** The visible acknowledgment is supported by a synthetic fixture; the form behavior is supported by a local interaction test.
**Risk:** The word “received” could be read as a service guarantee.
**Next action:** Change the message to describe only the visible state, then re-run the local test.
**Escalation needed:** None for this fictional local example.

## 6. Human decision

| Decision | Reason | Authorized next action | Owner | Review point |
|---|---|---|---|---|
| `AMEND` | The local evidence is sufficient for a limited prototype test only after the acknowledgement language is neutral. | Revise the message and re-run the local test. | Example owner | Before any integration or external communication. |
