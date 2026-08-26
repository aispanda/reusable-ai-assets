# Page system

Design reusable page archetypes and content models. Route names and counts belong to the project profile.

## Default launch scope

Most small public sites can launch with five to seven routes:

1. **Home/landing** — promise, proof, primary action, and onward paths.
2. **Primary hub** — services, products, resources, work, stories, or another core collection.
3. **Detail template** — one reusable article, service, product, case, profile, or resource page.
4. **Trust/method/about** — identity, approach, evidence, governance, or team.
5. **Contact/conversion** — contact, inquiry, booking, signup, or submission.
6. **Privacy/legal** — only the policies actually required, with owner and review date.
7. **Not found/error** — recovery path rather than a dead end.

This is a starting hypothesis, not a quota. A focused one-page launch may need fewer. A directory, documentation system, commerce site, or application may need more.

## Archetypes

| Archetype | Use when | Essential pattern |
|---|---|---|
| Landing | A visitor must understand value and choose a next action | Hero, credibility, pathways, objection handling, CTA |
| Collection/hub | Several related items need discovery | Intro, filters/categories when justified, cards/list, pagination or load strategy |
| Detail/long-form | One item needs depth and sharing | Clear title/deck, provenance, body, media, related items, next action — see `single-page-craft.md` for longread, principles, essay and staged-explainer craft |
| Listing/search | Users compare or locate records | Query/filter state, results count, sort, responsive table/cards, empty/error states |
| Conversion/form | A user submits information or commits | Expectation, minimal fields, validation, privacy, confirmation, recovery |
| Trust/policy | Users assess legitimacy or constraints | Plain-language summary, owner/date, source or policy detail, contact/correction path |
| Application/dashboard | Signed-in users act on state | Navigation, permissions, status, history, loading/empty/error/success states |
| Record workspace | Users scan a collection and work one record with related context | List toolbar + semantic table/mobile rows; record header + primary history + context rail + related sections; see `record-workspace-pattern.md` |

## Content contracts

Every route should have:

- stable ID and canonical path;
- navigation label distinct from page title when useful;
- title, concise description, and primary action;
- content model and owner;
- visibility/indexability status;
- Open Graph image and alt text;
- update/review date where trust depends on freshness;
- related-route relationships;
- state behaviour when data or content is absent.

## Navigation

- Keep the global header focused on the highest-frequency destinations and primary action.
- Use grouped menus only when they reduce scan load; ensure click, keyboard, touch, and escape behaviour.
- Preserve a direct path to home and a visible current location.
- Use the footer for the full durable map: core sections, trust/legal, contact, and sitemap.
- Do not duplicate the entire sitemap in the header.

## Components worth registering

- application shell, header, footer, breadcrumb;
- hero and trust strip;
- card/list/table and responsive alternate view;
- search, filter, sort, pagination;
- notice, status, badge, callout, empty/error/loading state;
- article chrome, table of contents, citation/source block;
- media figure, gallery, carousel only when multiple items warrant sequential browsing;
- form field, validation summary, confirmation;
- share controls and related-content block.

Register purpose, inputs, variants, responsive behaviour, accessibility contract, source of truth, and known pitfalls—not only a screenshot.
