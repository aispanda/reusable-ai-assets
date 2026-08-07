# {{PROJECT_NAME}} — Logical Data Model

Model only the current release. Keep logical meaning independent of a physical database until the relevant technology decision is accepted.

| Entity | One record represents | Key attributes | Relationships | Release |
|---|---|---|---|---|
| [Entity] | [Business meaning] | [Identifiers and material fields] | [Cardinality and purpose] | First slice |

## Rules

- Mandatory and optional attributes are explicit.
- Every relationship has cardinality and lifecycle meaning.
- Sensitive data, retention, tenancy, audit, and system-of-record ownership are stated when relevant.
