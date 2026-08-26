# Record workspace pattern

**Status:** Reusable pattern; shared descriptor, shell and related record presentation validated by three meaningfully different object consumers on 2026-08-10.

Use for business applications where people scan a collection, open one record, understand its context, and work with related information. Reuse the jobs and interaction rules—not another product's brand, chrome, wording, or code.

## Research-intent gate

Before external comparison or inspiration research, ask the consuming user:

1. What decision should this research inform?
2. What do you want researched for this project?
3. Which constraints, existing references or source boundaries must be respected?
4. What evidence is sufficient, and when should research stop?

Record named sources, product-specific observations and citations in the consuming project. Keep this reusable pattern limited to the generic method and rules that survive consumer validation. Do not silently broaden research beyond the agreed question.

## Core journey

```text
Open collection → narrow and scan → open record → understand state and context
→ review history/related evidence → take one safe next action → return without losing list context
```

The record's primary work dominates. Configuration, dashboards, multi-record tabs, inline bulk editing and alternate visualizations wait for evidence.

## Collection/list contract

1. Show object name, current view, result count and one primary action.
2. Put keyword search and the two or three highest-value filters first; keep advanced filtering secondary.
3. Use a semantic table for read/navigation-first lists. Default columns answer identity, state, urgency, owner/context and recency.
4. Make the primary identifier or subject an explicit link; do not rely only on whole-row clicks.
5. Preserve filter, sort, cursor/page and selected-record state in the URL or an explicit navigation contract.
6. Provide loading, empty, no-results, partial/stale and error states with recovery.
7. At narrow widths, preserve priority relationships in compact rows/cards rather than squeezing all desktop columns.
8. Add split preview only after standalone list and record routes pass.

## Record workspace contract

1. Start with Back-to-list, record identity, concise subject/title, status and priority/context highlights. Show one dominant action only when a real, authorised workflow exists. A read-only record may omit actions entirely; never add fake, disabled or decorative actions merely to fill the header.
2. Use a stable two-region desktop layout: primary history/work in the flexible main column; customer, ownership, SLA/processing and assistive context in a narrower rail. Stack main before context on small screens.
3. Make conversation/activity/history the default main view when resolving the record depends on chronology.
4. Use tabs for a small number of peer views with ready content. Use accordions inside a view for secondary field groups or related collections; never hide critical status or the primary action inside them.
5. Related-list headers show label, count, compact preview and `View all` only when a full collection exists. Empty lists state what is absent and whether it is expected or unavailable.
6. Assistance panels distinguish suggestion, evidence, processing, unavailable and error. Never style an unverified suggestion as an authoritative value.
7. Preserve list state when moving previous/next or returning to the collection.
8. When a related capability is deliberately deferred, use one concise unavailable or under-construction callout at the point of need. Do not create empty tabs, fabricated activity or repeated warnings across every field group.
9. Keep authoritative source content separate from synthesis. Record identity supplies the title; the original intake or initial message supplies description, source and sender when relevant. Label any AI generated summary separately with provenance, generated time and review state. A thin detail slice may expose the initial source record without pretending the full activity timeline exists.

### Communication timeline contract

1. Render one oldest to newest timeline when chronology is the primary work. Move the initial intake into the first timeline item instead of duplicating it in a separate description panel.
2. Show direction, channel, author or sender, occurrence time, body and meaningful delivery state. Put envelope details such as From, To and CC in a native disclosure when present.
3. Distinguish inbound, named human outbound and automated outbound messages with restrained semantic cues. Do not infer authorship from the record's current owner.
4. A Communication belongs to its parent record, while historical person involvement comes from normalized participant relationships with roles and address snapshots. Do not derive a person's activity solely from the parent record's current Contact or a mutable email string.
5. Derive cross record Contact totals through participant relationships and count distinct Communication identities. Keep provider thread identifiers, reply headers, template metadata and internal keys outside public projections.
6. Lifecycle milestones may appear only from authoritative history facts. Do not construct a synthetic status or assignment history from current row values.

## Object descriptor and shell contract

Use one accessible list shell and one record shell across object types, driven by a governed descriptor rather than copied page code.

The descriptor defines object identity and presentation metadata: stable object key, singular and plural labels, route identity, title and identifier fields, list columns, detail sections, field labels, display types, formatters, visibility rules and allowed relationship links. Record payloads contain values and relationships, not repeated labels or layout instructions.

