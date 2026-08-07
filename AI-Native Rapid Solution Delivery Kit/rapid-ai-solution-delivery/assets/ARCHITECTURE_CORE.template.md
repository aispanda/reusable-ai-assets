# {{PROJECT_NAME}} — Architecture Core

## Scope and qualities

[First-slice boundary and material reliability, security, cost, performance, and portability needs.]

## System and data flow

```mermaid
flowchart LR
  U["User or source"] --> I["Input boundary"] --> C["Core workflow"] --> S["Authoritative state"] --> O["Visible outcome"]
```

## Components and ownership

| Component | Responsibility | Interface | Authoritative data | Failure behavior |
|---|---|---|---|---|
| [Component] | [One responsibility] | [API/event/file] | [Data/None] | [Visible recovery] |

## Accepted decisions

- [Decision ID and architectural consequence]
