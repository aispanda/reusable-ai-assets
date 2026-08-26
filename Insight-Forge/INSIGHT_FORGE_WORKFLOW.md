# Insight Forge: Human Workflow Guide

This guide explains Insight Forge for a human owner. It is an orientation map, not a second policy source. When a detailed rule matters, the canonical owner named in [`insight-forge/DOCUMENTATION_ROUTER.md`](insight-forge/DOCUMENTATION_ROUTER.md) controls.

## What Insight Forge does

Insight Forge turns a difficult topic, source pack, or body of technical knowledge into an explanation, learning path, article, brief, or white paper that is:

- technically defensible;
- arranged in an order the intended reader can follow;
- written with controlled conceptual load;
- reviewed independently at important transitions; and
- released only through human judgment.

It does not merely make prose sound better. It separates four different jobs:

```text
find the truth
  -> arrange it for learning
  -> explain it clearly
  -> test whether it transferred
```

## The seven stages

### 1. Frame the learning job

The Orchestrator defines who the reader is, what may already be assumed, what the reader should be able to explain or do, what is in and out of scope, the desired depth, the writing flavor, and the smallest proof instrument that could demonstrate the difficult relationship.

An independent Learning Assurance Reviewer checks the frame at **F1**. The human owner then accepts, amends, defers, or requests a new flavor at **H1**.

**Produces:** an accepted learning contract.

### 2. Arrange the concepts

The Learning Architect identifies the necessary concepts and places prerequisites before the ideas that depend on them. Each important concept must contribute to the accepted reader outcome.

The Learning Assurance Reviewer checks the dependency order at **M1**. A narrow non-teaching artifact may record that M1 is not required and why.

**Produces:** a concept inventory and dependency map.

### 3. Build the evidence

The Evidence Producer gathers a bounded source set, classifies its safety and privacy boundary, and separates source-backed statements from inference, uncertainty, advocacy, vendor claims, scenarios, and boundaries.

When the claim profile requires it, an independent Evidence Verifier checks source fitness and scope at **E1**.

**Produces:** an approved source set, source notes, and claim ledger.

### 4. Choose the route

The Orchestrator assigns each role to a suitable agent, model, provider, and surface. Codex, Antigravity, ChatGPT Web, Gemini Web, a CLI, or an API are possible surfaces; none is permanently entitled to a role.

A current proven route may be reused. When evidence is absent, stale, or contradicted by reader friction, at most two candidates write the same difficult 300-500-word passage. The passages are blind-scored, and one route is selected for the full artifact.

**Produces:** a route record and bounded handoff packets.

### 5. Construct and test the explanation

The selected author reconstructs the material in the accepted dependency order. For unfamiliar concepts, the explanation moves from the need to the mechanism and then to its consequence and boundary. A calculation, trace, state diagram, contrast, metaphor, or no visual device is selected according to the reader's actual uncertainty.

A fresh Cold-reader Reviewer tests whether the explanation closes the mechanism and transfers to the accepted audience at **D1**. Concrete confusion from an accepted-audience human reopens D1 even when an earlier reviewer returned `PASS`.

**Produces:** a reviewed draft and proof instrument.

### 6. Make the release decision

The Orchestrator prepares a reader-ready artifact, removing workshop labels and internal process debris. The human owner decides whether to release it at **H2**. Publication remains a separate system action.

**Produces:** a release decision and, when accepted, a reader-ready artifact.

### 7. Learn from the run

The Improvement Reviewer captures one evidence-backed lesson and identifies which reusable asset owns it. The reviewer may propose a change but cannot silently edit or approve the reusable core. Promotion follows the owning asset workflow and human authority at **A1**.

**Produces:** an improvement candidate, not an automatic self-modification.

## The workflow at a glance

| Stage | Primary producer | Main artifact | Gate or decision |
|---|---|---|---|
| Frame | Orchestrator | Learning contract | F1, then H1 |
| Map | Learning Architect | Dependency map | M1 |
| Evidence | Evidence Producer | Claim ledger and source set | E1 when routed |
| Route | Orchestrator | Route record and handoffs | Bounded bake-off when triggered |
| Explain | Selected author | Draft and proof instrument | D1 |
| Release | Orchestrator | Reader-ready artifact | H2 |
| Learn | Improvement Reviewer | Improvement candidate | A1 |

## Who—or what—is participating?

Keep these words separate:

| Term | Plain meaning |
|---|---|
| Role | The responsibility, such as Evidence Verifier or Candidate Author |
| Agent instance | One bounded execution assigned that responsibility |
| Model | The reasoning or generation model used for that execution |
| Provider | The organization or service supplying the model |
| Surface | Where the work happens: Codex, Antigravity, ChatGPT Web, Gemini Web, CLI, or API |
| Artifact | The durable object handed to the next stage |
| Gate | The test controlling whether work may advance |
| Human owner | The person who owns intent, consequential judgment, release, and promotion |

A useful current route might assign repository extraction to Codex and explanatory authorship to Gemini Web. That is an evidence-backed operating choice, not a permanent architectural law.

## How much process is used?

| Route | Use it for | Treatment |
|---|---|---|
| Brief | One bounded, low-risk outcome | F1 remains required; combine only compatible independent checks |
| Standard | Multiple concepts or a durable public artifact | Separate F1 and D1; add M1 and E1 when triggered |
| Deep | Curriculum, series, multi-domain synthesis, or consequential work | Visible dependency map and all applicable gates |

The purpose of routing is not ceremony. It spends review effort where misunderstanding or unsupported claims would matter.

## Example: explaining embeddings and RAG

Suppose the reader is a consultant who understands databases but not vector retrieval.

1. **Frame:** The outcome is not merely "understand embeddings." The reader should be able to trace how a question selects passages and explain why the language model receives text rather than raw vectors.
2. **Map:** Establish context limits, then numerical representations, then similarity ranking, then retrieval, then generation.
3. **Evidence:** Verify how the scoped implementation encodes, compares, retrieves, and supplies passages.
4. **Route:** Give repository or documentation extraction to a suitable technical surface. Give the accepted evidence packet to one or two candidate explanatory surfaces only when a route comparison is needed.
5. **Explain:** Use a sequence trace. Introduce a spatial analogy only where it clarifies comparison, and state where the analogy stops.
6. **Test:** Ask the cold reader to predict what breaks if passages and queries were embedded by incompatible models.
7. **Release and learn:** The owner accepts the article; reader friction becomes evidence for the next improvement.

## What the human normally sees

The owner should not have to direct internal agents by name or inspect every state transition. The normal human interface is:

- H1: Is this the right audience, outcome, scope, flavor, and proof?
- an escalation when evidence, independence, safety, cost, or disagreement blocks progress;
- H2: Is this artifact ready to release?
- A1: Should an observed lesson change a reusable asset?

The full state remains inspectable, but it is not the default conversation.

## Where to go next

- An AI agent starts with [`insight-forge/SKILL.md`](insight-forge/SKILL.md).
- The skill reads [`insight-forge/DOCUMENTATION_ROUTER.md`](insight-forge/DOCUMENTATION_ROUTER.md) to load only the canonical references required for the current stage.
- Templates under `insight-forge/assets/` are copied into a consuming project; they are not competing instruction sources.
