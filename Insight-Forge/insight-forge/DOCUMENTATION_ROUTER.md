# Insight Forge Documentation Router

This is the reading map, not a second source of truth. Register each document once, load only what the current stage requires, and keep detailed rules in the document that owns them.

## Entry chain

```text
Human owner -> ../INSIGHT_FORGE_WORKFLOW.md
Executing agent -> SKILL.md -> this router -> triggered canonical references
Asset maintainer -> ../ASSET.md -> SKILL.md -> this router
```

## Authority and conflict rules

1. The user's accepted intent and decisions control the run within higher-level instructions and safety boundaries.
2. `SKILL.md` owns the mandatory operating sequence and tells the agent when to route.
3. The canonical reference named below owns its concern. Other documents may point to it but must not redefine it.
4. Templates define artifact shape, not workflow policy.
5. Historical logs provide evidence, not current instructions.
6. Candidate files are inactive unless the owner explicitly starts an evaluation. They never override active contracts.
7. If two active documents conflict, stop the affected stage, follow the canonical owner in this router, and record the inconsistency for correction.

## Canonical runtime references

| Load when | Document | Canonically owns | Must not redefine | Status |
|---|---|---|---|---|
| Every substantive Insight Forge run, before research or drafting | [`references/orchestration-contract.md`](references/orchestration-contract.md) | Stages, roles, gates, verdicts, independence, effort routes, correction loops, compact state, and human authority | Pedagogical detail, evidence procedure, or provider selection | Active; mandatory |
| Before F1/H1 flavor disposition and whenever flavor changes | [`references/flavors.md`](references/flavors.md) | Flavor catalog, flavor job, matching, and primary/secondary flavor rule | Proof-instrument mechanics or orchestration gates | Active; mandatory before drafting |
| Concept explanation, curriculum, mixed audience, beginner-facing writing, or any D1 review | [`references/cognitive-continuity.md`](references/cognitive-continuity.md) | Recursive need-to-boundary sequence, mechanism closure, term debt, register continuity, cold-reader transition tests, and D1 pedagogical criteria | Gate routing or provider choice | Active; conditional |
| Research, source synthesis, current/external claims, or evidence artifacts | [`references/research-loop.md`](references/research-loop.md) | Corpus bounds, research safety, evidence status and claim-role taxonomy, claim ledger, source notes, insight board, and evidence-to-draft handoff | Learning gates or prose style | Active; conditional |
| Work crosses agents, models, providers, interfaces, browser tools, CLI, or API; or a bake-off is considered | [`references/multi-provider-workflow.md`](references/multi-provider-workflow.md) | Role/model/provider/surface vocabulary, route evidence, bounded bake-off, route records, and cross-surface handoffs | Stage definitions, verdict authority, or D1 criteria | Active; conditional |
| Reconstruction requires insight, imagination, wisdom, vision options, or depth/breadth/height checks | [`references/dimensions.md`](references/dimensions.md) | Information-to-vision dimensions, Insight-as-Fire reconstruction, vision checks, and human ownership of vision | Claim taxonomy or workflow gates | Active; conditional |
| After a substantive run, and only for improvement capture or flavor maintenance | [`references/flavor-evolution.md`](references/flavor-evolution.md) | Dated flavor and workflow learning evidence, disposition, and promotion history | Current runtime instructions | Active history; post-run only |

## Artifact templates

Copy these into the consuming project when their trigger applies. Do not load every template merely because Insight Forge was selected.

| Trigger | Template | Owns | Status |
|---|---|---|---|
| Material claims need traceability | [`assets/CLAIM_LEDGER.template.md`](assets/CLAIM_LEDGER.template.md) | Claim-record fields | Active output template |
| A source needs an Atom/Frame/Join/Vision note | [`assets/SOURCE_NOTE.template.md`](assets/SOURCE_NOTE.template.md) | Source-note fields | Active output template |
| Reconstruction reaches tensions, blends, scenarios, or vision candidates | [`assets/INSIGHT_BOARD.template.md`](assets/INSIGHT_BOARD.template.md) | Insight-board fields | Active output template |
| A model may handle sources, prompts, retrieval, or telemetry | [`assets/RESEARCH_SAFETY_TELEMETRY.template.md`](assets/RESEARCH_SAFETY_TELEMETRY.template.md) | Project-owned corpus and telemetry decision record | Active output template |

## Human, packaging, metadata, and evaluation files

| Document | Purpose | Runtime treatment | Status |
|---|---|---|---|
| [`../INSIGHT_FORGE_WORKFLOW.md`](../INSIGHT_FORGE_WORKFLOW.md) | Plain-language human orientation | Do not use as a competing policy source | Active human guide |
| [`../ASSET.md`](../ASSET.md) | Library record, transfer boundary, and verification status | Maintainer context; not normal authoring context | Active asset record |
| [`agents/openai.yaml`](agents/openai.yaml) | UI discovery metadata | Never load for reasoning | Active metadata |
| [`../INSIGHT_FORGE_BROWSER_AUTHOR_CONTEXT.candidate.md`](../INSIGHT_FORGE_BROWSER_AUTHOR_CONTEXT.candidate.md) | Single-file browser Candidate Author packet for ChatGPT Web, Gemini Web, or comparable surfaces | Upload only for a bounded cross-surface evaluation; it cannot self-approve | Inactive candidate |

## Minimal loading paths

| Job | Load after `SKILL.md` and this router |
|---|---|
| One bounded non-teaching brief with no external claims | `orchestration-contract.md`, `flavors.md` |
| Explain one technical concept | `orchestration-contract.md`, `flavors.md`, `cognitive-continuity.md`; add `research-loop.md` when claims require sources |
| Build a curriculum or series | `orchestration-contract.md`, `flavors.md`, `cognitive-continuity.md`, `research-loop.md` |
| Move work among Codex, Antigravity, ChatGPT Web, Gemini Web, CLI, or API | Add `multi-provider-workflow.md` after accepted learning and evidence prerequisites |
| Reconstruct insight or vision options | Add `dimensions.md`; preserve human vision authority |
| Improve the reusable asset after a run | Add `flavor-evolution.md` and route promotion through RA-003 |
