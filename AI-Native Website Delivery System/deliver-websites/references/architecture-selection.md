# Architecture selection

Choose from capabilities and operating constraints before choosing a framework.

## Decision tree

1. Can every public page be generated ahead of time from files or a build-time content source?
   - Yes: use **static/content**.
   - No: continue.
2. Is the public page shell static while interaction happens safely in the browser without private secrets?
   - Yes: use **pre-rendered interactive**.
   - No: continue.
3. Does the site require authentication, protected data, transactions, personalisation, request-time content, untrusted uploads, or server-held secrets?
   - Yes: use **runtime/full-stack**.
4. If uncertainty remains, prototype the highest-risk flow and choose the simpler profile that passes it.

## Profiles

### Static/content — default

Best for landing pages, portfolios, campaigns, editorial sites, documentation, public reports, small catalogues, and story collections.

- Generate HTML per route.
- Use files or a build-time content source.
- Add JavaScript only for a material interaction.
- Serve through a static host or a small Nginx container.
- Lowest typical operating cost and failure surface.

Use the bundled starter for the smallest sites. Astro is a strong project-level option when content collections, component composition, or image tooling justify a framework.

### Pre-rendered interactive

Best for public directories, searchable collections, calculators, visual explorations, and data-rich interfaces whose public shell can be produced at build time.

- Pre-render every shareable route.
- Keep metadata and canonical URLs in initial HTML.
- Hydrate only interaction that requires it.
- Load public data deliberately and expose loading, empty, partial, and error states.

React Router pre-rendering or a static-first framework with client islands can fit. Confirm route enumeration and hosting fallback behaviour before implementation.

### Runtime/full-stack

Best for accounts, private dashboards, payments, write operations, personalisation, request-time permissions, workflows, or data that cannot be published at build time.

- Define trust boundaries and authorisation before UI expansion.
- Keep secrets server-side.
- Use managed identity, database, storage, and queue services only when a requirement needs them.
- Design idempotency, auditability, retries, rate limits, abuse handling, data retention, backup, and recovery.
- Budget for runtime operations and security maintenance.

## Rejection tests

Reject a proposed stack when:

- a static site is being turned into a server merely to use a preferred framework;
- client JavaScript is expected to fix metadata needed before JavaScript runs;
- an external CMS is added without a named editor and update workflow;
- authentication is proposed without protected content or user-specific actions;
- a database stores what version-controlled content files can own safely;
- an animation or component library materially increases payload for decorative effect;
- the team cannot operate, patch, or recover the chosen system.

## Decision record minimum

Record context, options, decision, reasons, costs, security/privacy effects, deployment effect, reversibility, and a review trigger.
