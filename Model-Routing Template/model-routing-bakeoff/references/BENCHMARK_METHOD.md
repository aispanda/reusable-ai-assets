# Small representative bake-off method

Prove **evidence for routing**, not a single brand winner. Use the smallest fair trial that can change a project default *under an explicit priority mix*.

## Neutrality (required)

1. Report metrics first: quality axes, completeness, latency, cost proxy, privacy/ops.
2. Publish a **perspective map**: “If you prioritize X → data lean Y (caveat Z).”
3. Do not collapse the write-up into one mandatory winner. Project defaults are a **human ACCEPT** on a named perspective (see RA-004 routing template).
4. Separate **ops reachability** from **quality**. Unreachable ≠ low quality.
5. Keep judge text labeled as one harness opinion; tables are the contract.
6. If two judge passes differ in absolute scores, report both; preserve rank-order notes.

## Design

| Item | Guidance |
|---|---|
| Unit | Real task slices (e.g. caption segments), not toy sentences only |
| Size | Often 8–12 units; escalate only if results are close |
| Inputs | Identical for every system under test |
| Blind rule | Translators/generators get no downstream taxonomy unless that is the task |
| Judge | Different model family or human; never self-score |
| Cost unit | One currency: API $, quota, or elapsed agent time — do not mix silently |
| Completeness gate | e.g. ≥10/12 units with usable output, **or** failure mode documented |
| Latency | Capture min / median / mean / max / total for the pack |

## Rubric axes (adapt per task)

For translation: adequacy, fluency, terminology, faithfulness, entity fidelity, downstream usefulness, critical-error count.
For summaries: omission, hallucination, schema compliance, citation fidelity.

Do **not** declare a universal primary axis. Risk-sensitive projects often weight faithfulness + adequacy + completeness; latency-sensitive projects may weight median sec/unit; privacy-sensitive projects may require local-only—even when quality trails.

## Perspective map (minimum rows)

Include at least:

| Priority | Data lean | Caveat |
|---|---|---|
| Speed | … | … |
| Judge/human quality | … | … |
| Completeness | … | … |
| Critical-error minimization | … | … |
| Marginal API $ | … | … |
| Offline / privacy | … | … |
| Balanced mix (name the weights) | … | … |

Optional combination rows: privacy+$0, speed-at-all-costs, cloud-down fallback chain, etc.

## Artifacts to keep (project evidence)

- Segment/input pack
- Per-system outputs + latency/errors
- Judge JSON/markdown
- `preflight.json` + `meta.json`
- Perspective map in the project benchmark or routing doc
- Human ACCEPT of a default perspective (separate from the score tables)

## Scoring discipline

- Missing output → low scores + critical error (do not ignore incompleteness)
- Ops unreachable ≠ quality loss — label as ops failure and keep last proven route
- Update the project matrix; copy only method improvements back into RA-004/RA-007
- **Same rubric axis names ≠ same scale across judges.** Never average DeepSeek-judge means with Gemini-judge means (or any two judge families). Compare ranks/leans **within** a pass; merge only objective ops metrics (completeness, latency) across passes.
- When the same judge family re-scores with a different opponent set, absolute means may drift — report both passes; do not silently pool.

## Anti-patterns

- Full-corpus MT before a slice bake-off
- Starting without preflight
- Using the generator as its own judge
- Declaring a winner on fluency after 2 samples
- Writing “X is the best” without naming the priority mix
- Pasting secrets or personal absolute key paths into reusable docs

## Blinding (anti-spoil)

- Referee prompts must use anonymous labels (System A/B/C), shuffled per item.
- Map brands only after scoring.
- Boxer set and judge set must be disjoint.
- Prefer per-item judge calls over one giant JSON for local models.
- Do not average scores across different judges; record pass winners + shared ops metrics.
