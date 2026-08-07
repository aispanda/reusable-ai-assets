# Discovery, sharing, and media

## One canonical route registry

Maintain public route data in one source of truth. Generate or derive from it:

- application routes;
- header and footer navigation;
- canonical URLs;
- page titles and descriptions;
- Open Graph and Twitter/X tags;
- sitemap entries;
- structured data where relevant;
- share-card source mapping.

Do not maintain independent route lists that can drift.

## Initial HTML contract

Every indexable route must expose the following before client JavaScript runs:

- UTF-8 charset declared early in `<head>`;
- viewport;
- unique, useful `<title>`;
- concise meta description;
- absolute canonical URL;
- Open Graph `type`, `title`, `description`, `url`, `image`;
- image secure URL, MIME type, width, height, and alt text;
- Twitter/X `summary_large_image`, title, description, and image;
- structured data only when it truthfully matches visible content.

For production, use absolute HTTPS URLs. Do not allow client navigation to leave stale metadata in the DOM.

## Social images

- Default target: 1200×630 pixels, approximately 1.91:1.
- Use raster JPG or PNG for broad compatibility; verify WebP support against target platforms before relying on it.
- Keep important text and faces away from crop-prone edges.
- Keep text short and large; repeat the route's identity, not its entire description.
- Set file type metadata that matches the bytes.
- Optimise file size without visible degradation; use a project budget, commonly below 600 KB.
- Give each important route a relevant image. A deliberate section-level fallback is acceptable; an accidental homepage fallback is not.
- Test the absolute image URL without cookies, redirects, authentication, or bot blocking.

The bundled starter creates valid provisional route-specific PNGs. Replace them with approved editorial art before launch when share quality is important.

## Sitemap and robots

- Use the standard sitemap namespace and UTF-8.
- Include absolute canonical public URLs only.
- Exclude redirects, duplicate parameter variants, private routes, drafts, previews, search result states, and noncanonical pages.
- Keep the sitemap at the site root unless a larger site needs indexes.
- Reference the sitemap with an absolute URL in `robots.txt`.
- Keep sitemap and canonical signals consistent.
- Add `lastmod` only when the project can maintain it accurately.

An XML sitemap is primarily for machines; a plain browser tree without styling is normal. A human HTML site map is optional and useful only when it helps visitors navigate a complex site.

## Share controls

- Prefer native Web Share where available and provide a copy-link fallback.
- Share the canonical route, not tracking noise or temporary state.
- Encode titles and URLs safely.
- Do not make social-platform SDKs a requirement for basic sharing.
- If a carousel or interactive state is shareable, give it a stable URL and server-visible metadata.

## Cache and validation

Social networks cache previews. After deployment:

1. fetch page HTML with a crawler-like request and inspect tags;
2. fetch the image and validate status, MIME type, dimensions, and size;
3. test representative routes on target sharing debuggers or platforms;
4. request a re-scrape after material metadata/image changes;
5. remember that query-string cache busting is not a substitute for stable canonical metadata.
