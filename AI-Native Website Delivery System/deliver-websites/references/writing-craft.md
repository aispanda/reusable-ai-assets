# Writing craft (public and delivery prose)

**Purpose:** One writing skill for the kinds of text this library ships: site pages, insights, principles, operating prose, microcopy, and adjacent delivery notes. Topic-neutral. Brand locks come from the consuming project (via RA-005 brand-voice flow when needed).

**Stance:** These are **enablers and defaults**, not deterministic laws. Hard rules create the failure mode we just saw: over-obedience that flattens good philosophy. Use judgment. Owner ear beats checklist when they conflict.

Think **seed → forest**, not **walls → pipes**. Intent and a few clear directions are the seed. Prose, journeys, and checks grow by elaboration. Premature pipes (mandatory rewrite checklists, forced vividness, tip-blog synonym swaps) force energy down one channel and throttle creativity. Enablers are sunlight and soil. Pipes come later, and only where a real constraint demands them (safety, legal precision, UI microcopy).

| Kind | Meaning |
|---|---|
| **Enabler** | A move that often helps; skip when it hurts |
| **Default** | Start here; change with a reason |
| **Fail test** | A way to notice damage — not an automatic rewrite trigger |
| **Hard boundary** | Rare: truth, consent, and safety (no invented claims, no unread-source theatre, no sacred-voice leak into secular copy) |

**Use when:** Drafting or refining any prose a human will read on a site or in a governed delivery artifact—not when choosing layout (use [`page-craft-decision-loop.md`](page-craft-decision-loop.md)) and not when inventing mission/brand (use RA-005 `brand-voice-identity-flow.md`).

**Entry:** Identify the **content type** first. Apply the **core loop** below as enablers. Open research lenses only when stuck. Then run only that type’s recipe.

```text
Pick type → Core enablers → (lenses only if stuck) → Type recipe → Read aloud → Owner ACCEPT / AMEND / DEFER → Sync sources
```

### Core vs research library (do not over-run)

The file got thick because we merged many good lenses at once. **Agents must not apply every section on every edit.** Deterministic checklist runs caused register collapse and precision-list cuts.

**Core enablers (start here):**
1. One job for this piece / section  
2. Plain speech; no unexplained jargon (anti-gatekeeping)  
3. Clarity without flattening content **or** register  
4. Prefer keeping precision lists intact  
5. Short sentences; subject–verb early when tangled  
6. Concrete when abstract would float; skip forced vividness in microcopy  
7. Read aloud; owner ear wins on philosophy conflicts  

**Research library (optional diagnosis):** processing fluency, SUCCES, curiosity gaps, abstraction ladder, finite levers, fact/story, McGilchrist/Paivio notes, etc. Use to *notice* a weak draft — not as a mandatory rewrite engine.

**Fail test for over-engineering:** If the edit changes more than the defect, stop. Surgical beat systematic. Enabler ≠ obligation.
---

## 1. What we write (content types)

| Type ID | What it is | Typical homes | Authority / source of truth |
|---|---|---|---|
| `insight` | Essay, note, blog post: one idea with proof | `/insights`, journal, longread article | Consuming project content files |
| `principle-sutra` | One decision test: compressed line + plain rule + check + story | Principles page; RA-005 principles brain | RA-005 `ENGINEERING_PRINCIPLES.template.md` then public page |
| `operating-prose` | Shared method behind several principles | Principles “operating model”; kit brain sections | Same principles brain |
| `page-lede` | Hero / section headline + one supporting sentence | Any route first viewport or section opener | Project brand + page job |
| `proof-body` | Asset or product explanation: what it does, when to use, boundaries | Asset detail, about, capability pages | Project facts; no invented claims |
| `microcopy` | Buttons, forms, empty states, errors, nav labels | UI chrome | Brand voice + accessibility |
| `policy` | Privacy, terms, cookies: precise and scannable | Legal routes | Legal owner; plain where allowed |
| `decision-packet` | Stakeholder question with options and disposition | Discovery rounds (RA-005) | RA-005 interview method |

If none fit, add a type here after one successful use—do not invent a parallel writing asset.

---

## 2. Universal practices (all types)

### Insight before ornament

1. Say the point in one spoken sentence before drafting.
2. Prefer short sentences. One idea per sentence when the topic is hard.
3. Prefer periods over em dashes that glue two thoughts.
4. Prefer concrete nouns (role, time, number, limit) over stacked abstractions.
5. Cut any phrase the reader must translate before they can act.

