# Seed idea management

Use when an unstructured idea arrives as speech, chat dump, notes, or flow writing and must be captured before roadmap commitment, research, or brand work.

Seeds are **not** decisions. They stay uncommitted until a human moves them into charter, research, or brand law.

## Outcomes this method owns

1. Preserve raw seed material **as spoken** (no premature tidy).
2. Register the seed for revisit without putting it on the roadmap.
3. Optionally derive a **vibe identity brief**: mission, vision, north star, principles, and brand feeling tokens for any app or initiative.
4. Hand visual brand execution to the website/product brand contract (RA-006) when a public surface needs marks, colours and type.

## When to use

| Trigger | Action |
|---|---|
| Flow / spoken dump about meaning, mission, metaphor or brand | Capture with [`SEED_CAPTURE.template.md`](../assets/SEED_CAPTURE.template.md) |
| Many small opportunities without depth yet | Register only in [`SEED_IDEAS.template.md`](../assets/SEED_IDEAS.template.md) |
| Seed should shape mission, vision, principles or logo feeling | Derive [`VIBE_IDENTITY_BRIEF.template.md`](../assets/VIBE_IDENTITY_BRIEF.template.md) |
| Owner is in flow for brand, voice, mark, audience, belief flip | Run [`brand-voice-identity-flow.md`](brand-voice-identity-flow.md) (Q1–Q8); capture as spoken |
| Approved vibe brief needs logo, colour, type, applications | Continue in RA-006 `brand-identity-system.md` |

## Capture rules

1. **As-is first.** Store the owner’s words in a clearly labeled raw section. Do not rewrite into marketing copy in the same pass.
2. **One seed, one file** when the idea has depth (mission, metaphor, research thesis, product concept). Use the register table alone for thin opportunities.
3. **Label evidence.** Mark claims in later synthesis as `OBSERVED`, `INFERRED` or `ASSUMED`. Raw capture itself is `OBSERVED` speech, not validated fact.
4. **Disposition required.** Every seed has Explore / Park / Promote / Drop and a revisit trigger.
5. **Sacred or culturally loaded vocabulary** stays in the seed until the owner decides what is public-facing vs internal metaphor. Do not auto-publish Sanskrit, religious or closed-practice terms onto consuming sites.
6. **No silent overwrite** of existing brand law, charter or roadmap from a seed.
7. **Publishable repos:** gitignore project-specific brand transcripts and vibe briefs when they contain private myth or unreleased positioning. See [brand-voice-identity-flow.md](brand-voice-identity-flow.md) privacy rule. Never put real project brand transcripts into the reusable library.

## Lifecycle

```text
Raw capture (SEED-NNN file)
  → Register row in SEED_IDEAS.md
  → Optional: Vibe identity brief (feeling → mission / vision / north star / principles / tokens)
  → Optional: Research vault (if claims need evidence)
  → Promote only via human ACCEPT into charter, SITE_FOUNDATION / brand contract, or roadmap
```

## Vibe → identity bridge (any app)

Feeling is a first-class input. For each seed that should shape identity, elicit or extract:

| Layer | Question |
|---|---|
| Feeling / vibe | What should people *feel* when they meet this name or mark? |
| Thought | What idea should become clearer? |
| Emotion | What fear or hope does this relieve or name? |
| Spanda / pulse | What ongoing motion or rhythm is the product at the centre of? |
| Mission | Whom do we guide, through what change? |
| Vision | What world is more true if we succeed? |
| North star | One sentence that settles trade-offs when priorities collide |
| Principles | 3–7 rules that constrain behaviour and design |
| Name system | Spelling, pronunciation, what the name must never imply |
| Visual metaphor | Primary image family (e.g. sun, wave, lattice)—and what to avoid |
| Colour / type feeling | Warm/cool, dense/open, classical/modern—before hex codes |
| Public vs inner lexicon | Which metaphors stay internal |

Produce at most **three** meaningfully different visual directions after the vibe brief is accepted. Explain business signal and accessibility risk for each. Human selects one.

## Project layout

```text
docs/SEED_IDEAS.md              # register table
docs/seeds/SEED-NNN-slug.md     # deep seeds (raw + metadata + lifecycle)
docs/brand/VIBE_IDENTITY_BRIEF.md   # optional; one active brief per product surface
```

Update the project documentation router so each seed file has an ownership row.

## Quality checks

- Raw section is present and not replaced by a polished paraphrase.
- Register row matches the seed file ID.
- Disposition and revisit trigger are non-empty.
- Vibe brief does not claim brand approval until the owner accepts it.
- Cultural terms have an explicit public/inner decision before marketing use.
- Related seeds and blogs are linked, not duplicated.

## Boundary

This method structures capture and identity ideation. It does not approve logos, trademarks, theological claims, or public copy. Visual exports and site tokens remain owned by the project brand contract (and RA-006 for website delivery).
