# Brand → visuals fast path (token-efficient)

Use when a **new site** needs identity + raster exploration after strategy locks — without reloading the whole library or re-litigating settled questions.

**Owners:** RA-005 = strategy/privacy; this file + prompt pack = RA-006 expression. **No new RA.**

## Load order (strict)

| Step | Open only | Do not open |
|---|---|---|
| 1 | RA-005 `brand-voice-identity-flow.md` + `VIBE_IDENTITY_BRIEF.template.md` | Full RA-005/006 trees, prior project seeds |
| 2 | One intake pass → `ACCEPT`/`AMEND`/`DEFER` → **gitignored** project seed + vibe brief | Public brand law until locks exist |
| 3 | This file + `brand-identity-system.md` + `emotion-to-interface.md` | Unrelated UI catalogs |
| 4 | Project copy of [`CHATGPT_IMAGE_PROMPT_PACK.template.md`](../assets/templates/CHATGPT_IMAGE_PROMPT_PACK.template.md) | Attaching whole MD into ChatGPT |
| 5 | Stop image models; finish in **code** (SVG/CSS mark, compress, `public/`) | More ChatGPT once status table is green |

Token rule: inventory → one `ASSET.md` → only the linked files in the table above.

## Intake (one pass)

Ask early: **entity/commercial posture** (personal blog vs product vs firm) + sell-nothing if applicable. Then Q1–Q8; add Q9–Q16 only for gaps. Defer personality/voice when the owner says they are not ready — do not invent rules.

Output: locked vibe brief (public lexicon only in what will become site law). Inner myth stays gitignored (AR-019).

## Visual generation (one pack)

1. Copy the prompt-pack template into the project (e.g. `docs/content/` — gitignored). Fill Brief + Negative from the **accepted** vibe brief only.
2. Generate in order: mark → mono → lockup → favicon → footer → OG → hero. **One asset (or tiny same-asset tweak) per ChatGPT thread.**
3. Paste: Brief + one fenced prompt + Negative. Attach **at most one** reference PNG named in that prompt. Never attach the whole MD.
4. Prefer highest image-quality tier available. Save with stable names; mark **COMPLETE** + full path in the status table.
5. Rejects → `…/brand-images/failed/`. Promote winners into the project draft folder; fix double extensions (e.g. `.png.png` → `.png`).
6. When the status table is all COMPLETE (or DEFERRED), **stop ChatGPT**.

## After rasters (not ChatGPT)

1. Recreate the master mark as **SVG/CSS** for production chrome (deterministic; editable). Until SVG matches, a compressed PNG mark in header is an allowed pilot bridge — record “SVG open” on the brand contract.
2. Compress approved rasters (byte budget); prefer WebP/AVIF companions later; copy to project `public/brand/` and `public/social/`.
3. Fill `emotion-to-interface.md` mapping **before** editing CSS tokens (solar/clarity roles, not only hue names).
4. Promote accepted public lines into site foundation / brand law in the **same** pass as the first UI apply.
5. **UI apply checklist (one page first — usually home):** replace old mark; wordmark spelling; favicon/OG/hero paths; font pair; CTA posture (entity/sell rules); motion pulse only if it serves the metaphor; `prefers-reduced-motion`. If the mark is still a PNG, **force chrome size in CSS** (e.g. 40×40) — never `width/height: auto` on multi‑MB rasters (WEB-035).
6. Owner ACCEPT on that page before rolling site-wide.
7. Diff method learnings → RA-003 into **this** asset (method only; no project paths, employment, or spiritual provenance).

## Anti-patterns (why projects thrash)

| Anti-pattern | Do instead |
|---|---|
| Exploring identity while generating logos | Lock promise, audience, entity posture first |
| Same ChatGPT thread for every asset | New thread per asset |
| Rewriting the prompt pack and deleting bodies | Update status rows only; keep fenced prompts |
| Embedding final wordmark text in rasters | Placeholder type OK for mocks; production type in code |
| Shipping ChatGPT mark as sole production logo | SVG/CSS master; rasters for mood/social |
| Copying private seed into reusable library | Method + templates only (AR-019) |

## Acceptance

- Status table complete or explicitly deferred
- Mark readable mono + favicon size
- OG/hero leave overlay-safe space; no embedded titles
- Production mark is code-native or approved SVG
- Public folders hold only approved exports
- Reusable package unchanged by project private files