### Teenager / read-aloud test

Read the draft aloud once. If you stumble, or a smart teen would need a glossary, rewrite. Beautiful and unclear loses.

### Sentence load (working memory)

Long sentences make the reader hold several unpaid ideas at once. Prefer an average around **16–18 words**. Treat anything past **~35 words** as a candidate to split. Vary length so short sentences do not drone (a short punch, then a longer flowing line). The test is still one aloud pass.

Prefer **right-branching** sentences: subject and verb early; exceptions and subordinate clauses after. Fail test: the sentence opens with a long “Although…” / “By utilizing…” clause before the reader knows who is doing what.

### Processing fluency

Readers treat hard-to-parse prose as less credible. Prefer the simplest word that keeps the whole meaning. If grammar forces a re-read, rewrite before arguing harder. (`ADJACENT`: cognitive-ease / fluency research; do not cite unread chapters as project proof.)

### Clarity without flattening

Simplify **language**, never **content**. Cut hard words, not hard ideas. Pattern for anything technical: **term → plain meaning → why it matters**. The technical term is an anchor, not a wall. If a plain word loses part of the meaning, keep the harder word and gloss it once.

### Anti-gatekeeping (unnecessary jargon)

This craft is for readers outside the inner circle. Prefer speech that does not require membership in a specialist tribe. Public principles pages may be read by business, policy, legal, and newcomers to AI — gloss insider terms on first use when the sentence would otherwise confuse them.

| Cut (performative / insider) | Prefer |
|---|---|
| Force multiplier, constriction, progressive elaboration | Plain verbs: explore, prove, cut cost, fill in the path |
| Theatre stacks of abstract nouns | One concrete claim |
| Unexplained acronyms and vendor slang | Spell out once, or drop |

**Not the same as anti-precision:** Keep necessary domain words when they name a real distinction (`intent`, `acceptance test`, `adapter`) — then gloss on first use. Gatekeeping is unexplained insider talk. Precision with a plain restatement is welcome.

**Fail test:** Would a smart outsider need a decoder ring for this sentence? If yes, rewrite or gloss. If the outsider gets it and a practitioner still respects it, keep it.

### Register without trivializing

Plain is not the same as flat. Philosophy, principles, and North Star prose may keep a slightly elevated register when a word carries contrast or dignity the simpler synonym loses.

| Prefer keeping | Often loses force as |
|---|---|
| Humans (vs the machine) | People |
| Accountability | Blame / ownership slang |
| Execution engine (role) | “Runs fast” (trait) |
| Architects of intent | “Own the aim” (weaker metaphor) |

**Fail test:** After a “simplify” pass, read the line aloud. If it sounds like generic marketing or a tip blog, you over-cut. Restore the load-bearing word. Craft must not turn sutras into slogans.

**Do not collapse precision lists.** If the insight *is* an enumeration (“what to build, when to sequence, whom to align, how to keep evolvable”), keep the list. Summarizing it to “deciding what to build…” is a content cut disguised as clarity.

**Where this applies hardest:** `principle-sutra`, `operating-prose`, `page-lede` on philosophy pages. Where lean wins: `microcopy`, procedural steps.

### Answer first, then support

State the insight or vivid point early (front-loaded lede: conclusion or state-change in sentence 1 when the type allows). Let explanation follow. Do not climb a ladder of abstractions before the reader knows what the piece is for.

**Curiosity gap / error signal (when it helps):** Before the answer, name the contradiction, failing status quo, or blind spot so the reader feels a small “that can’t be right / I need the next line.” Use for `insight` and hard `principle-sutra` openers; skip for `microcopy` and most `policy`.

**Guardrail:** Answer-first is a default, not a hard strip-mine. If forcing punchiness would delete a real disagreement, limit, or necessary framework, keep the substance and still open with the point. Retain essential scope limits in clear separate sentences (clarity ≠ flattening).

### Abstraction ladder (toggle)

Unforgettable writing moves between high-level claim and low-level grit. Never leave an abstract noun (“governance”, “accountability”) orphaned. Within 1–2 sentences, pair it with a concrete instance (role, object, number, filmable scene).

**Order:** Either concrete→claim or claim→concrete is fine. Fail test: a paragraph of abstracts with no sensory or situational anchor. (`ADJACENT`: Hayakawa ladder; Paivio dual anchoring.)

### Sequencing: outline vs living momentum

