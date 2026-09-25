# Native Node host integration

Use `assets/integrations/node-blog.mjs` when the consumer already owns a Node HTTP
server and Firebase connections. Initialize the installed runtime with its explicit
runtime configuration and the consumer's existing db/auth/bucket objects, then call
`mountBlog({server, distRoot})`. In the host handler, return when the mount returns
true; otherwise continue existing routing. No second listener is required.

The mount owns account/editorial aliases, collection and story indexes, story pages,
content APIs, content images and Firebase auth helper routes. It delegates existing
packaged Astro assets only; unrelated host assets and APIs remain with the host.
Inspect collisions before activation. Host home/navigation/branding stay consumer-owned.

Install from an exact archive/version/SHA-256, build with the consumer's site and
collection profiles, and retain the archive hash in its lock/evidence. Never import
the developer's reusable checkout at runtime or edit files inside an installed release.
Keep an empty collection profile unless an explicit migration supplies existing
article assignments. Do not seed another site's collections or administrator identities.

Verify both public article rendering and preserved host APIs/routes. Run the API/rules
permission matrix against disposable emulator identities, and a small browser set for
sign-in persistence, creation/submission/review, media and administrator navigation.
Production smoke is read-only; isolated staging owns destructive lifecycle tests.

For same-image staging and production, build with `BLOG_PRODUCTION_PROJECT_ID`.
Pass actual environment/project facts to `loadBuiltProductionProfile`. Staging also
requires a consumer-owned `BLOG_APPROVED_STAGING_PROFILE` file containing exactly
`productionSiteOrigin`, `productionProjectId`, `siteOrigin`, `projectId`. The last
two identify the isolated staging target; all four must match the build and runtime.
Production rejects staging overrides. Native same-origin consumers must also require
`articleSiteOrigin === siteOrigin` to keep staging publications on staging.

Run `node --test scripts/node-blog.test.mjs` for adapter routing invariants. This does
not replace a consumer browser test or prove a successful hosted deployment.

Import `runEditorialBrowserJourney` from the installed
`runtime/tests/editorial-browser-journey.mjs` in the consumer's test wrapper.
The wrapper starts its real host with local Auth/Firestore emulators and built runtime;
pass its loopback `origin` and verified `packageSha256`. The shared journey exercises
administrator collections/users, author layouts, reload, explicit submission, read-only
review and anonymous publication. Optional `artifactDirectory` captures desktop/mobile
UI evidence outside the package. It refuses remote origins and credential files.
It creates UUID fixtures and cleans their records, including emulator release history.
Google-provider OAuth, real Storage uploads and production smoke need separate evidence.
