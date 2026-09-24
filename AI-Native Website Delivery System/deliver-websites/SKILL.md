---
name: deliver-websites
description: Turn an idea for a website on any topic into a staged, governed, buildable and launch-ready site. Use when discovering purpose or audiences, defining identity/content/capabilities, selecting architecture or current UI tools, designing page and component systems, building, improving responsive UX, implementing discovery/sharing, or performing pre-deployment QA. Do not use merely to deploy an already verified build; hand that work to the deployment asset.
---

# Deliver Websites

## Objective

Deliver the smallest coherent website system that achieves the user's goal and can grow without hardcoded duplication. Treat the consuming project's profile as the authority for identity, content, routes, services, and deployment values.

## Non-negotiable boundary

Keep this skill topic-neutral. Never copy a source project's names, domains, routes, screenshots, sensitive content, branding, cloud identifiers, or editorial assumptions into the reusable package. Derive general rules, then express examples with fictional neutral data.

## Workflow

For a reusable Google-login, role-request, commenting and editorial-publishing
capability, route to [deliver-blog-community](../deliver-blog-community/SKILL.md).
That extension is an installable local integration candidate; deployed consumer
acceptance and production readiness must be established separately.
Do not apply it as a replacement for an existing site without reviewing compatibility.

### 1. Inspect before proposing

Read repository instructions, current routes, build configuration, content sources, design tokens, tests, hosting contract, and recent user changes. Reuse established components and automation. Do not overwrite unexplained work or impose this starter on an existing coherent stack.

Resolve the project's configured Node/Python/package-manager/container runtimes before invoking them. In managed desktop environments, use the supplied dependency locator rather than assuming global commands or installing replacements.

For a new project, read `references/stakeholder-intake.md`, then begin with `assets/templates/WEBSITE_BRIEF.md`, `assets/templates/SITE_LAUNCH_INVENTORY.md`, and `assets/templates/SITE_PROFILE.example.json`. Ask only questions that change outcome, scope, architecture, risk, cost, ownership, or public identity.

### 2. Pass the discovery gate

Establish in short decision packets:

- website promise, audiences, proof and the single most important user action;
- measurable outcome and launch deadline;
- content types, owner, update frequency, and approval process;
- public, private, transactional, searchable, personalised, or real-time capabilities;
- legal, privacy, accessibility, safety, and localisation needs;
- domain, hosting target, budget, and operational owner.

If these facts are unresolved, make reversible assumptions in the brief and label them. Do not silently convert assumptions into infrastructure commitments.

Read `references/delivery-workflow.md` for phase gates and `references/risk-register.md` for risks.

### 3. Stage the product before selecting technology

Read `references/strategy-capability-inventory.md`. Put each relevant capability into Launch, Grow, Community/Application, or Not planned. Record the trigger that would justify a later capability; preserve an extension seam without building it now.

Use `assets/templates/SITE_LAUNCH_INVENTORY.md` as the concise decision/backlog record. Do not force accounts, comments, chat, a CMS, search, analytics, a database, or AI into launch without a named journey, owner, and acceptance evidence.

### 4. Choose the architecture before the framework

Read `references/architecture-selection.md`.

- Prefer the bundled static/content profile when pages can be generated before request time.
- Use a pre-rendered interactive profile when the public shell is static but richer client interaction is material.
- Use a runtime/full-stack profile only for capabilities that require server execution or protected state.

Record the decision in `assets/templates/ARCHITECTURE_DECISION.md`. Reject technology choices justified only by fashion or hypothetical future scale.

When a technology or component choice is needed, read only the relevant category in `references/ui-ux-ecosystem-catalog.md`. Browse current official documentation, shortlist at most three credible options, and explain recommendation, cost floor, scalability, AI-agent editability, lock-in/exit path, licence, and review trigger. Do not claim an option is “latest” or “best” without current evidence.

### 5. Design a page system, not a pile of pages

Read `references/page-system.md`. Select only the archetypes the user journey needs. A typical first launch uses five to seven routes, but route count follows capabilities and content—not a quota.

When the job is **one route** (longread, principles, essay, manifesto, policy brief, or landing slice)—or improving an existing page's UI/UX, content hierarchy, or presentation—read `references/page-craft-decision-loop.md` first (context → research → decide → apply → verify → feedback → strengthen). Then use `references/single-page-craft.md` and `references/ui-ux-ecosystem-catalog.md` as directed. When drafting or refining the **words** on that page (or insights, principles rows, ledes, microcopy), read `references/writing-craft.md`: pick the content type, apply universal practices, then the type recipe. Do not invent a parallel website asset for single-page or writing work. Every consultation must log feedback into `references/issue-resolution-patterns.md` and/or strengthen the owning reference.

Map each route to:

- audience intent;
- primary action;
- content model;
- page archetype;
- metadata and share image;
- owner and update cadence;
- empty, error, loading, and unavailable states where applicable.

Keep navigation shallow. Put repeated links and legal/trust destinations in the footer. Read `references/project-profile-contract.md`; generate or validate routes, navigation, footer, metadata, social previews, sitemap, and optional modules from one canonical project profile.

### 6. Establish the design contract

Read `references/ui-ux-system.md`. When creating or changing identity, also read `references/brand-identity-system.md` and `references/emotion-to-interface.md`. If strategy/feeling is not yet locked, hand off to RA-005 `brand-voice-identity-flow.md` first. Define approved brand and interface tokens before page-specific CSS. Require semantic HTML, keyboard operation, visible focus, sufficient contrast, readable line length, responsive images, stable layout, reduced motion, and touch-friendly controls.

