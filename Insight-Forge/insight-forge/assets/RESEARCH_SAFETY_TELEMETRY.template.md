# {{TOPIC}} — Research Safety and Telemetry Record

**Status:** Proposed
**Decision owner:** {{OWNER}}
**Review date:** YYYY-MM-DD

## Corpus decision

| Corpus / source set | Class | Model use | Minimum permitted content | Retention / access | Owner decision |
|---|---|---|---|---|---|
| [Source set] | Public / approved de-identified / approved private / prohibited | Allowed / claim-ID only / blocked | [...] | [...] | [...] |

## Data handling

- Direct identifiers, credentials and access tokens: [Removed / not present / blocked]
- PII minimisation and masking method: [...]
- Private evidence boundary: [Project-approved location; excluded from public and reusable artifacts]
- Raw prompt and excerpt logging: [Disabled / approved exception with owner and expiry]

## Prompt-injection and tool safety

- Untrusted inputs: [Sources, retrieval, user text, tool results]
- Instruction boundary: [System instructions and policy remain outside untrusted content]
- Model authority: [Read-only research / no tool calls / other bounded mode]
- External actions: [Blocked unless deterministic validation plus explicit human approval]
- Adversarial cases and pass criteria: [Direct override / hostile source text / exfiltration request / unsafe tool request]

## Minimum telemetry

| Field | Purpose | Sensitive payload allowed? |
|---|---|---|
| Claim ID / source class | Trace research coverage without raw content | No |
| Model route and version | Reproduce quality/cost comparison | No |
| Latency and token/tool usage | Operations and cost control | No |
| Outcome / error category | Diagnose failures and improve the process | No |

## Approval

`PROPOSED | ACCEPTED | REJECTED | EXPIRED`

Evidence links: [Project-owned tests, scan results, or review]
