#!/usr/bin/env python3
"""Build a small static website from site-profile.json using only the standard library."""

from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import struct
import sys
import zlib
from pathlib import Path
from urllib.parse import urljoin, urlparse


ROOT = Path(__file__).resolve().parents[1]
PROFILE_PATH = ROOT / "site-profile.json"
SRC = ROOT / "src"
DIST = ROOT / "dist"
MARKER = ROOT / ".website-delivery-starter"

REQUIRED_SITE = ("name", "tagline", "description", "base_url", "language")
REQUIRED_ROUTE = ("path", "title", "description", "heading", "intro")
THEME_KEYS = ("canvas", "surface", "text", "muted", "accent", "accent_text", "border")


def fail(message: str) -> None:
    raise SystemExit(message)


def load_profile() -> dict:
    if not PROFILE_PATH.is_file():
        fail(f"Missing profile: {PROFILE_PATH}")
    try:
        profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Cannot read profile: {exc}")
    site = profile.get("site", {})
    routes = profile.get("routes", [])
    theme = profile.get("theme", {})
    missing_site = [key for key in REQUIRED_SITE if not str(site.get(key, "")).strip()]
    if missing_site:
        fail(f"Missing site fields: {', '.join(missing_site)}")
    parsed = urlparse(site["base_url"])
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        fail("site.base_url must be an absolute HTTP(S) URL")
    if not isinstance(routes, list) or not routes:
        fail("routes must be a non-empty list")
    seen: set[str] = set()
    for route in routes:
        missing = [key for key in REQUIRED_ROUTE if not str(route.get(key, "")).strip()]
        if missing:
            fail(f"Route missing fields {missing}: {route}")
        path = route["path"]
        if path != "/" and (not path.startswith("/") or not path.endswith("/")):
            fail(f"Route paths must start and end with '/': {path}")
        if "?" in path or "#" in path or ".." in path:
            fail(f"Route path is not canonical: {path}")
        if path in seen:
            fail(f"Duplicate route path: {path}")
        seen.add(path)
        action = route.get("primary_action") or {}
        href = str(action.get("href", ""))
        if href.lower().startswith(("javascript:", "data:")):
            fail(f"Unsafe action URL on {path}")
    for key in THEME_KEYS:
        value = theme.get(key)
        if value is not None and not re.fullmatch(r"#[0-9a-fA-F]{6}", str(value)):
            fail(f"theme.{key} must be a six-digit hex colour")
    return profile


def e(value: object) -> str:
    return html.escape(str(value), quote=True)


def canonical(base: str, route_path: str) -> str:
    return base.rstrip("/") + ("/" if route_path == "/" else route_path)


def route_slug(path: str) -> str:
    if path == "/":
        return "home"
    return re.sub(r"[^a-z0-9]+", "-", path.strip("/").lower()).strip("-") or "page"


def route_output(path: str) -> Path:
    return DIST / "index.html" if path == "/" else DIST / path.strip("/") / "index.html"


def rgb(hex_colour: str) -> tuple[int, int, int]:
    value = hex_colour.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))  # type: ignore[return-value]


