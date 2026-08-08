# Emotion to interface

Use after an accepted RA-005 vibe identity brief (or equivalent). Translates named feelings into website/UI decisions so marketing pages and product chrome share one emotional system.

Compose with [`brand-identity-system.md`](brand-identity-system.md). Do not invent strategy here — pull promise, audience, personality, and emotional jobs from the brief.

## Why this exists

Brand strategy without interface mapping produces pretty logos and generic UI. Emotional jobs must become tokens, layout, motion, imagery, and microcopy, or the site will not propagate the intended thoughts and feelings.

## Input contract (from vibe brief / flow)

| Input | Required |
|---|---|
| Promise / mission one-liner | Yes |
| First-face audience | Yes |
| 2–3 target feelings on first visit | Yes |
| Personality traits express / avoid | Yes |
| Visual metaphor direction (accepted) | Yes |
| Public vs inner lexicon rules | Yes |
| Imagery / motion preferences | Preferred |

## Mapping table (fill per project)

| Target feeling | Page / UI moment | Visual / token move | Motion | Microcopy move |
|---|---|---|---|---|
| {{FEELING_1}} | Hero / first viewport | {{TOKEN_1}} | {{MOTION_1}} | {{COPY_1}} |
| {{FEELING_2}} | {{MOMENT_2}} | {{TOKEN_2}} | {{MOTION_2}} | {{COPY_2}} |
| {{FEELING_3}} | {{MOMENT_3}} | {{TOKEN_3}} | {{MOTION_3}} | {{COPY_3}} |

### Heuristics (starting points — tailor per brand)

| Feeling direction | Often means in UI |
|---|---|
| Clarity / oriented | Strong hierarchy, one job per section, generous measure, plain CTAs |
| Capability / “I can do this” | Concrete next step, demos/proof nearby, low jargon, progressive depth |
| Calm urgency | Clear stakes without panic chrome; restrained motion; evidence over hype |
| Trust | Consistent tokens marketing↔product; visible claim status; accessible contrast |
| Warmth | Human imagery (if allowed), softer radius, conversational microcopy |
| Precision | Tight grid, monospace accents sparingly, dense but scannable data |

Avoid encoding feeling only as colour. Pair colour with type, space, motion, and words.

## First viewport rule

The first viewport should usually carry: brand signal, one headline, one supporting sentence, one CTA group, one dominant visual plane. Do not dump stats, schedules, or secondary marketing into the emotional opening unless the product is a dashboard.

## Handoff into build

1. Update brand contract visual tokens from the mapping table.
2. Apply the same tokens to header, footer, favicon, social card, empty/error states.
3. Check contrast and motion accessibility (prefers-reduced-motion).
4. Verify public lexicon: no inner-myth terms leaked into UI strings.
5. Owner ACCEPT on one representative page before scaling components.

## Acceptance checks

- Each target feeling has at least one designed moment
- Tokens are named by role (e.g. emphasis, proof, ground), not only by hue
- Marketing and in-product surfaces can share the token set
- Reduced-motion and contrast paths exist
- Human owner approves emotional fit, not only visual preference
