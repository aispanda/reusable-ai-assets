# RA-006 - AI-Native Website Delivery System

| Metadata | Value |
|---|---|
| Category | Engineering / Web Delivery |
| Select when | A person or team has an idea for a website on any topic and needs business-friendly help to define the purpose, audiences, brand, content, staged capabilities, architecture, UI/UX, build, QA, launch, or later evolution. |
| Entry point | `deliver-websites/SKILL.md` |
| Status | Pilot-ready v1.2; expanded independent evaluation pending |

## Outcome

Turn a plain-language website idea into a staged, scoped, responsive, accessible, discoverable, and deployment-ready website system. The asset collects stakeholder intent in short decision packets, chooses only the capabilities needed now, shortlists current tools from official sources, selects the lightest suitable architecture, drives routes/navigation/metadata/social previews/sitemap from one project profile, and applies release gates before deployment.

## Why this is a separate asset

This package owns website-specific delivery: information architecture, page and component patterns, design systems, implementation profiles, content models, metadata, accessibility, performance, testing, and launch readiness.

It composes with, but does not duplicate:

- `RA-005 AI-Native Rapid Solution Delivery Kit` for broader discovery, governance, and build authorization;
- `RA-004 Model-Routing Template` for cost-aware AI model selection; and
- `RA-002 Deployment Automation` for controlled cloud deployment and post-deploy verification.

## Reuse boundary

### Reusable core

- architecture and page-system selection rules;
- project profile and brief contracts;
- responsive design and component guidance;
- business-friendly stakeholder intake, strategy and staged-capability inventory;
- broad, refreshable catalogue of frameworks, design systems, components, inspiration sources, and QA tools;
- one-profile generation/validation contract;
- static/content starter and scaffolding tools;
- SEO, social-preview, sitemap, accessibility, performance, and release audits;
- launch gates and risk register.

### Project profile

Every consuming project supplies its own name, domain, audience, goals, routes, content, visual identity, legal requirements, analytics choices, external services, cloud project, region, service name, and secrets.

### Evidence

Research notes, screenshots, test reports, stakeholder approvals, analytics exports, and deployment logs stay in the consuming project.

### Excluded

No real organisation name, domain, route, editorial copy, allegation, person, screenshot, credential, cloud identifier, or production data belongs in this asset. Examples are fictional and neutral.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `deliver-websites/SKILL.md` | Agent workflow and routing | Reusable core |
| `deliver-websites/references/` | Decisions, patterns, gates, and current-source register | Reusable core |
| `deliver-websites/scripts/scaffold_site.py` | Create a neutral starter from a project profile | Reusable core |
| `deliver-websites/scripts/audit_site.py` | Audit source/build output before launch | Reusable core |
| `deliver-websites/scripts/test_delivery_tools.py` | Isolated regression tests | Reusable core |
| `deliver-websites/assets/templates/` | Brief, profile, decision, content, and release templates | Reusable core copied into a project profile |
| `deliver-websites/references/stakeholder-intake.md` | Short business-friendly decision packets and answer format | Reusable core |
| `deliver-websites/references/strategy-capability-inventory.md` | Universal staged website product/capability menu | Reusable core |
| `deliver-websites/references/ui-ux-ecosystem-catalog.md` | Refreshable framework, component, design, inspiration, QA and delivery option catalogue | Reusable core |
| `deliver-websites/references/brand-identity-system.md` | Brand promise, voice, logo system, visual identity, rights and acceptance contract | Reusable core |
| `deliver-websites/references/issue-resolution-patterns.md` | Reusable failure patterns, resolutions and automation-promotion rule | Reusable core |
| `deliver-websites/references/project-profile-contract.md` | One-source contract for routes, navigation, metadata, sharing, sitemap and modules | Reusable core |
| `deliver-websites/assets/templates/SITE_LAUNCH_INVENTORY.md` | Token-efficient project strategy, capability, route and decision record | Reusable core copied into a project profile |
| `deliver-websites/assets/templates/COMPONENT_REGISTRY.xlsx` | Generic page, component, and route contracts | Reusable core copied and adapted per project |
| `deliver-websites/assets/starters/static-content/` | Zero-dependency content-site starter | Optional reusable starter |
| `deliver-websites/examples/AI_PROFESSIONAL_PUBLIC_PROOF_PROFILE.md` | Illustrative staged profile for articles, engineering philosophy, reusable assets and live demos | Example profile; not universal product law |

