# Brand voice & identity flow (any product)

Use when an owner can answer in flow (or async) and you need mission, vision, north star, principles, name, mark direction, and voice — then hand off to visual/UX expression without forcing a long questionnaire.

Works with:
- [`seed-idea-management.md`](seed-idea-management.md) (raw capture first)
- [`VIBE_IDENTITY_BRIEF.template.md`](../assets/VIBE_IDENTITY_BRIEF.template.md) (structured brief)
- RA-006 `brand-identity-system.md`, `emotion-to-interface.md`, and **`brand-visual-fast-path.md`** (token-efficient logo/imagery after ACCEPT)

**Composition:** RA-005 owns strategy elicitation. RA-006 owns website/interface expression. No separate brand RA unless brand-only engagements repeatedly need a standalone package.

## Privacy rule (consuming projects)

Project-specific raw captures and vibe briefs often contain private metaphor, sacred vocabulary, or unreleased positioning. Keep those files **local-only** (gitignore) when the repo will be published. Publish only approved brand law (e.g. site foundation) and this reusable method — never the private seed transcript.

Suggested ignore patterns:

```gitignore
# Private identity / personal / legal capture (do not publish)
docs/seeds/*-brand*.md
docs/seeds/SEED-*-brand-identity.md
docs/brand/VIBE_IDENTITY_BRIEF.md
docs/brand/*-private*
docs/content/
docs/private/
```

Also gitignore any project file that contains employment, visa, lawsuit, compensation, spiritual/scriptural provenance-as-IP, or “not for public” owner instructions. Public registers (`SEED_IDEAS.md`) may list a generic row only (“identity capture — local file”).

Register private files in the documentation router with status `Local only — gitignored`.

## Public entity & commercial posture (ask early)

Before mission/marketing language hardens, lock how the initiative may present itself:

| Posture | Typical public language | Avoid claiming |
|---|---|---|
| Personal blog / hobby thought leadership | I write / this blog / experiments | Firm, practice, “we advise clients,” selling services |
| Open project / lab notes | Project docs, demos, reusable assets | Employer endorsement, paid offering (unless true) |
| Company / product | We / product name / pricing | Only when legally and employment-safe |

If the owner is employed or otherwise constrained: default to **non-commercial personal publishing** until they explicitly ACCEPT a stronger entity claim. Do not invent “advisory firm” or “competitor to consultancies” framing.

**Sell-nothing rule:** when the owner says nothing is for sale, strip CTAs to hire/buy/subscribe from brand law and image prompts until revisited.

## Inner provenance vs public story

Owners sometimes hold private cultural, spiritual, or biographical sources that inform the work. Those may stay in **gitignored** capture files. Public surfaces use only the approved secular/public lexicon. Never publish inner provenance to “explain the brand” unless the owner explicitly ACCEPTS that disclosure.
## End-to-end workflow (strategy → expression)

```text
0. Raw seed capture (as spoken)
1. Flow Q1–Q8 (core identity) + Q9–Q16 (strategy/voice/expression gaps) as needed
2. Vibe identity brief (locks only; ACCEPT/AMEND/DEFER)
3. Onlyness + positioning check (can a competitor steal the sentence?)
4. Hand off to RA-006 brand-visual-fast-path (one prompt pack; stop ChatGPT when status table is green)
5. RA-006 brand contract + emotion→interface map (tokens, motion, imagery, microcopy)
6. Promote accepted lines into public brand law / site foundation
7. Build UI/pages from the same tokens and voice — marketing and product share one system
```

**Token-efficient next-site path:** load only this file + vibe template → one intake → then only RA-006 `brand-visual-fast-path.md` + prompt-pack template. Do not reload the full RA-005/006 trees.

Do not start logo/UI before steps 1–3 have enough locks for promise, audience, and personality.

### Research-backed layers (why these questions exist)

| Layer | Intent | Typical sources |
|---|---|---|
| Purpose / mission / vision / values | Why exist; what you do; future state; principles | Brand strategy practice |
| Onlyness / positioning | “The only ___ that ___” — differentiation that survives competitor swap | Marty Neumeier ZAG |
| Audience (first face + secondary) | Who first; who later | Discovery workshops |
| Belief flip / narrative | Old story → new story | Thought-leadership / era maps |
| Personality + voice | 3 traits + avoid; do/don’t sentences; channel tone | Voice workshops; spectrum exercises |
| Value props + proof | Offer stack + evidence rules | Messaging frameworks |
| Public vs inner lexicon | What may appear on site | Cultural/rights governance |
| Visual metaphor + mark vs mascot | One public mark; optional later characters | Identity systems |
| Emotion → interface | Named feelings → colour/type/space/motion/microcopy | Emotional JTBD; design-token practice |

## Flow rules

1. Ask at most one cluster at a time when the owner is in flow; capture answers **as spoken**.
2. Explain *why* a question matters in one short beat before asking, if the owner is unsure.
3. Prefer `ACCEPT` / `AMEND` / `DEFER` once a draft lock appears.
4. **Steer, don’t cage:** do not invent a long aesthetic never-list unless the owner wants one. Hard red lines only when they protect mission or legal/cultural risk.
5. Separate **public lexicon** from **inner myth**. Inner meaning may inform design; it must not auto-appear on the site.
6. Logo vs mascot vs inner symbolism are different jobs (one public mark; mascots optional later; myth can be many and private).

## Question set A — core identity (Q1–Q8)

Ask in order. Skip any the owner has already answered in a seed.

