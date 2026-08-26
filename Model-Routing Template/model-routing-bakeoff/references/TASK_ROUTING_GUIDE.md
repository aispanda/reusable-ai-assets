# Task routing guide (method)

Fill the project copy of `MODEL_ROUTING_TEMPLATE.md`. This page is the quick map agents should apply before spending.

## Fast rule

Use the cheapest model already proven adequate **for the project's accepted priority mix**. Escalate on risk, ambiguity, or failure. Cross-review consequential outputs with a different family when stakes are high. Bake-offs stay neutral (metrics + perspective map); defaults are a human ACCEPT.

## Typical task classes

| Task class | Prefer first | Fallback | Escalate when |
|---|---|---|---|
| Specialist MT (e.g. GU→EN slices) | Proven NMT API after preflight | LLM-MT or multilingual LLM on source | Completeness fail, critical errors, ops outage |
| EN-only tags/summary after good MT | Cheap/local EN | Stronger EN | Schema/omission failures |
| Dual-LLM judge | Independent mid/strong model | Second family | Generator keeps failing gates |
| Bounded routine coding/docs | Cheap capable model | Mid | Tests fail |
| High-risk legal/safety prose | Strong + human gate | Second family review | Any critical defect |

## Specialist MT vs LLM MT

- Prefer **slice MT → EN downstream** over full-transcript MT for long media.
- Completeness beats occasional brilliance: a system that finishes all slices with acceptable faithfulness often wins the pipeline default.
- Treat VPN/DNS/quota as **ops gates** in preflight, not as bake-off quality scores.

## Refresh triggers

- Provider outage or DNS/VPN class failure
- Price or model retirement change
- Repeated critical errors in production logs
- New candidate that might undercut cost at equal gates

## Handback (what to report to a human)

Routes changed · evidence path · cost/quality impact · unresolved ops risk · exact decision needed (`ACCEPT` / `AMEND` / `DEFER`).
