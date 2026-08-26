# Insight Forge orchestration contract

Use this contract to make stage ownership and review visible without requiring the owner to summon agents by name. A role is a responsibility, not necessarily a separate persistent agent.

## Contents

1. Control principles and smallest useful topology
2. Independence and review records
3. Stage, gate, and effort routing
4. F1 frame integrity
5. M1 dependency integrity
6. D1 mechanism and transfer
7. Dispatch, correction loops, state, and human authority

## Control principles

- A producer cannot accept its own stage.
- Use one independent **Learning Assurance Reviewer role** across the learning-design gates by default. Give each gate a bounded packet and use a fresh instance for D1 when anchoring risk warrants it.
- Add a domain specialist only when technical uncertainty, high stakes, or disputed coverage justifies the extra cost.
- Keep reviewers read-only. Follow [RA-008 independent review](../../../Multi-Agent-Orchestration/references/independent-review.md) and return `PASS`, `RETURN`, `QUARANTINE`, or `BLOCKED`; never `APPROVED`.
- The human owner approves consequential audience, scope, outcome, flavor, publication, and unresolved-disagreement decisions.
- Activate review at checkpoints, not as continuous background commentary.
- Keep role, agent instance, model, provider, surface, artifact, gate, and human authority distinct. When more than one route participates, apply the [multi-provider workflow](multi-provider-workflow.md).

## Smallest useful topology

| Role | Owns | Separate agent when |
|---|---|---|
| Orchestrator-Author | State, routing, learning contract, and final composition | Always the primary role |
| Learning Architect | Concept inventory and dependency map | The work is a curriculum, series, or multi-domain synthesis; otherwise keep it as an Orchestrator phase |
| Learning Assurance Reviewer | Independent review of framing, dependency order, mechanism closure, and reader transfer | A gate requires acceptance; unavailable independence follows the blocked-or-owner-waiver rule below |
| Evidence Verifier | Claim status, source fitness, and scope of certainty | External, current, disputed, or high-stakes claims matter |
| Candidate Author | Representative proof passage and, after route selection, the full artifact | Another route has demonstrated better task fit or clean author context is useful |
| Cold-reader Reviewer | Cognitive continuity, causal mechanism, and transfer from the accepted audience's prior knowledge | D1 is required; use a fresh context and a different model family or provider when practical |
| Improvement Reviewer | One reusable lesson and its owning asset | After a substantive run; it proposes but cannot edit or approve the reusable core |

Do not create a separate agent merely because the workflow has another step. Separation must buy independence, specialized evidence, parallelism, permission isolation, or materially cleaner context.

## Independence and review record

Track independence separately from the review verdict:

```text
independence_status: INDEPENDENT | SELF_CHECK_ONLY | WAIVED_BY_OWNER | NOT_REQUIRED
verdict: PASS | RETURN | QUARANTINE | BLOCKED | NONE
```

Only an independent reviewer may issue `PASS`, `RETURN`, or `QUARANTINE`. A producer may record `SELF_CHECK_ONLY` findings but cannot issue a verdict or advance the gate.

If an independent reviewer is unavailable:

- for standard, deep, high-stakes, externally consequential, or explicitly independence-required work, set the gate to `BLOCKED`;
- for a low-risk brief, show the self-check and limitation to the owner, who may explicitly set `WAIVED_BY_OWNER` and allow the run to continue;
- never describe a self-check or waiver as independent review.

## Stage and acceptance map

| Stage | Producer | Artifact | Reviewer | Acceptance gate |
|---|---|---|---|---|
| 1. Frame | Orchestrator | Learning contract | Learning Assurance Reviewer | **F1 - Frame integrity** |
| 2. Owner disposition | Human owner | Accepted or amended learning contract and flavor | No agent substitutes for owner | **H1 - Intent accepted** |
| 3. Map | Learning Architect or Orchestrator | Concept inventory and dependency map | Learning Assurance Reviewer; domain specialist only when routed | **M1 - Dependency integrity** |
| 4. Evidence | Researcher or Orchestrator | Claim ledger and bounded source set | Evidence Verifier, independent from the producer when E1 is routed | **E1 - Evidence fitness** |
| 5. Explain | Selected Candidate Author or Orchestrator-Author | Draft plus proof instrument | Cold-reader Reviewer acting under Learning Assurance criteria | **D1 - Mechanism and transfer** |
| 6. Release | Orchestrator-Author | Reader-ready artifact | Human owner; publication system separately | **H2 - Publish decision** |
| 7. Learn | Improvement Reviewer | Improvement candidate with owner and evidence | Owning asset workflow under RA-003 | **A1 - Promotion decision** |

For one narrow concept, Stage 3 may be a short prerequisite chain rather than a formal curriculum map. It still receives the M1 check. For a curriculum or series, use a visible concept inventory and dependency map before drafting modules. For work that does not teach or depend on a concept sequence, record `M1: NOT_REQUIRED` with one sentence explaining why.

