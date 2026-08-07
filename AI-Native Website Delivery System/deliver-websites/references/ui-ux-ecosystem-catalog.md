# UI/UX ecosystem catalogue

This catalogue helps a non-specialist and an AI agent find credible tools without treating any fashionable stack as universal. It is a shortlist generator, not a lock file. Before selection, verify current version, maintenance, licence, accessibility, pricing, hosting constraints, security posture, and official documentation.

## Selection rule

1. Start from the required journey and architecture profile.
2. Reuse the consuming project's established system when it passes the quality gates.
3. For each relevant layer, shortlist at most three options: simplest fit, strongest accessible ecosystem, and credible alternative.
4. Explain business impact, cost floor, scalability, portability, AI-agent editability, and exit path.
5. Record the selected source, version, licence, reason, rejected finalists, and review trigger.

“AI can write the code” reduces implementation labour; it does not remove accessibility, licence, security, performance, maintainability, content, or operational risk. Prefer open files, standard formats, source-controlled components, clear APIs, and replaceable modules over opaque click-only systems.

## Architecture and content delivery

| Category | Options to consider | Best fit | Watch-outs / official sources |
|---|---|---|---|
| Plain static | Semantic HTML/CSS/JS; bundled Python starter | Small, stable sites with minimal dependencies | Manual component/content scaling; use web standards ([MDN](https://developer.mozilla.org/)) |
| Static/content frameworks | [Astro](https://docs.astro.build/), [Eleventy](https://www.11ty.dev/docs/), [Hugo](https://gohugo.io/documentation/) | Blogs, portfolios, content collections, documentation | Ecosystem/language fit; build-time content limits |
| React web frameworks | [Next.js](https://nextjs.org/docs), [React Router](https://reactrouter.com/home), [Remix](https://remix.run/docs) | React teams needing pre-rendering or runtime routes | Runtime complexity and hosting coupling vary; verify current modes |
| Other application frameworks | [Nuxt](https://nuxt.com/docs), [SvelteKit](https://svelte.dev/docs/kit), [Angular](https://angular.dev/overview) | Existing team ecosystem or application needs | Do not add solely for novelty |
| Docs systems | [Starlight](https://starlight.astro.build/), [Docusaurus](https://docusaurus.io/docs), [Nextra](https://nextra.site/) | Documentation and structured learning | Opinionated layouts; confirm content portability |
| Content authoring | Markdown, MDX, [Content Collections](https://docs.astro.build/en/guides/content-collections/) | Source-controlled, AI-editable publishing | Add editorial validation and media governance |
| CMS | [Decap CMS](https://decapcms.org/docs/), [Strapi](https://docs.strapi.io/), [Directus](https://docs.directus.io/), [Payload](https://payloadcms.com/docs), [Sanity](https://www.sanity.io/docs) | Named non-developer editors or structured multichannel content | Hosting, roles, backups, API cost, export and provider lock-in |

## Styling, primitives, and components

| Category | Options to consider | Best fit | Watch-outs / official sources |
|---|---|---|---|
| Styling/tokens | CSS custom properties, CSS Modules, [Tailwind CSS](https://tailwindcss.com/docs), [Panda CSS](https://panda-css.com/docs), [UnoCSS](https://unocss.dev/) | Semantic design tokens and consistent responsive implementation | Avoid literal-value sprawl and tool-specific lock-in |
| Accessible primitives | [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction), [React Aria](https://react-spectrum.adobe.com/react-aria/), [Headless UI](https://headlessui.com/), [Base UI](https://base-ui.com/), [Ark UI](https://ark-ui.com/) | Custom visual identity with behaviour/a11y foundations | Styling remains project work; test actual composition |
| Source-owned components | [shadcn/ui](https://ui.shadcn.com/docs) | AI-friendly React projects wanting editable local component code | It is a code distribution model, not a finished design system |
| Styled systems | [Material UI](https://mui.com/material-ui/getting-started/), [Mantine](https://mantine.dev/), [Chakra UI](https://chakra-ui.com/docs/get-started/installation), [Ant Design](https://ant.design/docs/react/introduce), [Carbon](https://carbondesignsystem.com/), [Fluent UI](https://react.fluentui.dev/) | Fast, consistent application UI | Distinctive brand may require substantial theming; payload/licence/version check |
| Utility component sets | [daisyUI](https://daisyui.com/docs/), [Flowbite](https://flowbite.com/docs/getting-started/introduction/), [PrimeReact](https://primereact.org/) | Fast conventional interfaces | Confirm accessibility, bundle, upgrade and visual sameness |
| Marketing/effect galleries | [Magic UI](https://magicui.design/docs/components), [Aceternity UI](https://ui.aceternity.com/components), [HyperUI](https://www.hyperui.dev/), [21st.dev](https://21st.dev/) | Selective inspiration or source-owned sections | Verify licence, copied dependencies, motion, performance and a11y; never clone a site |

## Interaction, media, and data

| Category | Options to consider | Best fit | Watch-outs / official sources |
|---|---|---|---|
| Motion | CSS, [Motion](https://motion.dev/docs), [GSAP](https://gsap.com/docs/v3/), [Lottie](https://airbnb.io/lottie/), [Rive](https://rive.app/docs/) | State, progress, sequence, or meaningful storytelling | Reduced motion, payload, licensing, distraction and input performance |
| 3D/immersive | [Three.js](https://threejs.org/docs/) | A core interactive demonstration | High complexity, device/GPU/accessibility fallback |
| Charts | [Observable Plot](https://observablehq.com/plot/), [Vega-Lite](https://vega.github.io/vega-lite/), [Apache ECharts](https://echarts.apache.org/en/index.html), [D3](https://d3js.org/), [Recharts](https://recharts.org/) | Evidence, trends, comparison and exploration | Provide text/table alternatives; test labels, colour and keyboard use |
| Diagrams/canvas | [React Flow](https://reactflow.dev/), [Cytoscape.js](https://js.cytoscape.org/), [Mermaid](https://mermaid.js.org/) | Interactive models, graphs, workflows or documentation | Choose DOM/accessibility vs graph scale; preserve source data |
| Icons | [Lucide](https://lucide.dev/), [Heroicons](https://heroicons.com/), [Phosphor](https://phosphoricons.com/), [Material Symbols](https://fonts.google.com/icons) | Consistent interface symbolism | Record licence; icons need accessible names when meaningful |
| Images/assets | Owned media, [Openverse](https://openverse.org/), [Unsplash](https://unsplash.com/), [unDraw](https://undraw.co/illustrations) | Supporting content and identity | Verify licence, attribution, consent, authenticity, crop and alt text |

## Discovery, measurement, community, and delivery

| Category | Options to consider | Best fit | Watch-outs / official sources |
|---|---|---|---|
| Static search | [Pagefind](https://pagefind.app/docs/) | Static sites with a moderate public corpus | Build-index size, language/tokenisation and update cadence |
| Hosted/self-hosted search | [Algolia DocSearch](https://docsearch.algolia.com/docs/), [Meilisearch](https://www.meilisearch.com/docs) | Large or richer search experiences | Pricing/hosting, privacy, relevance tuning and exit path |
| Analytics | [Plausible](https://plausible.io/docs), [Umami](https://umami.is/docs), [PostHog](https://posthog.com/docs), [Google Analytics](https://developers.google.com/analytics) | Measured outcomes and product learning | Collect only decision-useful data; consent, retention, region and cost |
| Discussion/comments | [GitHub Discussions](https://docs.github.com/en/discussions), [giscus](https://giscus.app/), [utterances](https://utteranc.es/) | Early community without a custom social backend | Platform identity, moderation, public data, accessibility and migration |
| Hosting | [GitHub Pages](https://docs.github.com/en/pages), [Cloudflare Pages](https://developers.cloudflare.com/pages/), [Vercel](https://vercel.com/docs), [Netlify](https://docs.netlify.com/), [Cloud Run](https://cloud.google.com/run/docs) | Match static/runtime needs, cost, region and existing automation | Pricing and limits change; deployment uses the dedicated deployment asset |

## Design research and inspiration

Use these to study patterns, not copy identity, wording, layout, code, or artwork:

- [Awwwards](https://www.awwwards.com/), [SiteInspire](https://www.siteinspire.com/), [Land-book](https://land-book.com/), [One Page Love](https://onepagelove.com/), [Lapa Ninja](https://www.lapa.ninja/) — visual/page-pattern discovery.
- [Mobbin](https://mobbin.com/) — product-flow pattern research; access/pricing may apply.
- [Thoughtworks Technology Radar](https://www.thoughtworks.com/radar) — opinionated, dated technology guidance.
- [Hugging Face Hub](https://huggingface.co/docs/hub/index) — searchable assets, cards, collections and live demos.
- [Vercel Templates](https://vercel.com/templates) — actionable template discovery and deployment pathways.
- [Simon Willison](https://simonwillison.net/) — searchable, tagged, practical publishing with durable URLs.
- [Stripe Engineering](https://stripe.com/blog/engineering) — evidence-led explanation of what, how, and why.

## Quality and governance toolchain

- Component documentation/testing: [Storybook](https://storybook.js.org/docs), [Chromatic](https://www.chromatic.com/docs/).
- Browser and accessibility automation: [Playwright](https://playwright.dev/docs/intro), [axe-core](https://github.com/dequelabs/axe-core), [Accessibility Insights](https://accessibilityinsights.io/docs/web/overview/).
- Performance: [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/), [PageSpeed Insights](https://pagespeed.web.dev/), [WebPageTest](https://docs.webpagetest.org/).
- Standards/security: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [MDN](https://developer.mozilla.org/), [Google Search Essentials](https://developers.google.com/search/docs/essentials), [Schema.org](https://schema.org/), [Open Graph](https://ogp.me/), [sitemaps.org](https://www.sitemaps.org/), [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/).

## Refresh triggers

Recheck official sources when selecting a tool, after six months, before a major upgrade, when maintenance/licensing/pricing changes, or when quality evidence fails. Record “last verified,” source URLs, and decision owner in the consuming project; this reusable catalogue deliberately does not pin volatile versions or prices.
