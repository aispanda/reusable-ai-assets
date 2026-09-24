# Executable coverage and remaining gaps

The catalogue has 36 acceptance scenarios. Every row remains `UNPROVEN`: the
catalogue is reusable specification, not an execution report. `automationRef`
points to a real packaged suite with relevant assertions, often covering only a
portion of that row. A file existing, or a suite passing, does not prove every
actor, browser, failure variant, or consumer environment in the scenario.

`scripts/validate_contract.py --require-runtime` checks a versioned ESM manifest,
lockfile, nonempty entry point and concrete test files named by the runtime test
scripts. It does not install dependencies, validate JavaScript syntax, execute
tests, check licences, or authorize deployment. `runtimePackaged:true` means that
presence check passed. `runtimeReady` remains false in this validator, even when
the runtime is packaged. Existing deployments and newly added source changes must
have separate exact-version evidence.

## Test discovery map

Paths below are relative to `runtime/tests/`; names refer to existing test titles.
Rows grouped together share an actual test, not an inferred end-to-end result.

| Scenario IDs | Real suite / relevant test | Limit still requiring evidence |
| --- | --- | --- |
| AUTH-01 | `community-rules.test.mjs`, `AUTH-01 ROLE-04: fresh verified users can claim only Commenter without an invitation` | Real Google consent/login, reload and returning browser identity |
| AUTH-02 | Same suite, `AUTH-02: signed-out and unverified identities cannot register or read protected access` | OAuth cancellation, sign-out UX and previously signed-in browser |
| ROLE-01, ROLE-03 | Same suite, `ROLE-01 ROLE-03: each editorial role requires an Admin approval before access changes` | Browser request/approval controls and applicant reload |
| ROLE-02 | Same suite, `ROLE-02: cancellation and denial allow a fresh request without granting privileges` | Browser status truthfulness |
| ROLE-04 | Same suite, `ROLE-04: non-Admins cannot review another request, promote themselves, or forge reviewer identity` | Treat rules assertions as rules evidence, not all HTTP endpoints |
| ROLE-05 | Same suite, `ROLE-05: a retained session loses draft/comment rights after current access is revoked` | Publication HTTP denial with retained browser credentials |
| ROLE-06 | `firestore-rules.test.mjs`, `author cannot read or update another author's draft`; supplemental canonical-save authorization cases in `content-publishing.test.mjs` | Entire preview/trash/restore direct-API matrix |
| BLOG-01 | `content-publishing.test.mjs`, `canonical draft creation and updates are server-owned, authorized, and concurrency-safe`; title synchronization assertions in `studio-editor-ui.test.mjs` | Actual browser editing/reload and second authorized context |
| BLOG-02 | `content-publishing.test.mjs`, `production preview enforces the same publication readiness contract`, `publication validation produces a stable safe snapshot and rejects reserved slugs` | Browser invalid fields, focus and false-readiness prevention |
| BLOG-03 | Same suite, canonical-save rejection cases preserve the stored draft | Partial only: no network-outage/navigation/recovery browser scenario is established by these rejection tests |
| BLOG-04 | Same suite, `publisher creates an immutable release, live snapshot, index, audit event and live URL` | HTTP/anonymous access, real preview parity and absence of article-specific deployment require integration/browser evidence |
| BLOG-05, BLOG-06, BLOG-07 | Same suite, `Administrator completes the cloud draft lifecycle without exposing unpublished edits or losing release history`; `live pages serve validated frozen bytes and slug-changing republish creates a distinct release` | Other permitted actors, browser state and real public HTTP |
| BLOG-08 | Same suite, `unpublish removes the public snapshot while preserving draft and release history` | Actual confirmation cancellation and anonymous reload |
| BLOG-09 | Same suite, Administrator lifecycle includes archive/restore; canonical-save rejects archived drafts | Confirmation cancellation, direct editor links and each allowed actor |
| BLOG-10 | Same suite, `trash refuses a draft marked live even when its publication index is missing` | Actual disabled/hidden UI actions |
| BLOG-11 | Same suite, canonical-save conflicts and `publish rejects a preview receipt after a checkpoint save or template output change` | Two real sessions and successful corrected browser retry |
| BLOG-12 | Same suite, immutable-release test retries the same idempotency key and asserts one release | Reusing that key with changed payload needs separate explicit coverage |
| BLOG-13 | Same suite, `publication rejects unauthorized, stale and duplicate-slug requests without changing the draft` | Real concurrent requests need integration evidence |
| BLOG-14 | Same suite, canonical-save role/ownership denial, publication authorization denial and lifecycle viewer denial; supplemental Firestore rules | Complete verb-by-role/inactive/signed-out endpoint matrix |
| EDIT-01 | `studio-content-document.test.mjs`, supported migration and structured-content validation tests; `studio-editor-ui.test.mjs` supported-toolbar tests | Browser gestures, nested controls, undo/redo and saved/public parity |
| EDIT-02 | `studio-content-assets.test.mjs` credit upload validation; `studio-content-document.test.mjs` credit add/edit/clear, escaping and legacy hash preservation | Complete browser/Storage image upload, cancellation and save/preview/publish/unpublish lifecycle |
| EDIT-03 | `studio-youtube.test.mjs` URL variants, rejection and schema-version preservation; `http-lifecycle.test.mjs` v1-to-media-v2 save/read/reject/preview/publish/unpublish | Real editor insertion/edit/cancel gestures and approved provider behavior |
| EDIT-04 | `studio-media-browser.test.mjs` fresh Chromium desktop/320px public + DOMParser-hydrated preview; no request before consent, one no-autoplay player, mocked503 fallback, CSP/parent isolation | Real playback and embedding-disabled availability are not proven by mocked provider requests; other browser/assistive-technology combinations remain untested |
| EDIT-05 | `studio-content-document.test.mjs`, supported legacy conversion and generated `legacy migration fails closed for ...` cases; publication migration provenance tests supplement | Browser explicit conversion and rollback experience |
| EDIT-06 | `studio-editor-ui.test.mjs`, `title metadata sync preserves text, reports missing input, and respects disabled editing`; UTF-8 size assertions in document suite | Partial only: one mixed Devanagari title is not Latin/Devanagari/combining/emoji lifecycle or a browser/platform matrix |
| EDIT-07 | `studio-editor-ui.test.mjs`, toolbar keyboard/narrow-screen source assertions, roving navigation and focus helpers, title and destination assertions | Real 320-CSS-pixel viewport, keyboard/pointer behavior and dialogs |
| COM-01 | `community-rules.test.mjs`, `COM-01: eligible roles create public comments/replies while ownership records stay private` | Actual comment UI, anonymous rendering and identity display |
| COM-02 | Same suite, `COM-02: owners edit and tombstone their comment without destroying replies or ownership` | Browser cancel/confirm and agreed retention presentation |
| COM-03, COM-04 | Same suite, `COM-03 COM-04: only Admin can moderate another comment, and even Admin cannot rewrite it` | Moderator browser feedback |
| COM-05 | Same suite, `COM-05: signed-out, Viewer and inactive actors cannot mutate public discussion` | Browser denied action and ordinary public reading |
| COM-06 | Same suite, `COM-06: likes are actor-bound and coupled to their counter; only Publisher/Admin pin` | Real UI consistency and current environment execution |
| COM-07 | Same suite, `COM-07: empty/oversized body and forged public identity or metadata are rejected atomically`; server sanitization test in publication suite | Browser escaping of unsafe comment text; no XSS proof from body-size tests alone |

`runtime/tests/scenarios.test.mjs` is the selected-scenario driver. It must dispatch
real suites once per group and explicitly SKIP unmapped or unsupported coverage.
A driver SKIP is not a passed acceptance scenario. Its source and run report must
retain partial-layer labels. API/Firestore emulator tests may prove useful portions
without pretending they are real Google OAuth or consumer-browser tests.

## Compatibility and adoption

The existing `astro-firebase-cloud-run` profile remains supported for configuration.
`react-vite-flask+blog-service` selects the same standalone blog service beside an
existing React/Vite/Flask site. It does not select a Flask rewrite, React component
replacement, shared-user migration, reverse proxy, or established deployment.
Confirm route/origin ownership, identity boundary and target authority separately.

To claim full scenario acceptance, record actual version, environment, actors,
assertions, executable output, independent review, and cleanup. Do not mark all
36 PASS from static catalogue validation, test discovery or one source-site smoke.
Production release and clean second-site adoption remain distinct evidence gates.
