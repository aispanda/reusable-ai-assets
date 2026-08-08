# Page-craft decision loop

**Purpose:** Arrive at the best UI/UX for *this* page’s situation, requirement, need and context—then capture what was learned so the next consultation is stronger.

**Use for:** Any route craft or improvement (longread, principles, landing, hub, detail, policy, conversion). Topic-neutral. Brand tokens stay in the consuming project.

**Entry:** Always open this file when designing or improving a page under RA-006. Then open only the sibling references this loop selects (`single-page-craft.md`, `writing-craft.md`, `page-system.md`, `ui-ux-system.md`, `ui-ux-ecosystem-catalog.md`, `quality-gates.md`).

For **prose** changes (not layout), open `writing-craft.md` and select the content type before rewriting.

---

## Evolution loop (mandatory)

```text
Context → Research → Decide → Apply → Verify → Feedback → Strengthen asset → Reuse
```

Every consultation **must** end with a feedback action (even “no new defect”). Silent reuse without capture is a process failure.

| Step | Owner | Output |
|---|---|---|
| 1. Context | Agent + project facts | Filled context card (below) |
| 2. Research | Agent | Shortlist of primary sources + 3–7 applicable rules (cited) |
| 3. Decide | Agent (ask user only when brand/legal/cost/ship-bar changes) | Decision table: option → chosen → why → rejected |
| 4. Apply | Agent | Smallest coherent change in the consuming project |
| 5. Verify | Agent | `quality-gates.md` human checks + rendered page |
| 6. Feedback | Agent | Defect, ambiguity, or success note |
| 7. Strengthen | Agent | Update owning reference and/or add `WEB-###` in `issue-resolution-patterns.md` |

### Feedback taxonomy

| Type | When | Where to write |
|---|---|---|
| Defect | Something failed users or review | New or updated `WEB-###` + prevention check in the owning reference |
| Ambiguity | Two credible options; project must choose next time | Decision rule added to this file or `single-page-craft.md` |
| Success | Pattern worked under clear context | Promote into job→pattern router or checklist (do not only celebrate in chat) |
| Out of scope | Need belongs to another asset | Flag gap; do not invent a parallel website asset |

### Promotion rule

If the same feedback appears twice, or once with material risk, **strengthen automation or a gate**—not only the narrative table. Prefer checklist bullets, validators, and explicit fail tests.

---

## 1. Context card (fill before researching)

Copy into the project brief or session note; do **not** paste project brand names into this reusable file.

| Field | Prompt |
|---|---|
| Page job | One sentence: what must the visitor understand or do? |
| Audience priority | Leaders / technologists / builders / mixed (name the primary) |
| Page archetype | From `page-system.md` (landing, detail/long-form, hub, …) |
| Content shape | Narrative essay / numbered principles / staged explainer / policy / conversion |
| Proof available? | Working demo, asset, or evidence link—or none |
| Brand constraints | Existing tokens/fonts/components that must be preserved |
| Ship bar | “Best this week” vs “invest in distinctive craft” |
| Constraints | Legal, a11y target, performance budget, no-new-dependency, mobile-first, … |
| Success signal | How will we know the page worked? |

If the ship bar or brand lock is unresolved, make a reversible assumption, label it, and continue—do not block on fashion.

---

## 2. Research protocol

### Source order (prefer primary)

