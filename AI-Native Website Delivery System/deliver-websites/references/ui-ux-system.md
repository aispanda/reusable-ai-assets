# UI/UX system

Use this file for durable design rules. When choosing a framework, primitive, component system, visual library, inspiration source, or QA tool, read only the relevant category in `ui-ux-ecosystem-catalog.md` and verify the finalist against current official sources.

## Design from tokens

Define semantic tokens before pages:

- colour roles: canvas, surface, text, muted text, border, accent, action, positive, warning, critical;
- typography roles: display, heading, body, label, code;
- spacing scale and container widths;
- radii, border, shadow, focus ring, and layer levels;
- motion duration/easing and reduced-motion alternatives;
- responsive breakpoints derived from content failure, not device brands.

Keep project values in a profile or token file. Components consume semantic roles, not literal colours or repeated pixel values.

## Hierarchy and conversion

- Lead with the visitor's problem and the value of continuing.
- Give each page one dominant action; secondary actions should look secondary.
- Use evidence near consequential claims and decisions.
- Prefer short, concrete headings and paragraphs with one job.
- Make card heights follow content; do not fill space with redundant copy merely to align a grid.
- Use whitespace to separate meaning, not to imitate luxury at the cost of scanability.

## Responsive behaviour

- Start with a narrow single-column flow, then enhance.
- Test at content breakpoints and representative 360px, 768px, 1024px, and wide desktop viewports.
- Prevent horizontal overflow except for intentional data views with an accessible alternative.
- Provide responsive image sources and explicit dimensions/aspect ratios.
- Convert dense comparison tables to cards only when row/column relationships remain understandable.
- Keep controls at least comfortably touchable and separated.
- Avoid fixed heights for text-bearing cards and heroes.

## Accessibility baseline

Target WCAG 2.2 AA unless the project requires more.

- semantic landmarks and heading order;
- keyboard access and visible, unobscured focus;
- skip link and meaningful link/button names;
- labels, instructions, error identification, and summary for forms;
- alt text based on the image's purpose; empty alt for decorative media;
- sufficient text/non-text contrast;
- zoom/reflow without loss of content or action;
- reduced motion and no autoplay that creates distraction or harm;
- status updates announced appropriately;
- accessible authentication if accounts exist.

## Motion and visual effects

Use motion to indicate continuity, state change, progress, spatial relationship, or attention priority. Keep it optional, short, and interruptible. Disable nonessential motion under `prefers-reduced-motion`.

Do not add a carousel, parallax, particle background, GIF, or animation library merely to make a page feel modern. If a carousel is justified, provide manual controls, pause, keyboard operation, labelled position, swipe support, stable height, and direct URLs for shareable slides.

## Component-source policy

Reuse sources in this order:

1. consuming project's established accessible components;
2. semantic platform HTML and small local components;
3. a maintained accessible primitive/component system;
4. visual-effect libraries only after payload, licence, motion, and accessibility review.

Treat component galleries as inspiration, not proof of production readiness. Record source, licence, version, accessibility contract, modifications, and upgrade owner.

## Human review

No automated score can decide whether the site is trustworthy, culturally appropriate, visually distinctive, emotionally effective, or honest. Review representative pages with real content and real images before broad implementation.
