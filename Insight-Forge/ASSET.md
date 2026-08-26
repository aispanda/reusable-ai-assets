# RA-009 - Insight Forge

| Metadata | Value |
|---|---|
| Category | Content / research publishing / sense-making |
| Select when | blog, essay, white paper, insight, vision, deconstruct, reconstruct, flavor matching or other public writing from research |
| Human entry | [`INSIGHT_FORGE_WORKFLOW.md`](INSIGHT_FORGE_WORKFLOW.md) |
| Agent entry | [`insight-forge/SKILL.md`](insight-forge/SKILL.md) |
| Status | Draft v0.5; human guide, documentation router, canonical ownership, and duplicate-rule consolidation added; structural validation pending |

## Outcome

Turn mixed source material into a flavor-specific, digestible public artifact (blog, brief, or white paper) through claim-disciplined deconstruction and reconstruction, with owner-gated vision and a compounding flavor catalog.

## Reuse boundary

- **Reusable core:** human workflow guide, skill router, documentation router, orchestration contract, cognitive-continuity contract, multi-provider/surface routing, dimensions, flavor catalog, flavor-match disposition, research-loop templates, evolution log.
- **Project profile:** topic claims, vault notes, brand voice, publish routes, owner dispositions.
- **Evidence:** downloaded PDFs, extracts, bake-offs stay in the consuming project (or private notes).
- **Excluded:** credentials, unpublished personal essays as universal law, live site copy without RA-006 craft.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `INSIGHT_FORGE_WORKFLOW.md` | Plain-language human workflow guide; non-normative orientation | Reusable core |
| `insight-forge/SKILL.md` | Concise agent operating workflow and conditional router | Reusable core |
| `insight-forge/DOCUMENTATION_ROUTER.md` | Canonical ownership, precedence, file status, and minimal-loading paths | Reusable core |
| `insight-forge/references/dimensions.md` | Information→Vision operating dimensions | Reusable core |
| `insight-forge/references/flavors.md` | Flavor catalog + match script | Reusable core |
| `insight-forge/references/flavor-evolution.md` | Compounding improvement log | Reusable core |
| `insight-forge/references/research-loop.md` | Deconstruct/reconstruct procedure, claim taxonomy, and research safety | Reusable core |
| `insight-forge/references/orchestration-contract.md` | Stage ownership, automatic reviewer triggers and acceptance gates | Reusable core |
| `insight-forge/references/cognitive-continuity.md` | Recursive why-before-what sequence, register discipline, causal closure and cold-reader tests | Reusable core |
| `insight-forge/references/multi-provider-workflow.md` | Implementation-neutral provider/model/surface routing, route evidence, and handoffs | Reusable core |
| `insight-forge/assets/*.template.md` | Claim ledger, source note, insight board, and research safety/telemetry record | Reusable core |
| `insight-forge/agents/openai.yaml` | Skill discovery metadata | Reusable core |
| `INSIGHT_FORGE_BROWSER_AUTHOR_CONTEXT.candidate.md` | Single-file Candidate Author context for ChatGPT Web, Gemini Web, and comparable conversational surfaces | Excluded from transfer pending cross-surface evaluation and owner acceptance |

## Inputs and outputs

**Inputs:** topic intent, seed (optional), source pack or links, flavor disposition, available provider/model/surface routes, cost cap.
**Outputs:** reviewed learning contract, reviewed dependency map when routed or an M1 not-required record, model/provider/surface route record, bounded handoff packets, matched flavor record, claim ledger, insight board, draft artifact outline/prose, cold-reader verdict, flavor-evolution note.

## Use / transfer

1. Humans begin with `INSIGHT_FORGE_WORKFLOW.md`. Executing agents begin with `SKILL.md`, then use `DOCUMENTATION_ROUTER.md` to load only triggered canonical references.
2. Run F1 frame review; then wait for owner `ACCEPT` / `AMEND` / `DEFER` / `NEW FLAVOR`.
3. When M1 is routed, build the smallest useful dependency map and pass it before execution; otherwise record why M1 is not required.
4. Execute the research loop into the project's vault and pass applicable safety/evidence prerequisites.
5. Apply `multi-provider-workflow.md`; run a bounded representative-passage bake-off only when route evidence requires refresh and its accepted packet exists.
6. Draft with RA-006 writing-craft when publishing to a site; apply `cognitive-continuity.md` and pass cold-reader D1 before handoff.
7. Log one improvement after the run.

## Dependencies, cost and licensing

- Markdown only; no required runtime.
- Optional model/API spend—route via RA-004; prefer claim-ID retrieval for small vaults.
- Owner writings inspire dimensions; do not copy private PDFs into the transferable package.

## Verification

- Observed 2026-08-15: a fresh-context three-module learning request automatically dispatched an independent F1 reviewer, received `PASS`, and stopped at H1 before M1 as required.
- Observed 2026-08-15: an article's initial D1 `PASS` was contradicted by accepted-audience reader friction. The postmortem exposed missing transition-level purpose, register jumps, and incomplete causal closure; v0.4 now requires that evidence to reopen D1.
- Observed 2026-08-15: a fresh-context v0.4 contract test correctly produced the pre-draft state record and a bounded two-route handoff packet, preserved all human gates, and stopped before full drafting. Its two non-blocking consistency findings—state-schema drift and premature bake-off ordering—were corrected.
- Changed 2026-08-15 in v0.5: added the human guide and documentation router, assigned one canonical owner per concern, moved claim taxonomy to the research loop, consolidated the concept-explanation candidate into cognitive continuity, and removed the superseded candidate file.
- Not yet verified: v0.5 requires a fresh-context routing test and has not completed a full live cross-provider authoring and cold-reader run on a second artifact.
- Manual: apply F1, applicable M1, flavor match, D1 and one Pass-1 board on a second topic.
- Before `Reusable`: three evaluation cases (policy essay, builder note, white-paper outline), including reviewer unavailable, two RETURN loops, owner amendment invalidation, and a brief combined D1/final pass.
- Run central asset validator when promoting.

## Boundaries and limitations

- Does not authorize publication, commit, or deploy.
- Does not replace democratic accountability with metrics.
- Vision candidates ≠ owner commitment.
- Left/right brain language in source philosophy is metaphorical mode language in this asset.
- Defines a logical workflow only; it does not select LangGraph or any execution, visualization, persistence, or automation runtime.