## Inputs and outputs

Minimum inputs:

- website idea, desired outcome, audience(s), proof and primary action;
- launch identity/content hypothesis and staged capability choices;
- primary user action;
- content ownership and update frequency;
- required capabilities, integrations, and compliance constraints;
- domain and intended hosting environment;
- launch deadline and approval owner.

Outputs:

- approved website brief and architecture decision;
- staged product/capability inventory with activation triggers and `not now` seams;
- evidence-backed technology/component shortlist with licences, costs, risks and review triggers;
- route and content model;
- design tokens and component map;
- responsive implementation or project-specific scaffold;
- route-specific document metadata, social previews, canonical URLs, sitemap, robots file, and structured data where relevant;
- automated and human QA evidence;
- deployment-ready handoff to the selected deployment system.

## Use / transfer

1. Read `deliver-websites/SKILL.md`; use `references/stakeholder-intake.md` to complete the discovery gate without a long questionnaire.
2. Select launch/later capabilities from `references/strategy-capability-inventory.md` into `assets/templates/SITE_LAUNCH_INVENTORY.md`.
3. Choose a delivery profile using `references/architecture-selection.md`; consult `references/ui-ux-ecosystem-catalog.md` only for layers the project needs and recheck official sources before locking choices.
4. Copy and complete `assets/templates/SITE_PROFILE.example.json` and the relevant brief/decision templates. Follow `references/project-profile-contract.md` so derived route artifacts cannot drift.
   Copy `COMPONENT_REGISTRY.xlsx` when the site has enough repeated UI to benefit from a governed registry.
5. For a content-first site, run `scripts/scaffold_site.py`; for an application profile, use the skill's architecture contract and the consuming repository's established stack.
6. Implement only approved page archetypes and components.
7. Run `scripts/audit_site.py`, project tests, responsive checks, accessibility checks, and the release checklist.
8. Hand the verified build to deployment automation. Deployment remains a separate explicit action.

For a worked strategy example, open `deliver-websites/examples/AI_PROFESSIONAL_PUBLIC_PROOF_PROFILE.md`. Do not load or copy it when it does not match the new project.

## Dependencies, cost and licensing

- Core scripts use Python 3.11+ standard library only.
- The bundled starter produces static HTML, CSS, JavaScript, PNG social-card placeholders, sitemap, and robots files without package installation.
- Cloud Run hosting, domain registration, DNS, analytics, email, databases, authentication, monitoring, and third-party UI libraries can incur external cost and remain project choices.
- Any copied component, font, icon, image, or library must have its licence recorded in the consuming project.

## Verification

- Skill structure: `quick_validate.py deliver-websites`
- Asset structure: `validate_asset.py <asset-library-root>`
- Tool regression: `python deliver-websites/scripts/test_delivery_tools.py`
- Clean scaffold: create a temporary site, build it, and run `audit_site.py --strict`
- Content boundary: search this asset for production names, domains, credentials, and source-project terminology before release.
- Three evaluation cases are defined in `deliver-websites/references/evaluation-cases.md`; rerun them before promoting v1.1 from pilot-ready.

## Boundaries and limitations

- The static starter is the default only for content, campaign, brochure, documentation, portfolio, and editorial sites whose published pages can be generated ahead of time.
- Authentication, private data, transactions, personalised responses, real-time collaboration, untrusted uploads, or complex search require an application architecture and security review.
- Automated checks cannot replace human review of brand fit, content accuracy, legal duties, privacy, safeguarding, visual quality, or real-device usability.
- No deployment, DNS change, data migration, destructive operation, public post, or paid-service activation is authorised merely by using this asset.

## Provenance and generalisation

The method was extracted from a real content-led website delivery project, then stripped of its topic, routes, branding, people, claims, and cloud identifiers. That source project's UI/UX rules covered implementation well—tokens, layout, components, motion, accessibility, performance, and live documentation lookup—but did not own universal website strategy, staged capability planning, content/community evolution, canonical project-profile governance, transfer packaging, or cross-ecosystem selection. Those gaps now live in this reusable asset; source-project files remain evidence and an example consumer, not dependencies.