The shell owns responsive layout, semantic structure, loading and unavailable states, focus behavior and accessibility. A generic field renderer may handle ordinary text, number, date, status, email, phone, long text and record links. Use typed extension slots for domain specific work such as conversation history, maps, charts or evidence panels. Do not force every object into a lowest common denominator form.

Start descriptors as reviewed, source controlled metadata compiled with the application. Move layout metadata into a database only when runtime administration, localization, tenant variation or role specific layouts are proven requirements. A layout descriptor is never a security boundary; the API or public projection must still allowlist fields and relationships.

Validate the contract with at least two meaningfully different object consumers before calling it stable. Fix generic defects in the descriptor or shell first, and keep domain language, values and special panels in the consuming project.

When two consumers repeat related record markup, extract a neutral related record presentation contract. The shell may own section title, count, empty state, row semantics and responsive layout. Each domain prepares the related record's primary link, subtitle, concise facts and optional badges. Do not turn relationships into generic strings or move domain joins into the renderer.

Temporary unavailable behavior has a lifecycle. Once every linked object in the approved slice has a real route, remove the construction dialog, obsolete state and fallback assertions in the same change. Do not leave dead capability code behind. Generic empty and not found copy should avoid assumptions about grammatical articles or object naming.

Place application wide disclosures and capability notes in one stable shell slot immediately after the page or record heading and before page specific work. Render the same component on list and detail routes. Do not bury global context in an object's side rail, where it appears object specific and moves according to content length.

Before adding a visible field, classify its source:

| Layer | Owns |
|---|---|
| Domain model and database | Authoritative values, relationships, lifecycle timestamps and business constraints |
| API or safe projection | Authorized joins, derived counts, display summaries and opaque public route keys |
| Object descriptor | Object labels, field labels, order, sections, display types, formats and allowed link behavior |
| Shared shell | Responsive structure, semantics, focus, loading, empty, unavailable and error behavior |
| Typed extension | Domain specific history, conversation, evidence, charts or other specialized work |

Do not store labels, layout instructions or demonstration counters on every business row. Do not treat hiding a descriptor field as authorization. Public route keys must be stable and unrelated to labels, list order or exposed internal identifiers.

## Token and implementation efficiency

1. Inspect the canonical model and one representative fixture before proposing fields. Add no decorative field merely to make a page look dense.
2. Build the first object as a thin vertical slice. Extract the shared descriptor and shell when the second meaningfully different object proves the repeated structure. Use a third consumer to test remaining field types and relationships. Extract repeated related record presentation only after two consumers expose the same structure.
3. Change labels, grouping and ordinary formats in the descriptor. Change responsive, accessibility or state behavior once in the shell. Keep specialized content in typed extension slots.
4. Unit test descriptor resolution once. Run one complete record journey per object and representative desktop, tablet and mobile layout checks; multiply cases only for distinct behavior or risk. Detect horizontal overflow by comparing the rendered document scroll width with its client width, not by checking only the CSS `overflow-x` value.
5. Derive safe related counts and summaries in the API or build projection. Do not add database columns or client recomputation when the value is not an authoritative business fact.
6. Feed a generic defect back here only after a consumer exposes it. Keep domain fields, copy, fixture values and screenshots in the consuming project.
7. When a new object makes a temporary fallback obsolete, delete the fallback and its tests immediately. Retaining unused interaction paths increases both implementation and future reasoning cost.

## MVP cut line

| Include now | Defer until evidence |
|---|---|
| One list view, keyword search, status/priority filters, deterministic sort | User-created views and advanced query builders |
| One record route with header, history, details and customer/context rail | Multi-record tabs, drag/drop and configurable layouts |
| Compact related summaries with honest empty/unavailable states | Bulk/inline edit, Kanban, charts and personalisation |
| Keyboard operation, responsive stack and preserved navigation state | Command palette, hover previews and AI-generated filters |

## Component and verification contract

Register: application shell, list toolbar, filter control, semantic table, mobile record row/card, record header, status/priority badge, activity item, context card, tabs, accordion/related section, skeleton, empty state, error notice and unavailable callout.

Verify 360, 768, 1024 and wide desktop layouts; keyboard filters/links/tabs/accordions; Back restores list context; and explicit zero-record, filtered-empty, no-related-record, delayed-panel and failed-panel states. Never invent related records, AI evidence, transaction status or integration success to fill a panel.

After each consumer test, classify findings as discovery, hierarchy, related-information density, state honesty, responsive behaviour, accessibility or performance. Fix a recurring generic defect here first; keep domain fields, terminology and visual tokens in the consuming project.
