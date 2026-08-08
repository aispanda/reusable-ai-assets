# AI-Age Engineering Philosophy — Evidence Matrix

**Owns:** source basis for [`ENGINEERING_PRINCIPLES.template.md`](ENGINEERING_PRINCIPLES.template.md) (9 Sutras + 99/10).  
**Status:** Seed bibliography received from asset owner (2026-08-07). Bibliography entries are `OBSERVED`. Theme-to-sutra mappings are `INFERRED` from each work’s established scope until chapter/page checks close the gap.  
**Rule:** Do not treat this matrix as project law. Do not invent page quotes or numerical support for 99/10.

## Labeling

| Label | Meaning |
|---|---|
| `OBSERVED` | Owner supplied the citation, or a finding was checked against the named work in a recorded review |
| `INFERRED` | Reasonable applicability from known book themes; not yet chapter/page verified in this library |
| `GAP` | Sutra or claim still lacks a strong source in this seed set |

## Seed bibliography (`OBSERVED`)

| ID | Citation |
|---|---|
| S01 | Alammar, J., & Grootendorst, M. (2024). *Hands-On Large Language Models: Language Understanding and Generation*. O’Reilly Media. |
| S02 | Brooks, F. P., Jr. (1995). *The Mythical Man-Month: Essays on Software Engineering* (Anniversary ed.). Addison-Wesley Professional. |
| S03 | Evans, E. (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley Professional. |
| S04 | Ford, N., Parsons, R., Kua, P., & Sadalage, P. (2022). *Building Evolutionary Architectures: Automated Software Governance* (2nd ed.). O’Reilly Media. |
| S05 | Forsgren, N., Humble, J., & Kim, G. (2018). *Accelerate: The Science of Lean Software and DevOps*. IT Revolution Press. |
| S06 | Huyen, C. (2022). *Designing Machine Learning Systems: An Iterative Process for Production-Ready Applications*. O’Reilly Media. |
| S07 | Huyen, C. (2025). *AI Engineering: Building Applications with Foundation Models*. O’Reilly Media. |
| S08 | Iusztin, P., & Labonne, M. (2024). *LLM Engineer’s Handbook: Master the Art of Engineering Large Language Models from Concept to Production*. Packt Publishing. |
| S09 | Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O’Reilly Media. |
| S10 | Morville, P., & Rosenfeld, L. (2006). *Information Architecture for the World Wide Web* (3rd ed.). O’Reilly Media. |
| S11 | Ousterhout, J. (2021). *A Philosophy of Software Design* (2nd ed.). Yaknyam Press. |
| S12 | Baeza-Yates, R., & Ribeiro-Neto, B. (1999). *Modern Information Retrieval*. Addison-Wesley Longman Publishing Co., Inc. |
| S13 | Barrasa, J., & Webber, J. (2023). *Building Knowledge Graphs: A Practitioner's Guide*. O’Reilly Media. |

## Sutra ↔ source map (`INFERRED` until verified)

| Sutra | Strongest seed sources | Theme used for mapping | Boundary / limitation |
|---|---|---|---|
| 1 Aim Before You Generate | S02, S03, S07 + **owner operating model** | Conceptual integrity (Brooks); language/context before automation (Evans); application intent before model calls (Huyen); **owner flow:** intent + direction first, progressive elaboration of journeys/criteria with AI/assets | Classics predate generative agents; owner model is `INFERRED`/owner-authored—not a claim that cited books prescribe LLM elaboration |
| 2 Deterministic Verification | S04, S05, S06, S07, S08 | Fitness functions / automated governance (Ford et al.); continuous delivery quality checks (Forsgren et al.); production evaluation and monitoring (Huyen; Iusztin & Labonne) | Fitness functions ≠ full product correctness; evals can be gamed |
| 3 Standard Foundations Over Locks | S04, S09, S11, S07 | Evolutionary change via modular seams (Ford); portable data/system design (Kleppmann); complexity control via clear modules (Ousterhout); provider-swappable AI apps (Huyen AI Eng.) | Open/standard first still requires licence, maintainership and security review |
| 4 Decouple Ingestion from Processing | S09, S06, S07, S08 | Reliable async pipelines and durable writes (Kleppmann); batch/stream and serving separation in ML systems (Huyen); production LLM request handling (Iusztin & Labonne) | Not every UX can defer; some flows need synchronous SLAs with backpressure |
| 5 Pilot Benchmarking & Multi-Agent Roles | S06, S07, S08, S01 | Iterate with project metrics, not vanity benchmarks (Huyen); production LLM evaluation and routing practice (Iusztin & Labonne; Alammar & Grootendorst) | Public leaderboards remain useful for screening, not production lock-in |
| 6 Prompts, Context & Evals as Capital | S07, S08, S10, S12, S13, S01 | Versioned application artifacts around models (Huyen; Iusztin & Labonne); findability and structure of knowledge (Morville & Rosenfeld); retrieval quality (Baeza-Yates & Ribeiro-Neto); durable structured context (Barrasa & Webber) | IA/IR/KG books are broader than “prompt repos”; map to context governance carefully |
| 7 Zero-Idle Deployment | S05, S06, S07 | Operational performance and efficient delivery economics (Forsgren et al.); production cost/serving trade-offs (Huyen) | Scale-to-zero is an infrastructure pattern; books support cost-aware ops more than a single cloud feature |
| 8 Human Authority & Accountability | S02, S06, S07, S08 | Human responsibility for systems that matter (Brooks tradition); production ownership, monitoring and safe release (Huyen; Iusztin & Labonne) | None of these replace legal/compliance specialist review |
| 9 Value-Driven AI Economics | S05, S06, S07, S02 | Outcome and capability metrics over busywork (Forsgren et al.); iterate on system value and cost (Huyen); avoid man-month style false economies (Brooks) | Outcome pricing is a commercial strategy; books support measurement discipline, not a billing model mandate |

## Coverage gaps (`GAP`)

| Gap | Why it matters | Suggested next evidence |
|---|---|---|
| Explicit human-in-the-loop / high-stakes approval norms | Sutra 8 needs stronger primary standards beyond engineering books | ISO/IEC AI management or risk guidance; org policy examples (non-confidential) |
| Scale-to-zero / serverless cost evidence | Sutra 7 is thin in this seed set | Current primary docs from chosen runtimes; SRE/FinOps sources |
| Pay-per-outcome commercial models | Sutra 9 commercial clause is mostly `INFERRED` | Pricing/ROI case studies with clear bias labels |
| Chapter/page verification | All theme mappings remain `INFERRED` | Record chapter/theme + access date per S01–S13 when reviewed |

## Proposed principle amendments (AIE-3 — for owner disposition)

No material sutra rewrites recommended from this seed set alone.

Optional non-material enrichment (accept / amend / defer):

1. Under **Sutra 6**, add a one-line design note: context quality depends on information architecture and retrieval discipline (S10, S12, S13)—not only prompt text.
2. Under **Sutra 2**, prefer the term **fitness function** (S04) alongside “automated checks” for continuity with evolutionary architecture vocabulary.

Response syntax for the optional notes: `ACCEPT`, `AMEND: ...`, or `DEFER`.

## Refresh rule

- Add a source only with full citation and an owner reason.
- Promote an `INFERRED` row to `OBSERVED` only after chapter/theme verification is recorded (reviewer + date).
- Cap active matrix rows near 20 highest-value sources; archive superseded entries rather than growing indefinitely.
- Re-run philosophy challenge via [`AI_AGE_ENGINEERING_RESEARCH_PROMPT.template.md`](AI_AGE_ENGINEERING_RESEARCH_PROMPT.template.md) when the matrix changes materially.
