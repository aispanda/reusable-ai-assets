# UI Context Packet — `<stable-id>: <plain-language outcome>`

> Use this packet for one bounded surface. It is a routing document, not a duplicate design system or feature specification. Link to the canonical local sources instead of copying them.

## Concept in plain language

Explain the user-visible problem, the intended outcome, and why this surface matters in two short paragraphs. State what a learner should understand after reading the packet.

## Scope and non-goals

| In scope | Explicitly out of scope |
|---|---|
| `<real production component or route>` | `<nearby capability, release, integration, or redesign>` |

## Outcome and evidence

| Item | Record |
|---|---|
| User / role | `<role described by allowed capability, not personal identity>` |
| Situation / trigger | `<what causes the surface to appear>` |
| Observable outcome | `<what the person can understand or do>` |
| Success signal | `<observable, proportionate measure>` |
| Guardrail | `<safety, privacy, accessibility, performance, or quality limit>` |
| Owner / review point | `<role and review trigger>` |

## Canonical references

| Concern | Exact local source | Use it for |
|---|---|---|
| Production implementation | `<path>` | Component API and rendered behavior |
| Local styles / theme | `<path>` | Visual roles and environment behavior |
| Fixture source | `<path>` | Deterministic inputs only |
| Existing test / catalog adapter | `<path or URL>` | Existing quality evidence |
| State contract | `<path>` | Material states and recovery |
| Execution record | `<link>` | Scope, dependency, status, acceptance evidence |
| Decision record | `<link>` | Approved exception or unresolved choice |

## Role and access boundary

| Capability | Allowed role/state | Restricted role/state | Visible explanation or next action |
|---|---|---|---|
| `<action>` | `<capability>` | `<capability>` | `<clear, non-revealing message>` |

## State selection

List only states that materially change understanding, action, recovery, safety, or available content. Link the complete details in the state contract.

| State ID | Why it is material | Fixture key | Evidence required |
|---|---|---|---|
| `<surface>-initial` | `<reason>` | `<fixture>` | `<render / interaction / review>` |

## Acceptance evidence

| Claim | Minimum evidence | Local command or review | Result location |
|---|---|---|---|
| Renders real component with stable inputs | Render or component test | `<command>` | `<path/link>` |
| Critical action and recovery are clear | Interaction evidence | `<command/review>` | `<path/link>` |
| Applicable detectable accessibility checks have no new issue | Automated scan plus manual critical-path check | `<command/review>` | `<path/link>` |
| Intended visual change is reviewed | Stable visual evidence | `<command/review>` | `<path/link>` |

## Risks, assumptions, and decisions

| Type | Item | Owner / next action |
|---|---|---|
| Assumption | `<must be validated locally>` | `<role>` |
| Decision | `<requires explicit answer before release>` | `<link>` |
| Limitation | `<what the declared evidence does not prove>` | `<review boundary>` |

## Learning check

A reviewer should be able to answer: **What is the user outcome; what must be reused; which states matter; what does each role see; how can a person recover; and what evidence proves the declared claim?**
