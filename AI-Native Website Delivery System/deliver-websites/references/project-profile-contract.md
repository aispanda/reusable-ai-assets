# Canonical project profile contract

Use one project-owned profile as the source for identity, audiences, staged capabilities, routes, navigation, metadata, social previews, sitemap inclusion, ownership, and external-service choices. Framework code consumes or derives from it; do not maintain parallel hand-written lists.

## Minimum sections

| Section | Owns |
|---|---|
| `site` | Name, promise, base URL, language, contact and primary action |
| `audiences` | Audience, situation, need, proof and desired action |
| `stages` | Launch, Grow, Community/Application scope and activation triggers |
| `content_types` | Schema, source, owner, approval, cadence and archive rule |
| `capabilities` | Enabled stage, status, dependency, cost/consent/security trigger |
| `theme` | Semantic design tokens, never component-specific colours |
| `routes` | Canonical path, archetype, content, metadata, visibility, navigation/footer inclusion and social alt |
| `services` | Analytics, search, forms, CMS, identity, community and hosting selections |
| `governance` | Decision owners, review dates, licences, provenance and accepted exceptions |

## Generation contract

The chosen implementation must generate or validate from the profile:

- route definitions and deep-link handling;
- header/footer navigation;
- per-route title, description, canonical URL and structured data;
- Open Graph/social preview data and image requirements;
- sitemap and robots inclusion/exclusion;
- content collection schemas and ownership;
- enabled optional modules and environment requirements.

The bundled static starter already generates routes, navigation, metadata, social-card placeholders, sitemap and robots from `site-profile.json`. Other frameworks must preserve the same one-source contract.

## Change control

1. Change the profile or its documented content source.
2. Validate unique paths, references, required metadata and legal/operational ownership.
3. Regenerate derived artifacts.
4. Review the diff; test representative routes and devices.
5. Approve and release through the project’s normal controls.

Never place secrets in the profile. Keep volatile environment values in deployment configuration and protected credentials in the selected secret store.
