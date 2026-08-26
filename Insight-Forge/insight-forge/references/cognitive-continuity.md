# Cognitive Continuity and D1

This reference owns the pedagogical mechanism used for unfamiliar, load-bearing concepts and the detailed acceptance criteria for D1. Apply it to transitions inside an explanation, not only to the artifact's overall structure.

## Contents

1. Recursive micro-sequence
2. Mechanism and intuition
3. Term debt and register
4. Proof-instrument selection
5. Boundaries and technical truth
6. Cold-reader D1 test
7. Calibrated examples

## 1. Recursive micro-sequence

For each load-bearing concept, preserve this causal order where the accepted reader would otherwise have to infer the connection:

```text
constraint or need -> purpose -> object -> operation -> result -> consequence -> boundary
```

- Establish the problem that makes the concept necessary before naming its machinery.
- State the job the concept performs before explaining how it performs it.
- Name the smallest real object, state, or value involved.
- Show the exact transformation from a specific input to an output.
- Explain what the output causes or enables next.
- Close with the nearest boundary or confusion when it matters to the outcome.

Do not force the sequence onto familiar connective language. Use it where its absence would make the reader supply unassumed knowledge.

## 2. Mechanism and intuition

A mechanism explanation identifies:

1. the input and relevant constraint;
2. the actor or component performing the change;
3. the operation or rule of change;
4. the output produced; and
5. how that output causes or enables the next step.

A component list is not a mechanism. A mechanism shows one state becoming another.

Metaphor and intuition are optional. When used, keep two synchronized lanes:

```text
intuition:   familiar image -> preserved relationship
                              |
mechanism:  real object -> operation -> observable result
```

Before relying on a metaphor, establish its exact technical referent, the relation genuinely preserved, and the point where it predicts the wrong behaviour. Land each intuition move on the literal mechanism before adding another.

Keep levels distinct:

```text
conceptual mechanism -> interface or protocol -> implementation example
```

A named framework, API, protocol, or vendor tool may implement or expose a concept; it is not automatically the definition of that concept.

Etymology is not first principles. Use a word origin only when verified, short, and useful to prediction. Never infer modern system behaviour from an origin story.

## 3. Term debt and register

An unfamiliar term creates **term debt**: the reader must hold a word whose job is not yet clear. Pay that debt before adding another load-bearing term.

For each unfamiliar term:

- define it using language already established;
- translate it into a plain phrase;
- move it into an optional depth branch; or
- remove it because it has no job in the accepted outcome.

Do not place a beginner metaphor beside untranslated specialist language. Historical names, citations, metrics, and mathematical qualifications receive no exemption. Keep a citation quiet when the source matters but its terminology does not.

Use one conceptual move per paragraph. Keep subjects explicit and keep cause, operation, and consequence close together. If syntax rather than the subject matter causes rereading, rewrite the sentence.

## 4. Proof-instrument selection

Choose the smallest instrument that exposes the difficult relationship.

| Reader needs to see | Smallest useful instrument |
|---|---|
| Numerical transformation | Worked calculation |
| Calls, order, and handoffs | Sequence trace |
| State and transitions | State diagram |
| Components and ownership | Block diagram |
| Mathematical relationship | Coordinates, plot, equation, or worked table |
| Exact differences | Contrast table |
| A useful familiar relationship | Metaphor with an explicit break point |
| An already concrete mechanism | Concise prose; no metaphor required |

Every visual or trace must show an entrance, the meaningful transformation or relation, and an exit. Add a failure path when failure behaviour is part of the accepted outcome. A decorative diagram does not satisfy the proof requirement.

## 5. Boundaries and technical truth

Put the nearest confusion beside the mechanism it protects:

```text
X is ...
X is not Y ...
The difference becomes visible when ...
Given case Z, predict which behaviour occurs.
```

Truth outranks taste:

- Separate literal mechanism, analogy, interpretation, and implementation example.
- Replace unsupported absolutes such as `always`, `never`, `zero`, and `every` with scoped claims.
- Check the happy path, state owner, nearest failure edge, and a material trade-off when they serve the learning outcome.
- Treat memorable training examples as test inputs, not authorities; correct them before reuse.
- Ensure the final compression follows from the explanation and preserves the decisive qualification.

Recommended compression:

> **Invariant:** one durable architectural truth. **Boundary:** the condition under which it stops being true.

## 6. Cold-reader D1 test

The Cold-reader Reviewer receives the accepted learning contract, dependency spine, claim boundaries, proof requirement, and current draft without the author's private deliberation.

For each high-risk paragraph or transition, the reviewer must be able to answer from the preceding text:

1. Why is this idea appearing now?
2. Why does it matter to the mechanism or outcome?
3. What happens because of it?

Useful finding tags are `WHY_MISSING`, `TERM_DEBT`, `REGISTER_JUMP`, `CAUSAL_GAP`, `DETAIL_WITHOUT_JOB`, `REFERENCE_INTERRUPTION`, and `METAPHOR_OVERLOAD`.

D1 passes only when:

- each load-bearing concept closes the necessary need-to-boundary sequence;
- the proof instrument demonstrates the difficult relation;
- intuition, mechanism, interface, and implementation remain distinguishable;
- the explanation follows the accepted dependency order;
- the nearest confusion and material failure or trade-off are addressed;
- the reader can perform the promised prediction, comparison, diagnosis, decision, or application without merely repeating the metaphor; and
- the final compression preserves the decisive scope edge.

Return the draft when success depends on knowledge the audience was not assumed to have. Concrete confusion reported by an accepted-audience human invalidates an earlier D1 pass for the affected passage; repair and retest it.

## 7. Calibrated examples

### Establish the need for a score

In a hypothetical system, a database may contain 10,000 policy passages while the language model's context can accept only five for this task. The retrieval system must therefore rank the passages. Ranking requires one comparable similarity score for each question-passage pair. The system calculates those scores, sorts them, and retrieves the five highest-ranked passages.

The numbers are illustrative. The reusable principle is that the capacity constraint creates the need to rank, and the need to rank creates the need for a comparable score.

### Explain model-specific coordinate systems

An embedding model learns its own coordinate system. An airplane seat label offers a useful structural analogy: `12A` identifies a location only within a particular seating plan. Another aircraft can also contain `12A`, but the label belongs to a different plan. In the same way, vectors produced by different embedding models should not be compared directly—even when they contain the same number of coordinates—unless an explicit alignment has been validated.

### Translate academic history

Introduce the reader-facing mechanism first: retrieval finds relevant passages, then the language model uses those passages as evidence while generating a response. If provenance matters, add that the original RAG research connected a language model to a separate passage-retrieval system using vector representations. Keep denser source terminology in evidence notes unless it serves the accepted learning outcome.