Reuse components when their semantic contract matches. Do not force a visual component into the wrong information hierarchy. Add animation only when it clarifies state, sequence, or relationship.

### 7. Scaffold or implement

For a new static/content site:

```powershell
python scripts/scaffold_site.py --destination C:\path\to\new-site --profile C:\path\to\SITE_PROFILE.json
```

The scaffold is zero-dependency and emits per-route HTML, CSS, JavaScript, provisional route-specific 1200×630 PNG share cards, `sitemap.xml`, `robots.txt`, Cloud Run container files, and an audit command. Replace provisional share art with project-approved raster assets before public launch when visual quality matters.

For an existing site, preserve its stack and implement the same contracts locally: single route registry, source-driven navigation, route-specific server-visible metadata, responsive media, and release gates.

For an application profile, create only the thinnest vertical slice proving routing, data boundary, authentication/authorisation if needed, one representative success flow, and state/error handling before expanding.

### 8. Make discovery and sharing server-visible

Social and search crawlers must receive correct metadata in the initial HTML. Each public route needs a unique title, concise description, canonical URL, Open Graph type/title/description/url/image, image dimensions/type/alt, and Twitter/X large-image metadata. Use absolute HTTPS URLs in production.

Generate sitemap entries from canonical public routes. Exclude private, duplicate, filtered, preview, or noncanonical URLs. Reference the sitemap from `robots.txt`.

Read `references/discovery-sharing.md` before changing these systems.

### 9. Verify proportionately

Read `references/quality-gates.md`. Start with narrow build and route audits; expand to representative desktop, tablet, and mobile flows. Verify rendered pages, not only source files.

For the bundled starter:

```powershell
python scripts/audit_site.py C:\path\to\new-site --strict
```

Also perform human checks for hierarchy, copy clarity, visual crop, keyboard use, zoom, reduced motion, error recovery, and real-device sharing. Capture evidence only where it proves a gate.

### 10. Prepare deployment without deploying implicitly

Parameterise domain, cloud project, region, service, image repository, and environment values. Do not bake them into reusable files. Confirm container port, health behaviour, cache policy, secrets, rollback, and post-deploy checks.

Read `references/cloud-run-handoff.md`, then hand off to the deployment automation package. A user request to build or review is not permission to deploy.

### 10b. Custom domain readiness (after platform origin is verified)

When the site must serve on a human-owned hostname, read `references/custom-domain-launch.md`. Confirm canonical host, redirect policy, registrar (any provider; Spaceship is one option among many), and separate DNS/cloud approvals. Hand mapping and DNS mutation to **RA-002** `CUSTOM_DOMAIN.md`; do not change DNS from this skill.

### 11. Close the loop

Update the project profile, decision log, content owners, component registry, QA evidence, and known limitations. If a real failure or ambiguity can recur, add its general pattern to `references/issue-resolution-patterns.md` and promote repeated patterns into automation or a quality gate. Keep project facts and routine command history out of the reusable log.

For **page craft** work, also complete the close-out checklist in `references/page-craft-decision-loop.md` (feedback taxonomy + asset strengthen or explicit “already covered”).

## Human decisions that must remain explicit

- brand direction and tone;
- content truth, legality, privacy, and cultural fit;
- paid service activation;
- authentication and data-retention policy;
- analytics/advertising consent model;
- production deployment and DNS changes;
- registrar choice and custom-domain cutover;
- acceptance of launch risks.

## Resources

- `references/delivery-workflow.md`: phases, gates, roles, and outputs.
- `references/stakeholder-intake.md`: token-efficient, business-friendly discovery packets.
- `references/strategy-capability-inventory.md`: universal Launch/Grow/Community capability menu.
- `references/architecture-selection.md`: static, pre-rendered, and runtime routing.
- `references/project-profile-contract.md`: canonical profile and generated-artifact contract.
- `references/page-system.md`: page archetypes and default launch scope.
- `references/page-craft-decision-loop.md`: context → research → decide → apply → feedback → strengthen (mandatory evolution loop for every page consultation).
- `references/single-page-craft.md`: one-route longread, principles, essay, staged explainer, and page-improvement craft.
- `references/ui-ux-system.md`: design, responsive, component, and motion rules.
- `references/ui-ux-ecosystem-catalog.md`: topic-neutral research, inspiration, pattern and tool shortlist router.
- `references/brand-identity-system.md`: brand promise, voice, logo system, visual identity, rights and approval contract.
- `references/emotion-to-interface.md`: map accepted feelings to tokens, motion, imagery, microcopy and page moments.
- `references/discovery-sharing.md`: SEO, social previews, sitemap, canonical, and media.
- `references/quality-gates.md`: executable and human release gates.
- `references/risk-register.md`: recurring risks and mitigations.
- `references/cloud-run-handoff.md`: deployment contract.
- `references/custom-domain-launch.md`: registrar-agnostic custom-domain launch readiness and RA-002 handoff.
- `references/current-sources.md`: refreshable official-source register.
- `references/evaluation-cases.md`: three transfer evaluations.
- `references/issue-resolution-patterns.md`: recurring failures, resolved patterns and automation-promotion rule.
- `assets/templates/`: project-owned inputs and decision records.
- `assets/templates/SITE_LAUNCH_INVENTORY.md`: concise staged scope and open-decision record.
- `assets/templates/COMPONENT_REGISTRY.xlsx`: generic page, component, and route-contract register.
- `assets/starters/static-content/`: zero-dependency starter copied by the scaffold tool.
- `scripts/scaffold_site.py`: create a project from a profile.
- `scripts/audit_site.py`: inspect source and built output.