Default for `proof-body`, `policy`, `decision-packet`, and `operating-prose`: clear outline order (outcome → boundary → how; or numbered levers).

For `insight` (and longread commentary-style notes), you may sequence by **thematic resonance** rather than strict chronology—associative pivots that keep momentum (“Underneath that assumption…”, “A week later the metric told a different story…”).

**Guardrail:** Associative jumps are a craft tool for essays, not a license to scramble requirements, legal text, or decision packets. Never import “living commentary” sacred voice or ritual framing into secular copy.

### Functional defamiliarization

Clichés and performative jargon idle the reader. Prefer unexpected **functional** metaphors or plain rephrasings that make the mechanism visible (“locked ledger” beat “governance issues”).

**Guardrail:** One sharp reframe beats a pile of poetic images. Forced metaphor in `microcopy`, `policy`, or procedural steps fails. If the metaphor needs explanation, use the plain term instead.

### Examples only when they earn their place

Use a concrete example when an idea would otherwise stay abstract. Skip examples when the claim is already concrete. Prefer a **camera test**: something filmable (specific action, object, or scene), not only an unnamed inner feeling. Specificity travels; vague feeling does not.

**Do not** force vivid anecdotes into procedural `microcopy` or lean technical steps. Reserve sensory anchors for abstract, novel, or resisted ideas.

### Coherence trimming

Cut decorative adjectives, preambles, and side quests that do not advance the primary claim. Prefer Mayer-style coherence: every clause earns its keep. Delete meta-announcements (“In this section we will explore…”); start the content.

### Finite levers packaging

When a domain feels open-ended, package guidance as a small numbered toolkit (e.g. three variables, five gates). Bounded lists reduce overload and create a sense of finish. Prefer for `operating-prose`, `proof-body`, and long `insight` sections.

### Fact vs story

State observable fact first. Then label interpretation as interpretation. Do not smuggle narrative as data. (`ADJACENT`: crucial-conversations style fact/story split.)

### Claim status, not empty authority

Mark what kind of claim you are making when that prevents misunderstanding (assumption, recommendation, observed fact). Do not hide behind unnamed deference (“sources say”, “it is said”, “experts hold”) unless the named source is required and owned.

### Scope boundary guard

Say what this piece or asset does **not** cover when that prevents overclaim and sets the right premise. Especially for `proof-body` and `decision-packet`.

### One primary contribution

Before drafting, name the single job of this piece (or section). Extra brilliance that does not serve that job is cut or deferred.

### Trust cost

One sentence the reader cannot believe costs more than ten that land. Prefer checkable claims over ornamental certainty.

### Research lenses (mechanics only)

Use these as **why the enablers above often help**. Do not paste book summaries into public copy. Do not treat unread books as derivation for project claims. Labels: `OBSERVED` = named in project editorial research; `ADJACENT` = common craft vocabulary; `UNVERIFIED ATTR` = LLM attributed a name we have not confirmed—keep the **move**, distrust the name-tag until checked.

| Lens | Transferable writing move | Status |
|---|---|---|
| Working memory / multimedia learning (Paivio dual coding; Mayer coherence) | One unpaid idea per sentence; dual anchor abstract↔concrete; cut non-advancing detail; word+image complementary not redundant | `OBSERVED` (Paivio/Mayer multimedia-learning practice) |
| Hemisphere craft (McGilchrist) | Prose names and sequences; felt sense needs concrete scene, not only labels | `OBSERVED` same |
| Stickiness (Heath & Heath SUCCES) | Simple; unexpected/curiosity gap; concrete; credible; emotional stakes; stories | `ADJACENT` |
| Processing fluency / cognitive ease | Easy parse → higher felt credibility; hard grammar taxes trust | `ADJACENT` (often linked to Kahneman-style fluency; not project-verified chapter cites) |
| Right-branching syntax | Subject–verb early (Pinker *Sense of Style* craft) | `ADJACENT` |
| Abstraction ladder (Hayakawa) | Toggle theory ↔ grit within 1–2 sentences | `ADJACENT` |
| Information-gap curiosity (Loewenstein) | Name the gap before the answer | `ADJACENT` |
| Aesthetic / film discipline | Camera-test examples; small close scenes often beat spectacle | `OBSERVED` (film/media as craft in that vision doc) |
| Camera test / front-loaded lede named as “Guberman” | Keep the **rules**; do **not** treat Guberman as confirmed source of those names—camera test is project house language; lede-first is widespread advocacy craft | `UNVERIFIED ATTR` |
| Finite levers (Greenberg-style packaging) | Bounded numbered toolkits | `ADJACENT` |
| Fact vs story (Patterson et al. lineage) | Data first; narrative labeled | `ADJACENT` |
| Trust / overclaim | Concrete beats grandiose; scope boundaries protect trust | `OBSERVED` |

