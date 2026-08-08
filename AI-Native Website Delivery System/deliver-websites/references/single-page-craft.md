# Single-page craft

Use this when the job is **one route**—a longread, principles page, essay, manifesto, policy brief, case write-up, or landing slice—not a full-site launch. For whole-site discovery, architecture, and capability staging, stay in `SKILL.md` and `page-system.md`.

This file is **topic-neutral**. Do not import another project's brand, fonts, colours, voice, names, or copy. Borrow structure and decision tests only. Choose visual tokens from the consuming project's identity contract. For **wording** (insights, sutras, ledes, microcopy), use [`writing-craft.md`](writing-craft.md)—this file owns layout and reading chrome, not prose recipes.

## When to open this file

| Signal | Action |
|---|---|
| One URL must carry deep content | Use long-form reading craft below |
| Visitor must scan many peer sections | Add sticky section navigation + deterministic heading IDs |
| Content is staged teaching, not narrative | Prefer a sticky visual + scrolling stages pattern |
| Job is improve/test an existing page | Run the improvement loop at the end; do not scaffold a new site |
| Need tools, inspiration, or standards | Shortlist from `ui-ux-ecosystem-catalog.md`, then verify official sources |

## Job → pattern router

| Job | Prefer | Avoid |
|---|---|---|
| Philosophy / principles / method | Numbered sections, short rule, practical test, scenario; sticky TOC | Card grids that flatten depth into slogans |
| Narrative longread | Standfirst, reading column (~65–75ch), chapter figures, related next | Explainer chrome, checklist voice, dual competing CTAs |
| Staged explainer | Sticky media + 4–7 short stages; active-section highlight | Turning stages into an internal AI brief or prompt dump |
| Conversion landing | One promise, one proof path, one primary action | Hero clutter: stats, schedules, badge piles, multi-card grids |
| Policy / trust | Plain summary first; owner/date; expandable detail | Sensational framing or unexplained legal jargon |

## Information architecture (long-form)

Default desktop shell:

```text
Header / page chrome (site shell)
  Eyebrow / collection
  H1 (one job)
  Standfirst / lede (one short supporting block)
  Optional callout (question, constraint, or North Star)
  Optional hero media (eager + fetchpriority=high when it is LCP)

Body
  LEFT (desktop): section TOC derived from headings
  RIGHT: article sections in reading order

Footer region
  Related routes / primary next action
```

Mobile: single column; hide sticky TOC or collapse it to a jump list; keep heading anchors.

### Content contract per section

Each major section should expose:

- stable `id` for deep links and TOC;
- short title (scan) distinct from internal working names;
- optional phase/label (Planning, Testing, …) when it aids orientation;
- body with one job;
- optional **practical test** (yes/no check a reviewer can apply);
- optional **example / scenario** (concrete, not metaphor-only);
- empty/error behaviour only when content is data-driven.

### Reading craft

- Cap sustained prose measure at about **45–75 characters** (target **~66ch** via `max-inline-size` / `ch`, not a fixed px width)—see web.dev typography.
- **One reading column:** headings, standfirst, body, callouts and practical-test blocks in a longread share the same content column. Do not put an intro in a full-width `shell` while the article below sits in a TOC + narrower column—align them on the same grid track.
- **Heading measure test:** a section `h1`/`h2` must not be capped to a much narrower width than its body (for example `max-width: 18ch` beside `42rem` prose) unless it is an intentional pull-quote. Artificial ch-caps that force awkward wraps and empty space on the right fail review.
- **Width consistency check (desktop):** with DevTools, compare the content box of the intro heading, body paragraphs, and the first article section—inline-start edges and content widths should match within a few pixels.
- One dominant action for the page; secondary links look secondary.
- Prefer semantic landmarks and heading order over card decoration.
- Cards are for interactive collections, not for dressing philosophy copy.
- Use `text-wrap: balance` on short headings; `text-wrap: pretty` on multi-line body paragraphs where supported.
- Below-fold heavy sections may use `content-visibility: auto` with `contain-intrinsic-size` so scrollbars stay stable.
- Motion clarifies hierarchy or progress only; respect `prefers-reduced-motion`.

## Sticky section navigation

- Build TOC from the same heading list that defines sections—no duplicate hand-maintained labels that can drift.
- Highlight the section in view with IntersectionObserver (or equivalent); keep links keyboard-operable.
- Sticky aside must sit in a stretched grid column; `align-items: start` on the parent often breaks sticky height.
- Do not trap focus; TOC is navigation, not a modal.

## Staged explainer (optional)

When content is best as short sequential stages rather than continuous prose:

1. Left (desktop): sticky visual or summary that updates with the active stage.
2. Right: stages 1–N with clear titles and one job each.
3. Mobile: stack art above each stage; do not rely on hover.
4. Keep stage copy **reader-facing**—never publish internal prompts, guardrail checklists, or agent instructions as page chrome.

## Improvement loop (existing page)

1. Run `page-craft-decision-loop.md` (context card → research → decide).
2. State the single job of the page in one sentence.
3. Inventory above-the-fold: brand/signal, one headline, one supporting line, one CTA group—remove competing jobs.
4. Check hierarchy, measure (~66ch), contrast, focus, touch targets, mobile TOC, and mobile reflow with real content. Run the **heading measure** and **width consistency** checks in Reading craft above.
5. Shortlist pattern and tool choices via `ui-ux-ecosystem-catalog.md` only for layers you will change.
6. Implement the smallest coherent change; verify rendered HTML, keyboard path, deep links (`scroll-margin`), and share metadata.
7. Log feedback (Defect / Ambiguity / Success / Out of scope) and strengthen the owning reference or `issue-resolution-patterns.md`.
8. Record accepted exceptions with owner and revisit trigger in the project profile—not in this reusable file.

## Boundaries

- Project brand tokens, editorial claims, legal wording, and screenshots stay in the consuming project.
- Inspiration galleries are for pattern study—not identity, layout, or copy cloning.
- Deployment remains a separate explicit action via the deployment asset.