### Q1 — First three seconds
When someone lands and *gets it* in three seconds, what do they feel in the body, and what one sentence forms in the mind?

**Locks:** promise feeling, dual-read depth (simple vs deep).

### Q2 — Public name
What is the public-facing name spelling? Merged or spaced? When does each form appear?

**Locks:** wordmark and domain consistency.

### Q2b — Public entity & commercial posture
Is this a personal blog/hobby, an open project, or a company/product? Is anything for sale on these surfaces? Any employment or legal constraint on how it may present?

**Locks:** we/I voice; no false firm or sales claims; gitignore posture for sensitive notes.

### Q3 — Primary metaphor priority
If the core visual metaphor can mean source, guide, or living pulse, which must win first?

**Locks:** mark meaning hierarchy.

### Q4 — Enemy-quality of the age
Not a rival company — the *weather* of the age this brand refuses (e.g. closedness, hype, dependency, noise). Ask for a plain example if needed.

**Locks:** voice contrast and “never imply.”

### Q5 — Whose face first
If the brand could warm one human first, whose life is that — and what are they trying to survive or become? Not “everyone eventually.”

**Locks:** primary audience and proof style.

### Q6 — Big-moment belief flip
Because this brand existed, what old story dies and what new story takes its place?  
Help with an era map if useful (e.g. prior wave opened X; this wave opens Y). Research peer framers only when the owner asks.

**Locks:** mission/vision one-liner and thought-leadership spine.

### Q7 — Mark vs name vs mascot
Does the visual mark include a creature/character, or does that live only in the name / later mascot / private myth?

Clarify: **logo** (one system) ≠ **mascot** (optional characters) ≠ **private symbolism** (may be many, unpublished).

**Locks:** logo direction; defers mascot complexity.

### Q8 — Public never / case-by-case
What must never appear on public surfaces (religious iconography, sacred practice as product claim, fake proof, etc.)?  
If the owner is unsure: prefer **case-by-case** for aesthetics; lock only mission-critical red lines.

**Locks:** public vs inner lexicon; rights and cultural-fit boundary.

## Question set B — strategy / voice / expression gaps (Q9–Q16)

Use after Q1–Q8 (or interleaved if the owner is ready). These close layers that Q1–Q8 often leave thin.

### Q9 — Onlyness (positioning)
Complete: “We are the only ___ that ___.”  
Then swap in a competitor’s name — if the sentence still works, tighten until it doesn’t.

**Locks:** category + differentiation.

### Q10 — Personality spectrum
Pick position on 4–6 axes (e.g. formal↔casual, serious↔warm, technical↔plain, minimal↔expressive, calm↔urgent). Name **three traits to express** and **three to avoid**.

If the owner says personality is not formed yet: **DEFER**. Do not invent deterministic voice rules. Revisit when hard constraints appear in published work.

**Locks:** personality for RA-006 contract — or explicit DEFER.

### Q11 — Voice do / don’t
Give 3 sentences this brand would say and 3 it would never say (same topic). Optional: how LinkedIn tone differs from the website.

Defer with Q10 when personality is open.

**Locks:** actionable voice (adjectives alone are not enough) — or DEFER.

### Q12 — Value / offer stack
In one stack: what exists **now** (writing, demos, assets); what may grow **next** (platform, community — mark aspirational); what you **refuse** to claim or sell; optional **sibling** properties (other URLs/projects) without merging their legal entity into this one.

**Locks:** offer clarity vs aspiration; keeps personal-blog vs firm boundary honest.

### Q13 — Proof rule
What counts as proof on public surfaces (case pattern, demo, method, named result)? What claim status labels are required when evidence is incomplete?

**Locks:** claim/evidence voice; anti-hype.

### Q14 — Emotional job → site moments
Name 2–3 feelings the first visit should leave people with (e.g. oriented, capable, calm urgency). For each, one page moment that must create it (hero, principles, empty state, CTA).

**Locks:** emotion→UX bridge for RA-006.

### Q15 — Imagery and motion direction
Photo / abstract / illustration / code-native? Motion: still, subtle pulse, or expressive? Any hard avoid beyond Q8?

**Locks:** pre-visual tokens for imagery and motion.

### Q16 — Secondary audiences
Who matters second and third (e.g. tech leaders, builders, policy)? What must the site never make them feel (talked down to, excluded, sold hype)?

**Locks:** progressive depth without losing the first face.

## After the flow

1. Append raw answers to the seed capture file (or create one) — gitignore if private.
2. Update or create `VIBE_IDENTITY_BRIEF` with locked lines only.
3. Run onlyness check (Q9) before visual exploration if positioning is still soft.
4. Follow RA-006 `brand-visual-fast-path.md`: fill project prompt pack from locks; generate mark→mono→lockup→favicon→OG/hero; stop when COMPLETE.
5. Map accepted brief → RA-006 brand contract + `emotion-to-interface.md`.
6. Promote accepted **public** lines into project brand law / site foundation.
7. Build pages/UI from shared tokens and voice (SVG/CSS production mark; rasters for mood/social).

## Acceptance checks

- Raw answers preserved; locks labeled `ACCEPT` / `AMEND` / `DEFER`
- Public vs inner lexicon table filled for risky terms
- Onlyness sentence fails competitor-name swap (or gap explicitly deferred)
- Personality has traits + voice examples, not adjectives alone
- Emotional jobs mapped to at least one interface moment each
- Private capture paths gitignored when the repo is public
- No religious or closed-practice content published without explicit owner approval
- Reusable package contains **no** real project brand transcript
