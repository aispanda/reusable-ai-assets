# AI-native software factory operating model

## Outcome

Convert inexpensive AI generation into dependable, customer-owned applications by governing specifications, foundations, independent review and institutional learning as one delivery system.

## The four controls and their owners

| Control | Safe interpretation | Owning asset |
|---|---|---|
| Specification as blueprint | Begin with intent and direction; before implementation, define a bounded quality contract with measurable outcomes, invariants and evidence oracles. Tests are one oracle, not the entire specification. | RA-005; domain-specific contracts stay in the project |
| Independent fresh-context review | A different agent/session reviews against authoritative requirements and evidence without inheriting the implementer's rationalizations. Fresh does not mean context-free. | RA-008; bounded transfer uses RA-010 |
| Controlled learning | Fix the project, identify the reusable root cause, propose a versioned change, test it, review it independently, obtain human approval, stage it and retain rollback. | RA-003, using RA-005 learning-change proposal |
| Proven foundations | Establish the smallest necessary data, security, interface, deployment and observability boundaries before scaling generation. Architecture evolves through fitness evidence rather than being invented per file or frozen completely up front. | RA-001, RA-002, RA-005 and RA-006; security profile when promoted |

## Delivery loop

```text
intent and business outcome
  -> bounded quality contract
  -> smallest proven foundation
  -> authorized implementation
  -> deterministic checks
  -> independent fresh-context review
  -> human decision for consequential release
  -> measured operating outcome
  -> controlled learning-change proposal
  -> cross-project evaluation and versioned promotion or rejection
```

## Important corrections to common slogans

1. **“The issue is the spec” does not mean perfect requirements before discovery.** Intent, direction and boundaries permit elaboration. A slice-specific quality contract becomes mandatory before consequential implementation.
2. **“Write tests first” is a strong default for deterministic rules and regressions, not a universal substitute for judgment.** UX, accessibility, security, resilience and exploratory learning can require different evidence.
3. **A green test suite is necessary but gameable.** Add negative, boundary, mutation or adversarial cases; verify final state; use independent review.
4. **A fresh reviewer is independent, not ignorant.** Give it the authoritative specification, artifact/diff, observed evidence, constraints and known risks—but not the implementer's unverified narrative as truth.
5. **Self-healing means governed learning, not autonomous self-modification.** One failure cannot silently rewrite the factory. Prevent overfitting through representative evaluation, versioning, approval and rollback.
6. **Foundations are fitness boundaries, not a universal architecture.** Reuse contracts and checks; keep provider, customer and project configuration outside reusable core.

## Minimum scorecard

Track outcomes rather than lines of code or agent activity:

- elapsed and human time per accepted outcome;
- first-pass and final acceptance rate;
- escaped defects and security findings;
- regression and rollback rate;
- operating cost and token/tool cost per verified outcome;
- reusable-asset adoption and measured effort saved;
- time to recovery and portability proof;
- reviewer disagreement and human override rate.

## Stop rules

Stop or quarantine when acceptance evidence is missing, the reviewer is not independent, authority is unclear, required verification cannot run, a reusable change lacks a rollback, or optimization improves speed/cost while degrading quality, safety or customer control.