## Effort routing

| Route | Use when | Review treatment |
|---|---|---|
| Brief | One bounded, low-risk outcome with no disputed or high-stakes claims | F1 remains required. Combine D1 with the final pass only if the reviewer remains independent. Route M1 only for concept teaching. |
| Standard | Multiple concepts, meaningful source synthesis, or a durable public artifact | Use separate F1 and D1 gates; run M1 and E1 when their triggers apply. |
| Deep | Curriculum, series, multi-domain synthesis, high-stakes decision support, or complex mechanism | Use a visible dependency map, all applicable gates, and a fresh D1 reviewer instance when practical. |

## F1 - Frame integrity

The Orchestrator writes a compact learning contract containing:

- audience and any necessary audience tiers;
- assumed prior knowledge;
- observable reader outcome: what the reader should be able to explain, predict, decide, or do;
- scope, exclusions, depth, and current-source needs;
- proposed flavor and smallest useful proof instrument;
- completion evidence.

The Learning Assurance Reviewer checks that:

1. the outcome is observable rather than "understand X";
2. the assumed knowledge is plausible for the named audience;
3. scope and exclusions are sufficient to prevent a silent topic expansion;
4. depth and proof instrument serve the outcome rather than decorate the artifact;
5. mixed audiences have a shared spine and explicit depth branches;
6. completion evidence can demonstrate that the learning job succeeded.

The reviewer returns a verdict and only the corrections needed to pass. After `PASS`, present the learning contract and flavor disposition to the owner for H1. On `RETURN`, the Orchestrator revises it. On `QUARANTINE` or `BLOCKED`, stop and escalate the specific conflict or missing input. `DEFER` terminates the run without failure.

## M1 - Dependency integrity

The Learning Architect records concepts as nodes and prerequisite relationships as directed edges. Each major node states what it assumes and what capability it unlocks.

The Learning Assurance Reviewer checks that:

1. every node contributes to the accepted reader outcome;
2. prerequisites appear before concepts that depend on them;
3. every non-obvious dependency edge has a reason;
4. no missing foundation forces the draft to smuggle in unexplained knowledge;
5. no circular or unnecessary prerequisite creates avoidable learning cost;
6. each module begins from an established idea and prepares the next necessary idea;
7. at least one transfer check requires prediction, comparison, diagnosis, or application rather than recall.

Route an additional domain specialist only when the reviewer cannot judge subject coverage from authoritative sources, when omissions could be consequential, or when the map spans domains with contested boundaries. The specialist reviews factual coverage, not prose taste or owner intent.

## D1 - Mechanism and transfer

The Cold-reader Reviewer applies the complete mechanism, transition, register, boundary, and transfer criteria owned by [`cognitive-continuity.md`](cognitive-continuity.md). D1 passes only when the accepted proof instrument demonstrates the difficult relation and the reader can perform the promised outcome without relying on the author's private context.

A concrete confusion report from an accepted-audience human invalidates the D1 pass for the affected passage and triggers revision and re-review. This contract owns the reopening rule; `cognitive-continuity.md` owns the pedagogical diagnosis.

## Dispatch and loop rules

1. When Insight Forge is selected, run F1 automatically; the user need not name the reviewer.
2. Run M1 automatically for every concept explanation, curriculum, series, or dependency-heavy multi-topic synthesis. Otherwise record `M1: NOT_REQUIRED` with a reason.
3. Run E1 only when the claim profile requires it. The Evidence Verifier must not have produced the evidence set it reviews.
4. Run D1 before final handoff of standard or deep work. For brief work, it may share the final pass but cannot waive independence.
5. Give each reviewer a compact packet: gate criteria, artifact or diff, accepted prior-gate artifact, allowed evidence, at most three blocking findings per cycle, and stop conditions.
6. The initial review does not count as a correction loop. Increment the counter for each `RETURN -> revision -> re-review`; after two such loops, return `QUARANTINE`. Reset only after an owner-approved material reframe.
7. If H1 changes audience, outcome, scope, depth, flavor, or proof instrument materially, rerun F1 and invalidate M1 when dependencies may change. If a post-D1 change affects dependency order, mechanism, proof, or a material claim, rerun the affected M1, E1, and D1 gates.
8. If an accepted-audience human reports concrete friction, reopen D1 for the affected passage even when the prior verdict was `PASS`.
9. Fold the minimum nearest-confusion and failure/trade-off attack into D1. Use a separate opposing-counsel pass only for contested theses, consequential work, or a flavor that requires it.
10. Apply the unavailable-independence rule above; never let a producer self-pass.
11. Preserve only a compact state record:

```text
stage | role | agent_instance | provider | model | surface | input_artifact | output_artifact | reviewer | independence_status | verdict | loop | required_correction | owner_decision | next
```

The owner may ask to see this record at any time, but should normally receive only decisions that require human judgment.