**How to use:** lenses shape *form* when helpful. They are not mandatory. Domain truth still comes from the owning project’s sources. A sticky sentence about nothing is still about nothing.

### Anti-patterns (watch-fors, not auto-rejects)

These are **smell tests**. Prefer noticing and asking over silent mass rewrite.

| Smell | Enabler (if it fits) |
|---|---|
| Em dashes gluing clauses | Split into two sentences |
| Left-branching overload (“Although…, by…, after…, X does Y”) | Subject and verb first; move hedges right |
| AI cadence (“not X, but Y” stacks; parallel noun piles) | One claim; plain verbs |
| Fake profundity | Ask: what decision changes if this line is removed? |
| Forced examples / forced vividness on concrete or procedural text | Delete; lean microcopy stays lean |
| Forced poetic metaphor / defamiliarization theatre | One functional reframe or plain speech |
| Register collapse (Humans→People, role→trait, dignity→slang) | Restore load-bearing word; re-read for tip-blog tone |
| Collapsing a precision list into a vague summary | Restore the full enumeration; that list *is* the insight |
| Associative essay sequencing used in policy/proof/decisions | Restore outline order |
| Nuance stripping (clarity that falsifies) | Keep limits in separate short sentences |
| Meta-announcements | Delete; start the point |
| Curse of knowledge (unstated premises) | Teenager test; define premises or scope-out |
| Prompt-only enforcement of style rules | Prefer checklists/gates; rules in prompts alone become tics |
| Jargon without a plain restatement | Term → meaning → why, or delete |
| Claims without evidence owner | Label assumption or cut |
| Bibliography theatre / fake precise attribution | Keep the rule; mark `UNVERIFIED ATTR` until checked |
| Layout advice mixed into prose craft | Move to page-craft references |

### Brand and truth

- Obey project voice locks (we/I, claim boundaries, never-imply list).
- Do not invent customers, metrics, legal status, or unread sources.
- Do not present bibliography theatre as derivation.

### Sync rule

If the same fact lives in a library template and a public page, update the **library brain first**, then the page, in the same session.

---

## 3. Type recipes

### `insight` — essay / blog / note

**Job:** Change one belief or teach one move. Not a dump of everything known.

| Layer | Guidance |
|---|---|
| Title | Specific; can stand alone in a feed |
| Lede | Sentence 1 carries the point or curiosity gap; why it matters now |
| Body | Short sections; one job each; abstraction ladder; optional thematic (not only chronological) sequence; fact before story |
| Close | One next action or decision, not a summary reprise |
| Length | Prefer one sitting; cut side quests to later notes |

**Fail test:** Can a reader state the single idea in one sentence after reading?

### `principle-sutra` — principles row

**Job:** A decision test people can use under pressure. Compression lives in the sutra only.

| Layer | Job | Style |
|---|---|---|
| Sutra | Memorable compression | Short, sayable; slight elevation OK |
| Rule | How to decide | 2–4 plain sentences; prefer under ~70 words |
| Practical test | Catch failure | Runnable in a meeting + explicit fail action (“if vague, stop”) |
| Example | Make it stick | Tiny story: role + outcome + hard boundary + who still approves |

**Loop**

1. Lock the insight in one spoken sentence → then sutra.
2. Write the rule in plain speech (what first; what is *not* required yet; accountability edge).
3. Write the practical test as a social procedure with a stop rule.
4. Write the example as a named situation, not abstract “leaders.”
5. Anti-pattern scan (universal table).
6. Update RA-005 principles brain, then any consuming page → owner disposition.

**Do not** make the rule redo the sutra, or the test narrate the example.

**When to rewrite a whole set:** voice drift across 2+ sutras, owner asks, or a full public publish. Otherwise finish one sutra end-to-end.

### `operating-prose` — shared method sections

**Job:** Explain the method several sutras share, without becoming a second manifesto.

- Prefer a short **finite levers** sequence (numbered steps) over dense paragraphs.
- Define three terms max in one block (e.g. intent, direction, boundaries).
- Point to sutras for decision tests; do not duplicate every rule.

