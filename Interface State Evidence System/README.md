# Interface State Evidence System

This package is a **master reusable asset** for turning a critical interface surface into a compact, verifiable contract. It is intentionally tool-neutral: a project may use a component catalog, a protected development route, or another compatible renderer, but the production component and deterministic fixture remain the source of truth.

> **Core idea:** A state is not “covered” because someone described it or took a screenshot. It is covered when a named, repeatable fixture renders the real component, exposes the expected outcome and recovery, and is linked to the appropriate evidence.

## The source-of-truth model

| Concern | Canonical location | What belongs there |
|---|---|---|
| Reusable method | This package | Vocabulary, templates, validation, guardrails, generic examples |
| Product behavior | Consuming repository | Production component, data boundary, local style, fixtures, tests |
| Feature scope and exception | Execution record | Outcome, scope, decision, dependency, acceptance evidence |
| Durable decision | Decision record | Approved choice, rationale, owner, review point |
| Build and release proof | Consumer evidence | Command output, visual review, test report, known limitation |

## Start small

Start with **one bounded journey**, not a broad visual overhaul. A good first slice makes an arrival, a meaningful first action, a visible outcome, a recovery path, and an access boundary explicit. The scope is ready when a reviewer can name the user, trigger, state, visible result, available action, recovery, and evidence without guessing.

| Step | Do | Output | Do not do |
|---|---|---|---|
| 1. Inspect | Find the real component, shared styles, existing tests, and affected route | Exact local paths and constraints | Invent a parallel component model |
| 2. Bound | State one outcome, non-goals, roles, and risk | Context packet | Treat every screen as the first pilot |
| 3. Contract | List only applicable states and their recovery | State contract | Use a generic checklist as proof |
| 4. Fixture | Make state inputs deterministic and production-backed | Named fixtures | Use live accounts or variable production data |
| 5. Verify | Run the narrowest relevant checks, then required project gates | Evidence record | Claim all quality dimensions from one visual check |
| 6. Promote | Generalize only a repeated, verified pattern | Candidate asset upgrade | Move working project code into the library first |

## State selection rule

A state is material when it changes what a person can understand, do, recover from, or safely decide. Begin from the following prompts, then select only what applies.

| Dimension | Typical states | Required contract detail |
|---|---|---|
| Entry and data | initial, loading, populated, empty-first-use, no-results, partial, stale | Trigger, visible hierarchy, next action |
| Constraint and failure | restricted, validation error, recoverable error, terminal error, offline, expired | Explanation, preserved input, safe recovery |
| Interaction | default, hover, focus-visible, active, selected, expanded, disabled | Keyboard action, focus result, accessible status |
| Environment | compact/wide, long content, text scaling, theme, reduced motion, forced colors | Transformation, information preservation, test boundary |
| Lifecycle | success, pending review, resolved, archived | Ownership, durable record, follow-up route |

## Evidence model

Use the **smallest evidence that proves the declared claim**. A story or isolated renderer proves component rendering and declared behavior. A component test can prove local interaction. An automated accessibility scan can identify common detectable issues. A visual comparison can flag unintended visual change. A whole-flow test is still required for cross-surface behavior. None of these individually establishes legal, privacy, authorization, security, or field-performance compliance.

See [`references/evidence-model.md`](references/evidence-model.md) for the claim-to-evidence matrix.

## Adoption shape

The intended filesystem shape is intentionally small:

```text
consumer-repository/
├─ ui-evidence/
│  ├─ project-profile.json
│  ├─ context/
│  │  └─ first-surface.md
│  └─ fixtures/
│     └─ first-surface.ts
├─ .storybook/ or equivalent adapter/
└─ production components and local tests/
```

The consumer links to this package in its profile or contribution guide. It does not copy this directory wholesale. Shared methods evolve here; local behavior evolves in local code.

## Implementation-ready check

Before changing code, answer these questions in the context packet and state contract:

1. What observable outcome should improve for whom?
2. Which real production component or module is the scope boundary?
3. Which states are material, and which are deliberately out of scope?
4. What deterministic fixture inputs produce each state?
5. What is visible to each role, and what must remain unavailable?
6. What does success, failure, or review-pending look like, and what can a person do next?
7. Which command or review produces each evidence claim?
8. Which unresolved decision must be answered before release?

## Reference material

- [`templates/UI_CONTEXT_PACKET.md`](templates/UI_CONTEXT_PACKET.md)
- [`templates/STATE_CONTRACT.md`](templates/STATE_CONTRACT.md)
- [`templates/PROJECT_PROFILE.example.json`](templates/PROJECT_PROFILE.example.json)
- [`references/evidence-model.md`](references/evidence-model.md)
- [`references/originality-and-data-boundary.md`](references/originality-and-data-boundary.md)
- [`examples/generic-profile.json`](examples/generic-profile.json)

## References

[1]: https://storybook.js.org/docs/get-started/install "Install Storybook"
[2]: https://storybook.js.org/docs/writing-tests "How to test UIs with Storybook"

The supporting catalog and test integration should be rechecked against its official documentation during each consumer adoption, because framework compatibility and tool capabilities evolve.