def mix(a: tuple[int, int, int], b: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    return tuple(round(a[i] * (1 - amount) + b[i] * amount) for i in range(3))  # type: ignore[return-value]


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def write_social_card(path: Path, route: dict, site: dict, theme: dict) -> None:
    width, height = 1200, 630
    background = rgb(theme.get("text", "#17201b"))
    accent = rgb(theme.get("accent", "#176b4d"))
    surface = rgb(theme.get("surface", "#ffffff"))
    seed = hashlib.sha256((route["path"] + site["name"]).encode("utf-8")).digest()
    raw = bytearray()
    title_units = [max(120, min(760, len(word) * 32)) for word in route["title"].split()[:4]] or [420]
    for y in range(height):
        raw.append(0)
        for x in range(width):
            colour = background
            if y < 18:
                colour = accent
            if x > 820:
                wave = (x + y * 2 + seed[y % len(seed)] * 3) % 180
                amount = 0.18 + (0.22 if wave < 32 else 0)
                colour = mix(background, accent, amount)
            if 92 <= x <= 142 and 92 <= y <= 102:
                colour = accent
            for index, units in enumerate(title_units):
                top = 190 + index * 56
                if 92 <= x <= 92 + units and top <= y <= top + 18:
                    colour = mix(surface, accent, 0.08 * index)
            if 92 <= x <= 92 + min(560, len(site["name"]) * 18) and 470 <= y <= 480:
                colour = accent
            raw.extend(colour)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + png_chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def apply_theme(css: str, theme: dict) -> str:
    for key in THEME_KEYS:
        if key in theme:
            css = re.sub(rf"(--{re.escape(key.replace('_', '-'))}:)\s*#[0-9a-fA-F]{{6}}", rf"\1 {theme[key]}", css)
    return css


def navigation(routes: list[dict], current_path: str) -> str:
    links = []
    for route in routes:
        if not route.get("show_in_nav", False):
            continue
        current = ' aria-current="page"' if route["path"] == current_path else ""
        label = route.get("nav_label") or route["title"]
        links.append(f'<li><a href="{e(route["path"])}"{current}>{e(label)}</a></li>')
    return "".join(links)


def footer_links(routes: list[dict]) -> str:
    links = []
    for route in routes:
        if route.get("show_in_footer", False):
            label = route.get("nav_label") or route["title"]
            links.append(f'<li><a href="{e(route["path"])}">{e(label)}</a></li>')
    return "".join(links)


def page_html(profile: dict, route: dict) -> str:
    site, routes = profile["site"], profile["routes"]
    page_url = canonical(site["base_url"], route["path"])
    slug = route_slug(route["path"])
    image_url = site["base_url"].rstrip("/") + f"/social/{slug}.png"
    document_title = route["title"] if route["path"] == "/" else f'{route["title"]} | {site["name"]}'
    action = route.get("primary_action") or {}
    action_html = ""
    if action.get("label") and action.get("href"):
        action_html = f'<a class="button" href="{e(action["href"])}">{e(action["label"])}</a>'
    sections = "".join(
        f'<section class="section-card"><h2>{e(section.get("heading", ""))}</h2><p>{e(section.get("body", ""))}</p></section>'
        for section in route.get("sections", [])
        if section.get("heading") or section.get("body")
    )
    robots = "index,follow" if route.get("index", True) else "noindex,nofollow"
    schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": route["title"],
        "description": route["description"],
        "url": page_url,
        "isPartOf": {"@type": "WebSite", "name": site["name"], "url": canonical(site["base_url"], "/")},
    }, ensure_ascii=False).replace("</", "<\\/")
    return f'''<!doctype html>
<html lang="{e(site["language"])}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(document_title)}</title>
  <meta name="description" content="{e(route["description"])}">
  <meta name="robots" content="{robots}">
  <link rel="canonical" href="{e(page_url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{e(site["name"])}">
  <meta property="og:title" content="{e(document_title)}">
  <meta property="og:description" content="{e(route["description"])}">
  <meta property="og:url" content="{e(page_url)}">
  <meta property="og:image" content="{e(image_url)}">
  <meta property="og:image:secure_url" content="{e(image_url)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{e(route.get("social_alt") or route["title"])}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(document_title)}">
  <meta name="twitter:description" content="{e(route["description"])}">
  <meta name="twitter:image" content="{e(image_url)}">
  <meta name="twitter:image:alt" content="{e(route.get("social_alt") or route["title"])}">
  <link rel="stylesheet" href="/assets/styles.css">
  <script type="application/ld+json">{schema}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="/">{e(site["name"])}</a>
      <nav class="site-nav" aria-label="Primary"><ul>{navigation(routes, route["path"])}</ul></nav>
    </div>
  </header>
  <main id="main">
    <article>
      <header class="hero"><div class="shell">
        <p class="eyebrow">{e(route.get("eyebrow", ""))}</p>
        <h1>{e(route["heading"])}</h1>
        <p class="lede">{e(route["intro"])}</p>
        {action_html}
      </div></header>
      <div class="shell sections">{sections}</div>
    </article>
  </main>
  <footer class="site-footer"><div class="shell footer-grid">
    <div><strong>{e(site["name"])}</strong><p class="footer-copy">{e(site["tagline"])}</p></div>
    <nav aria-label="Footer"><ul class="footer-links">{footer_links(routes)}</ul></nav>
    <p class="footer-meta">© <span>{e(site["name"])}</span>. Content ownership and update policy belong to the project.</p>
  </div></footer>
</body>
</html>
'''


def not_found_html(profile: dict) -> str:
    site = profile["site"]
    return f'''<!doctype html>
<html lang="{e(site["language"])}"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found | {e(site["name"])}</title><meta name="robots" content="noindex,nofollow">
  <link rel="stylesheet" href="/assets/styles.css">
</head><body><main id="main" class="shell not-found"><p class="eyebrow">404</p><h1>That page is not here.</h1>
<p class="lede">The address may have changed. Return home and choose another path.</p><a class="button" href="/">Go home</a></main></body></html>'''


def build() -> None:
    if not MARKER.is_file():
        fail("Starter marker is missing; refusing to replace dist")
    profile = load_profile()
    if DIST.exists():
        resolved = DIST.resolve()
        if resolved.parent != ROOT.resolve() or resolved.name != "dist":
            fail(f"Unsafe build directory: {resolved}")
        shutil.rmtree(resolved)
    (DIST / "assets").mkdir(parents=True)
    css = apply_theme((SRC / "styles.css").read_text(encoding="utf-8"), profile.get("theme", {}))
    (DIST / "assets" / "styles.css").write_text(css, encoding="utf-8")
    for route in profile["routes"]:
        output = route_output(route["path"])
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(page_html(profile, route), encoding="utf-8")
        write_social_card(DIST / "social" / f"{route_slug(route['path'])}.png", route, profile["site"], profile.get("theme", {}))
    (DIST / "404.html").write_text(not_found_html(profile), encoding="utf-8")
    public_routes = [route for route in profile["routes"] if route.get("index", True)]
    urls = "".join(f"  <url><loc>{e(canonical(profile['site']['base_url'], route['path']))}</loc></url>\n" for route in public_routes)
    sitemap = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n'
    (DIST / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    robots = f"User-agent: *\nAllow: /\n\nSitemap: {profile['site']['base_url'].rstrip('/')}/sitemap.xml\n"
    (DIST / "robots.txt").write_text(robots, encoding="utf-8")
    print(f"Built {len(profile['routes'])} routes in {DIST}")


if __name__ == "__main__":
    build()
