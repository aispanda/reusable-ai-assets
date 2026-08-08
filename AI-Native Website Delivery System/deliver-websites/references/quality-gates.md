# Quality gates

Do not call a site launch-ready until applicable gates pass.

## Automated gates

### Build and routing

- repository owner, backup administrator, MFA/recovery method, visibility and licence are recorded;
- source access follows least privilege; no personal password, recovery code, API key or deployment credential is committed;
- clean install/build from documented commands;
- build workspace and generated-output directories are writable by the approved runtime identity;
- no unresolved placeholders or secret-like values;
- every canonical route returns the intended initial HTML directly;
- refresh and deep-link behaviour works;
- 404 and server errors do not masquerade as successful pages;
- navigation, metadata, sitemap, and route output agree.

### Cloud release readiness

- release is classified as first deployment or repeat release;
- authenticated account and active project are checked independently;
- every mutating command receives the intended project explicitly;
- required APIs, image repository, service prerequisites and runtime tools are verified;
- repository visibility and public-source approval are recorded;
- commit author name/email match the approved project identity and privacy policy;
- authenticated Git principal is checked separately and has access to the intended repository owner;
- deployment uses a clean, identified remote revision;
- source publication, infrastructure, deployment and DNS approvals are tracked separately.
- public/private runtime access is explicit and the deployed route is tested anonymously when public access is intended.

### Document and discovery

- UTF-8 and viewport present;
- unique title, description, canonical, Open Graph, and Twitter/X data per route;
- absolute production URL and share-image URL;
- sitemap and robots valid;
- no accidental indexing of private/draft/duplicate routes;
- structured data validates where used.

### Accessibility

- automated accessibility scan has no serious/critical issue;
- valid landmark and heading structure;
- labels and names for controls;
- colour contrast and focus indicator checks;
- reduced-motion rule present when motion exists.

### Performance and resilience

- image dimensions and appropriate formats;
- no unexpected horizontal overflow;
- asset and JavaScript budgets respected;
- cache headers match asset mutability;
- no client console error or failed required request in representative flows;
- dependency and container vulnerability review proportionate to exposure;
- clean container installs receive the same package-manager policy files as local development; reviewed release-age exceptions name the exact package/version, never a global bypass.

### Security/privacy

- secrets absent from source and client bundles;
- every embedded demo uses an approved public fixture; browser bundles contain no proprietary schema, records, local paths or internal terminology;
- external scripts and data flows inventoried;
- forms validate server-side when a server exists;
- authentication and authorisation tested independently;
- CSP, transport, framing, referrer, permissions, and content-type policies considered;
- analytics/cookies match consent and privacy decisions.

## Human gates

Test representative pages at narrow mobile, tablet, laptop, and wide desktop widths.

- the first screen answers what this is, for whom, and what to do;
- hierarchy, spacing, line length, and imagery feel intentional;
- longread intro, headings and body share one reading column (~66ch prose)—no artificial heading `max-width` far narrower than body measure, and no full-shell intro misaligned from a TOC+article grid (`single-page-craft.md` / `page-craft-decision-loop.md`);
- sticky-header deep links: TOC jumps clear the header (`scroll-margin-top`);
- mobile longread: jump/TOC control usable at narrow widths (WEB-029);
- copy is accurate, concise, and not placeholder text;
- image crops work at all breakpoints;
- keyboard-only use reaches and activates everything;
- 200% zoom/reflow preserves content and action;
- touch targets are practical;
- forms explain requirements, errors, success, and recovery;
- loading, empty, partial, offline, unavailable, and error states are understandable where applicable;
- diagrams keep connectors, endpoint notation and selected paths legible at fitted and normal zoom;
- every standalone embedded tool provides a visible, keyboard-accessible return path to the host site;
- every action link reaches a distinct destination or produces a clear, testable change in URL, focus, visibility or state;
- public catalogues reconcile stable IDs, destinations and maturity labels with their approved canonical inventory;
- metadata preview matches the shared route on actual target platforms;
- privacy, legal, safety, cultural, and brand reviewers sign off where relevant.

### Brand and identity

- approved promise, personality, voice and visual-token source are recorded;
- logo/wordmark/compact/monochrome variants work at their intended sizes;
- public name, domain, metadata, favicon and social preview agree;
- if a custom domain is in scope: platform origin verified first; canonical host and redirect policy recorded; DNS/cloud domain approvals separate; cutover verified on the custom HTTPS origin (see `custom-domain-launch.md`);
- provenance and usage rights exist for fonts, icons, logos and imagery;
- a human owner approves confusing-similarity, cultural-fit and public-claim risk.

## Performance target

Use field data when available. A sensible public-site quality target is to meet Core Web Vitals at the 75th percentile: LCP no more than 2.5 seconds, INP no more than 200 milliseconds, and CLS no more than 0.1. Treat lab results as diagnostic, not a substitute for field experience.

## Release record

Record:

- build identifier and source revision;
- environment, time, and reviewer;
- automated commands and results;
- devices/browsers and routes sampled;
- accepted exceptions with owner and expiry;
- rollback target and trigger;
- explicit deployment approver.
