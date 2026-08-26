# Brand, logo and interface identity

Use this module when a site needs a new identity, a rebrand, or a governed extension of an existing brand. Branding is part of website delivery because it shapes trust, comprehension, accessibility and every public asset. It becomes a separate reusable asset only when it must serve products beyond websites.

## Minimum brand contract

Record one concise answer for each item:

| Element | Required decision |
|---|---|
| Promise | What should the audience believe this site or initiative helps them understand or accomplish? |
| Personality | Three traits to express and three traits to avoid |
| Voice | Plain-language rules, technical-depth rule and claim/evidence rule |
| Name | Approved spelling, case, pronunciation if useful and domain/social consistency |
| Logo system | Primary mark, wordmark, compact mark, monochrome version and clear-space/minimum-size rules |
| Visual tokens | Colour roles, typography, spacing, radius, borders, icon and imagery direction |
| Applications | Header, favicon/app icon, social card, article imagery, live tools and error/empty states |
| Rights | Origin, creator/tool, licence, font/icon/image rights and trademark/search status |
| Owner | Human approver and source-of-truth location |

## Vibe / feeling intake (before visuals)

When the brand starts from emotion, metaphor or flow writing—or the product is an app that needs mission/vision before a site—use **RA-005** `rapid-ai-solution-delivery/references/seed-idea-management.md`, `brand-voice-identity-flow.md`, and `VIBE_IDENTITY_BRIEF.template.md` first. Keep project-specific transcripts gitignored when publishing the consumer repo.

Map the accepted vibe brief into this contract:

| Vibe brief field | Brand contract field |
|---|---|
| Mission + audiences | Promise |
| Feeling / pulse / voice | Personality + Voice |
| Name system | Name |
| Visual metaphor + iconography | Logo system direction |
| Colour / type feeling | Visual tokens (still pre-hex / pre-font-file) |
| Public vs inner lexicon | Voice + Rights (what may appear publicly) |

Do not invent sacred or culturally loaded public copy from an inner metaphor without an explicit owner decision in the vibe brief.

## Emotion → interface

After the vibe brief is accepted, fill [`emotion-to-interface.md`](emotion-to-interface.md) so target feelings become tokens, motion, imagery and microcopy. Strategy without this map produces generic UI.

## Efficient workflow

For a **new site identity under token/budget pressure**, follow [`brand-visual-fast-path.md`](brand-visual-fast-path.md) (strict load order + one ChatGPT pack). Otherwise:

1. Approve promise, audience and personality before visual exploration (or accept a vibe identity brief that already carries them).
2. Map 2–3 target feelings to first-viewport and key page moments (`emotion-to-interface.md`).
3. Produce at most three meaningfully different directions; explain the business signal and accessibility risk of each.
4. Select one direction, then derive responsive logo variants and interface tokens from it.
5. Copy [`CHATGPT_IMAGE_PROMPT_PACK.template.md`](../assets/templates/CHATGPT_IMAGE_PROMPT_PACK.template.md) into the project (gitignored). One asset per thread; status table; failed → `failed/`. Stop image models when the table is green.
6. Use code/CSS for interface structure and deterministic marks; use raster generation for mood/social where it adds value. Never auto-trace or imitate a third-party logo.
7. Store editable source, export sizes, provenance and usage rules together. Keep project identity out of this reusable package.

## Acceptance checks

- remains recognisable in monochrome and at favicon size;
- wordmark and mark work separately; no text is embedded in generated raster art;
- colour pairs meet required contrast; colour is not the only carrier of meaning;
- light/dark and narrow/wide contexts have defined variants;
- every font, icon and image has documented rights;
- no confusing similarity to a known brand has been accepted without human review;
- public title, logo spelling, domain, metadata and social preview agree;
- the human owner explicitly approves identity and claims.

## Boundary

AI may explore and implement options, but the human owner approves name, identity, cultural fit, legal risk and final public use. A visual preference is reversible; a public brand commitment is not.