1. **Standards / platform:** [WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/), [MDN](https://developer.mozilla.org/), [web.dev typography](https://web.dev/learn/design/typography), [ARIA APG](https://www.w3.org/WAI/ARIA/apg/)
2. **Evidence-led UX research:** [NN/g long-form formatting](https://www.nngroup.com/articles/formatting-long-form-content/), [NN/g in-page links](https://www.nngroup.com/articles/in-page-links-content-navigation/), [NN/g how people read online](https://www.nngroup.com/articles/how-people-read-online/)
3. **Craft / implementation patterns:** docs-style sticky TOC + `scroll-margin` + IntersectionObserver (verify current articles against MDN); layout measure via `ch` / `max-inline-size`
4. **Inspiration only:** galleries in `ui-ux-ecosystem-catalog.md` — study pattern, never clone identity

### Research rules

- Re-check official URLs when the decision is load-bearing (a11y, measure, TOC behaviour).
- Cap research to what changes **this** page’s decision. Do not boil the ocean.
- Record for each chosen rule: source class (standard / research / craft), one-line claim, how it applies here.
- Reject blog fashion that conflicts with WCAG, project brand, or the page job.

### Baseline rules (pre-validated defaults)

Use these unless context contradicts them; cite the contradiction if you override.

| Topic | Default | Primary grounding |
|---|---|---|
| Body measure | ~45–75ch; target ~66ch via `max-inline-size` / `ch` | web.dev typography; Bringhurst via web.dev |
| Line height (prose) | Unitless ~1.5–1.7 | web.dev typography |
| Scanning | Clear H2s, front-loaded openings, lists/callouts for checkpoints | NN/g long-form + how people read |
| In-page nav | TOC from real headings; label “On this page”; jump links | NN/g in-page links |
| Sticky TOC | Desktop sticky; active section via IntersectionObserver; `scroll-margin-top` under sticky header | Craft consensus + MDN sticky/`scroll-margin` |
| Mobile TOC | Collapsible jump control—not a missing TOC | NN/g + mobile longread craft |
| Motion | Orient only; respect `prefers-reduced-motion` | WCAG / ui-ux-system |
| Progress chrome | Prefer TOC over reading-% bars unless ship bar asks for editorial flourish | Avoid sticky-chrome pile-up |
| Width consistency | One reading column for intro + body; no artificial heading ch-cap ≪ body | WEB-028 |
| Cards | Not for philosophy body; only for interaction containers | Project + single-page-craft |

---

## 3. Decide (context → pattern)

| Content shape | Open next | Prefer | Avoid |
|---|---|---|---|
| Numbered principles / method | `single-page-craft.md` philosophy row | Sutra/rule/test/example; sticky TOC; one column | Card grids of slogans |
| Narrative longread | `single-page-craft.md` longread | Standfirst, figures, related next | Explainer checklist voice |
| Staged explainer | `single-page-craft.md` staged | Sticky visual + stages | Publishing internal prompts |
| Landing / conversion | `page-system.md` + ui-ux-system | One promise, one CTA, proof | Hero clutter |
| Policy / trust | `page-system.md` trust | Summary, owner/date, detail | Sensational framing |

### Decision table template

| Decision | Options considered | Chosen | Why (context + source) | Rejected because |
|---|---|---|---|---|
| Measure | … | … | … | … |
| TOC placement | … | … | … | … |
| Mobile nav | … | … | … | … |
| Visual/hero | … | … | … | … |
| Typography | … | … | … | … |

Ask the human only when the choice changes brand identity, legal claims, paid dependency, ship bar, or irreversible IA.

---

## 4. Apply & verify

1. Implement the smallest coherent change set.
2. Preserve project tokens unless ship bar authorises distinctive craft.
3. Run applicable `quality-gates.md` checks, including reading-column / heading-measure tests.
4. Verify keyboard TOC, deep links under sticky header, mobile jump control, reduced motion.

---

## 5. Close-out checklist (every use)

- [ ] Context card completed (or labelled assumptions)
- [ ] Research notes: ≥1 primary source class used
- [ ] Decision table recorded in project session/brief (not in this file’s examples)
- [ ] Page verified against gates
- [ ] Feedback logged: Defect / Ambiguity / Success / Out of scope
- [ ] Asset strengthened **or** explicit “no change—rule already covered by WEB-### / section X”

---

## Worked pattern library (neutral)

These are **patterns**, not brand kits. Refresh claims against primary sources before treating as law.

### Philosophy / principles page (finalized defaults)

Grounding: NN/g scanning + TOC; web.dev measure; sticky TOC craft; WEB-028 width consistency.

1. Hero: one H1, one lede, optional orientation chip, one jump CTA—no stat strips.
2. Body grid: sticky “On this page” + single reading column (~66ch prose).
3. Intro (North Star) lives **in** the reading column, not a wider shell.
4. Each principle: phase label, title, short rule, **practical test** + **example** as scan checkpoints (NN/g midpoint/summary idea).
5. Mobile: `<details>` or equivalent jump list sticky under header.
6. Headings: `scroll-margin-top` ≥ sticky header height.
7. Close with related proof/assets CTA—not a second manifesto.

### Docs / reference long page

Left or right sticky TOC; 65–80ch main; avoid stacking sticky header + sticky TOC + sticky banner without `scroll-margin` and viewport budget.

---

## Relationship to other RA-006 files

| File | Role vs this loop |
|---|---|
| `SKILL.md` | Site-wide delivery; routes here for page craft |
| `single-page-craft.md` | Patterns and improvement loop steps |
| `ui-ux-ecosystem-catalog.md` | Tool/inspiration shortlist |
| `ui-ux-system.md` | Durable token/a11y/motion rules |
| `quality-gates.md` | Pass/fail checks |
| `issue-resolution-patterns.md` | Durable defect memory (`WEB-###`) |

This file owns the **decision process and evolution duty**. Sibling files own durable rules and patterns.
