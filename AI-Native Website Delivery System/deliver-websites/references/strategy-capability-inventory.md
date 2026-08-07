# Website strategy and capability inventory

This is a universal menu, not a mandatory backlog. Select only the rows that support the visitor journey. Store project selections in `SITE_LAUNCH_INVENTORY.md` and detailed route facts in the site profile.

## Product areas and capabilities

| Area | Capability / user outcome | Usual stage | Activate when | Minimum acceptance evidence |
|---|---|---|---|---|
| Positioning | Clear promise, audience, proof, and primary action | Launch | Always | A new visitor can explain the site and next action after one minute |
| Identity | Name, visual identity, voice, trust and provenance | Launch | New site or rebrand | Approved tokens, usage rules, ownership and source register |
| Navigation | Responsive shell, routes, footer and recovery | Launch | More than one page | Keyboard/mobile journey and 404 recovery pass |
| Publishing | Article, blog, guide, news, or story collection and detail | Launch if content-led | Repeatable long-form content exists | Draft/review/publish/correct/archive workflow works |
| Discovery | Metadata, canonical URLs, sitemap, structured data, search previews | Launch for public pages | Public discoverability matters | Initial HTML and preview validators agree with route registry |
| Trust | About/method, evidence, sources, corrections, privacy and contact | Launch | Credibility or data collection matters | Owner, provenance, review date and correction route visible |
| Conversion | Contact, inquiry, subscribe, book, apply, download, or buy | Launch when it is the goal | Visitor must commit or submit data | Expectations, consent, validation, success and recovery tested |
| Measurement | Privacy-aware analytics and outcome signals | Launch or Grow | A decision will use the data | Event purpose, consent, retention, owner and review cadence recorded |
| Source governance | Source-control identity, repository, backup ownership, MFA/recovery, licence and contribution rules | Before build | Any maintained site code or content exists | Authorized owners can recover access; secrets are absent; visibility/licence/roles are explicit |
| Portfolio | Work, case study, résumé, team, skills, services | Launch or Grow | Personal/professional credibility matters | Claims are evidenced; reusable detail archetype exists |
| Asset catalogue | Searchable/filterable tools, templates, code, documents, demos | Launch or Grow | Several reusable resources exist | Cards expose fit, status, licence, dependencies, demo and source |
| Live demonstration | Embedded or linked interactive proof | Launch or Grow | The work is better understood by trying it | Purpose, loading/error states, mobile/a11y, isolation and support owner pass |
| Knowledge map | Technology radar, topic map, collections or learning paths | Grow | Users need guided discovery or opinionated choices | Taxonomy, review date, recommendation evidence and change history visible |
| Site search | Find content across collections | Grow | Navigation/tags no longer find content quickly | Representative queries, no-result recovery and indexing rules pass |
| Localisation | Language/region variants | Grow | Named audience requires it | Translation ownership, locale URLs, metadata and fallback tested |
| CMS/editorial UI | Non-developers publish without code | Grow | Named editors and cadence justify operations | Roles, preview, approval, rollback and content export proven |
| Comments/discussion | Readers ask, correct, and discuss | Community | Moderation owner and demand exist | Identity, moderation, abuse, notification, retention and exit plan approved |
| Contributions | People submit assets/articles or collaborate | Community | Contribution model and reviewers exist | Licence, provenance, review, versioning, rejection and withdrawal work |
| Accounts/portal | Member-only identity, history, settings or content | Community/application | Private or personalised value exists | Authentication, authorisation, privacy, recovery, audit and support proven |
| Groups/chat | Synchronous or persistent community conversation | Community | Community operations can sustain it | Moderation, safety, retention, notification and incident processes staffed |
| Transactions | Payments, bookings, subscriptions or protected workflows | Application | Revenue or fulfilment requires it | Provider, reconciliation, idempotency, refunds, audit and recovery tested |
| AI assistance | Search, recommendation, generation, conversation or editing | Grow/application | It materially improves a named journey | Grounding, disclosure, privacy, evaluation, human control and fallback defined |

## Stage discipline

- **Launch:** prove identity, usefulness, trust, discoverability, and one primary action.
- **Grow:** improve discovery, depth, proof, measurement, and repeatable operations after observed demand.
- **Community:** add identity and participation only with moderation, safety, privacy, and operating ownership.
- **Application:** add protected state, transactions, workflows, or AI services through an explicit architecture/security decision.

Do not build accounts, databases, chat, comments, a CMS, or custom search merely because they may be useful later. Preserve extension seams and add them when the activation trigger is observed.