### `page-lede` — hero and section openers

**Job:** Orient in one breath.

- One headline job; one supporting sentence; one CTA group when action is required.
- Front-load the state-change; no chronological throat-clearing.
- Brand name may be hero-level on branded landings; do not let a clever line overpower identity when brand is the product.
- No em-dash ledes. No stacked abstractions in the first viewport.

### `proof-body` — asset / about / capability

**Job:** Inspectable truth: what it is, when to use, when not, how to verify.

- Lead with outcome, then **scope boundary** (what it does not cover), then how.
- Prefer checkable claims over adjectives (“pilot-ready”, “best”).
- Fact before story; link to owning artifacts; do not restate whole kits.

### `microcopy`

**Job:** Help someone finish a small action without drama.

- Verb + object on buttons (“View principles”, not “Explore”).
- Errors say what happened and what to do next.
- Empty states teach the next step, not brand poetry.
- No camera-test anecdotes; ruthlessly lean.

### `policy`

**Job:** Accurate, scannable, honest.

- Short headings that match user questions.
- Precision over charm; plain words where law allows.
- Owner and effective date visible; no marketing tone.

### `decision-packet` (RA-005)

**Job:** One decision a stakeholder can dispose in one sitting.

- Recommendation first; ≤3 options; business impact; `ACCEPT` / `AMEND` / `DEFER`.
- Scope boundary: what this decision does not settle.
- No jargon the stakeholder hired the team to resolve.
- Full method: RA-005 `stakeholder-interview.md`.

---

## 4. Relationship map

| Need | File |
|---|---|
| **How to write** (this skill) | `writing-craft.md` |
| What we believe (engineering principles content) | RA-005 `ENGINEERING_PRINCIPLES.template.md` |
| Brand / mission / voice locks | RA-005 `brand-voice-identity-flow.md` |
| How the page is structured and looks | `page-craft-decision-loop.md`, `single-page-craft.md` |
| Emotion → UI moments | `emotion-to-interface.md` |

Writing craft owns **words**. Page craft owns **presentation**. Brand flow owns **identity locks**. Principles brain owns **judgment content**.

---

## 5. Evolution

When a rewrite teaches a durable lesson (as Sutra 1 did), add or tighten a row in the matching type recipe—or in Universal practices if it applies to all types. Log presentation defects in `issue-resolution-patterns.md` (`WEB-###`). Do not grow a second writing skill file.

### Provenance note (transfer, not copy)

Core editorial mechanics came from a scriptural commentary project’s ledger/vision (transfer mechanics only—not sacred voice). Gemini enrichment (2026-08-08) added fluency, right-branching, abstraction ladder, curiosity gaps, finite levers, fact/story, scope boundaries, and anti-patterns. A later “living non-fiction” paste added concrete↔abstract bridge framing, associative sequencing (scoped to `insight`), and functional defamiliarization—with type guardrails. **Rules were kept; unverified author-tags were demoted** (notably Guberman-as-camera-test). Do not import sacred voice, doctrinal framing, or ritual vocabulary into secular writing. Domain substance stays in its owning project.

### Cursor enforcement (preferred)

Do **not** paste this whole file into a root `.cursorrules` blob by default. Prefer: agent/skill loads [`writing-craft.md`](writing-craft.md) when drafting or editing prose; page work still uses the page-craft loop. If a project wants a short Cursor rule, point at this file and the content-type ID—do not fork a second conflicting style bible.

### Merge disposition (Gemini pastes)

| Candidate rule | Disposition |
|---|---|
| Camera test, term→meaning→why, answer-first, sentence caps, no forced examples in microcopy | Already present or tightened |
| Coherence trimming, dual anchoring, front-loaded lede, curiosity/expectation gap, finite levers, fact-story, scope boundary | **Merged** |
| Processing fluency, right-branching, abstraction ladder, rhythmic variance, curse of knowledge, meta-announcements, nuance-stripping guard | **Merged** (from longer paste) |
| “Source: Ross Guberman” for camera test / lede | **Not accepted as verified**; rule kept, attribution marked `UNVERIFIED ATTR` |
| Concrete-to-abstract bridge; curiosity/error signal; living associative sequencing; defamiliarization | **Merged with type guardrails** (associative = `insight` only; metaphors must be functional) |
| “Configure Cursor via full `.cursorrules` dump of craft” | **Rejected as default**; point agents at this file instead |
