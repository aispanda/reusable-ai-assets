# ChatGPT / image-model prompt pack — {{PROJECT_PUBLIC_NAME}} visuals

**Status:** Project-local (gitignore under `docs/content/` or `docs/private/` when publishing). Not site law until owner ACCEPT and export.
**Entity posture:** {{PERSONAL_BLOG | OPEN_PROJECT | COMPANY_PRODUCT}} — {{SELL_NOTHING | SELLING_ALLOWED}}
**Public never:** {{PUBLIC_NEVER_LIST}}
**Draft folder:** `{{PROJECT}}/docs/private/brand-images/`
**Failed folder:** `{{PROJECT}}/docs/private/brand-images/failed/`
**Approved folder (later):** `{{PROJECT}}/public/brand/` and `{{PROJECT}}/public/social/`

---

## How to run each prompt (read once)

| Question | Answer |
|---|---|
| Attach the entire MD file? | **No.** |
| Attach only this prompt? | **Yes** — copy the fenced prompt block for that number only. |
| Copy anything else? | **Always:** (1) Brief below, (2) this prompt, (3) Negative. Optional: attach **one** reference PNG named in the prompt. |
| Same thread? | Only for tiny tweaks to **the same asset**. |
| New thread? | **Default for every Prompt N or N.x**. |
| After a winner? | Save PNG; mark **COMPLETE** + full path below. Fix double extensions (`.png.png` → `.png`). |

**Model tip:** Prefer highest image quality tier available.

---

## Brief (paste with every new chat)

```text
Brand: {{PROJECT_PUBLIC_NAME}} ({{ONE_LINE_ENTITY}}).
Public story: {{PUBLIC_METAPHOR_ONE_LINE}}.
Feeling: {{2_TO_3_FEELINGS}}.
Must read as {{CATEGORY_SIGNAL}} to a general audience without {{FORBIDDEN_ICONOGRAPHY}}.
Logo mark: {{MARK_GEOMETRY}} — no animals in the mark unless ACCEPT; no sacred symbols unless ACCEPT.
Wordmark: "{{WORDMARK_SPELLING}}" — prefer text outside generated rasters; keep type for real fonts.
No: {{STOCK_CLICHES_TO_AVOID}}; no sales CTAs unless selling is allowed.
Favicon must stay readable at 32×32.
```

---

## Negative (append every time)

```text
Avoid: {{NEGATIVE_LIST}} — watermarks, busy particle soup that fails at small size, embedded unreadable text, imitating third-party logos.
```

---

## Status tracker

| Prompt | Status | File path(s) |
|---|---|---|
| 1 Primary mark | PENDING | — |
| 1.1 Unify mark (optional) | PENDING / N/A | — |
| 1.2 Mono | PENDING | — |
| 2 Lockup mock | PENDING | — |
| 2.1 Lockup unified (optional) | PENDING / N/A | — |
| 3 Favicon | PENDING | — |
| 3.1 Favicon from mark (optional) | PENDING / N/A | — |
| 4 Footer motif | PENDING / DEFER | — |
| 5 Open Graph | PENDING | — |
| 6 Hero atmosphere | PENDING | — |

---

## Prompt 1 — Primary mark

**Thread:** New chat · **Attach MD?** No · **Attach image?** No

```text
Design a minimal logo mark for {{PROJECT_PUBLIC_NAME}}.
{{MARK_GEOMETRY_DETAIL}}.
Style: clean vector-like flat design, high clarity, works on light and dark backgrounds.
No text unless requested. No deities, no sacred glyphs, no corporate consulting badge clichés unless that is the accepted personality.
Square composition, generous padding, favicon-friendly simplicity.
```

**Save as:** `{{slug}}-mark-v01.png`

---

## Prompt 1.1 — Unify mark to a chosen reference (optional)

**Thread:** New chat · **Attach:** one winner reference PNG · **Say:** “Match this mark geometry; ignore any wordmark text.”

```text
Same brand brief. Draw ONLY the icon from the attached reference.
Flat vector-like, crisp edges. Provide on pure black and on pure white if possible.
No text. Simple enough to read at 32×32. Square, generous padding.
```

**Save as:** `{{slug}}-mark-v02-color-on-black.png` / `…-color-on-white.png`

---

## Prompt 1.2 — Monochrome

**Thread:** New chat · **Attach:** accepted colour mark

```text
Convert the attached mark to TRUE monochrome with high contrast.
Version A: light mark on pure black. Version B: dark mark on pure white.
Flat, no grey-on-black glow. No text. Keep ring/detail count readable at small size.
```

**Save as:** `{{slug}}-mark-mono-v01-light-on-black.png` and `…-dark-on-white.png`

---

## Prompt 2 — Lockup mock (placeholder type)

**Thread:** New chat · **Attach MD?** No

```text
Same mark beside the wordmark "{{WORDMARK_SPELLING}}" in a clean modern sans.
Horizontal header lockup: mark left, wordmark right; balanced clear space.
No slogan. Letters are placeholders for real fonts later.
```

**Save as:** `{{slug}}-lockup-v01.png`

---

## Prompt 2.1 — Lockup using unified mark (optional)

**Thread:** New chat · **Attach:** accepted mark only

```text
Horizontal website header lockup: attached mark left; "{{WORDMARK_SPELLING}}" right.
Dark ink on white and optional dark-bg version. No slogan. Placeholder type OK.
```

**Save as:** `{{slug}}-lockup-v02.png` / `{{slug}}-lockup-v02-dark.png`

---

## Prompt 3 — Favicon / app icon

**Thread:** New chat · Prefer attaching accepted mark and simplifying

```text
Extremely simple app icon derived from the mark: keep core + minimal rings/detail.
Must read at 32×32 and 16×16. No text. Flat vector; rounded-square and/or circular crop.
```

**Save as:** `{{slug}}-favicon-v01.png`

---

## Prompt 4 — Footer motif (optional)

```text
Wide, quiet footer motif: thin horizontal vibration/ripple or brand-consistent abstract fading to edges; optional small centred mark.
Editorial, calm. No text, no mascots, no sacred geometry.
```

**Save as:** `{{slug}}-footer-motif-v01.png`

---

## Prompt 5 — Open Graph

```text
Open Graph image. Full-bleed abstract matching the public metaphor.
Leave calm area for title overlay (do NOT render any text in the image).
Aspect ~1.91:1. No third-party logos, no sacred imagery, no stock robot handshake.
```

**Save as:** `{{slug}}-og-v01.png`

---

## Prompt 6 — Hero atmosphere

```text
Subtle full-bleed hero atmosphere for {{ONE_LINE_ENTITY}}: edge-to-edge soft focal energy fading into ground.
Low distraction so headline text can sit on top. No people, no UI screenshots, no sacred symbols unless ACCEPT.
```

**Save as:** `{{slug}}-hero-v01.png`

---

## After ChatGPT (project — not prompts)

1. SVG/CSS production mark.
2. Compress; copy approved set to `public/brand/` and `public/social/`.
3. Update site foundation / brand law after visual ACCEPT.
4. Strengthen RA-006 method only via RA-003 if a reusable lesson appeared (no project private text).
