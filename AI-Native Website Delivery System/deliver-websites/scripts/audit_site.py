#!/usr/bin/env python3
"""Audit a generated static website for route, metadata, sitemap, and share-card integrity."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


class HeadParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title_parts: list[str] = []
        self.meta: dict[str, str] = {}
        self.links: dict[str, str] = {}
        self.h1_count = 0
        self.html_lang = ""

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): (value or "") for key, value in attrs}
        if tag == "html":
            self.html_lang = values.get("lang", "")
        elif tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta":
            key = values.get("property") or values.get("name")
            if key:
                self.meta[key.lower()] = values.get("content", "")
        elif tag == "link":
            rel = values.get("rel", "").lower()
            if rel:
                self.links[rel] = values.get("href", "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)


def canonical(base: str, route_path: str) -> str:
    return base.rstrip("/") + ("/" if route_path == "/" else route_path)


def output_path(dist: Path, route_path: str) -> Path:
    return dist / "index.html" if route_path == "/" else dist / route_path.strip("/") / "index.html"


def png_dimensions(path: Path) -> tuple[int, int] | None:
    try:
        data = path.read_bytes()[:24]
    except OSError:
        return None
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", data[16:24])


def local_image_path(dist: Path, image_url: str, base_url: str) -> Path | None:
    image = urlparse(image_url)
    base = urlparse(base_url)
    if image.scheme not in {"http", "https"} or image.netloc != base.netloc:
        return None
    relative = image.path.lstrip("/")
    candidate = (dist / relative).resolve()
    try:
        candidate.relative_to(dist.resolve())
    except ValueError:
        return None
    return candidate


def audit(root: Path, strict: bool, allow_placeholder_domain: bool) -> dict:
    root = root.resolve()
    dist = root / "dist"
    profile_path = root / "site-profile.json"
    errors: list[str] = []
    warnings: list[str] = []
    if not profile_path.is_file():
        return {"ok": False, "errors": [f"Missing {profile_path}"], "warnings": []}
    if not dist.is_dir():
        return {"ok": False, "errors": [f"Missing build directory {dist}"], "warnings": []}
    try:
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"ok": False, "errors": [f"Cannot parse profile: {exc}"], "warnings": []}

    site = profile.get("site", {})
    routes = profile.get("routes", [])
    base_url = str(site.get("base_url", ""))
    parsed_base = urlparse(base_url)
    if parsed_base.scheme != "https":
        errors.append("Production base_url must use HTTPS")
    if parsed_base.hostname and parsed_base.hostname.endswith(".invalid") and not allow_placeholder_domain:
        errors.append("Placeholder .invalid domain is not launchable")
    titles: set[str] = set()
    image_hashes: dict[str, str] = {}
    canonical_urls: list[str] = []
    required_meta = (
        "description", "og:type", "og:title", "og:description", "og:url", "og:image",
        "og:image:secure_url", "og:image:type", "og:image:width", "og:image:height", "og:image:alt",
        "twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt",
    )

    for route in routes:
        route_path = route.get("path", "")
        label = route_path or "<missing path>"
        html_path = output_path(dist, route_path)
        if not html_path.is_file():
            errors.append(f"{label}: missing route output {html_path}")
            continue
        raw = html_path.read_bytes()
        first = raw[:1024].lower()
        if b'<meta charset="utf-8"' not in first and b"<meta charset='utf-8'" not in first:
            errors.append(f"{label}: UTF-8 charset is not declared early in head")
        text = raw.decode("utf-8", errors="replace")
        parser = HeadParser()
        parser.feed(text)
        if not parser.html_lang:
            errors.append(f"{label}: html language is missing")
        if not parser.title:
            errors.append(f"{label}: title is missing")
        elif parser.title in titles:
            errors.append(f"{label}: duplicate document title {parser.title!r}")
        titles.add(parser.title)
        if parser.h1_count != 1:
            errors.append(f"{label}: expected one h1, found {parser.h1_count}")
        for key in required_meta:
            if not parser.meta.get(key):
                errors.append(f"{label}: missing {key}")
        expected_url = canonical(base_url, route_path)
        canonical_url = parser.links.get("canonical", "")
        canonical_urls.append(expected_url)
        if canonical_url != expected_url:
            errors.append(f"{label}: canonical mismatch ({canonical_url!r} != {expected_url!r})")
        if parser.meta.get("og:url") != expected_url:
            errors.append(f"{label}: og:url does not match canonical")
        if parser.meta.get("twitter:card") != "summary_large_image":
            errors.append(f"{label}: twitter:card must be summary_large_image")
        image_url = parser.meta.get("og:image", "")
        if parser.meta.get("twitter:image") != image_url:
            errors.append(f"{label}: Open Graph and Twitter image differ")
        image_path = local_image_path(dist, image_url, base_url)
        if image_path is None:
            errors.append(f"{label}: share image must be an absolute same-site URL")
        elif not image_path.is_file():
            errors.append(f"{label}: missing share image {image_path}")
        else:
            dimensions = png_dimensions(image_path)
            if parser.meta.get("og:image:type") == "image/png":
                if dimensions != (1200, 630):
                    errors.append(f"{label}: PNG share image must be 1200x630, got {dimensions}")
            if image_path.stat().st_size > 600 * 1024:
                warnings.append(f"{label}: share image exceeds 600 KB")
            image_hashes[label] = hashlib.sha256(image_path.read_bytes()).hexdigest()

    if len(image_hashes) > 1 and len(set(image_hashes.values())) == 1:
        errors.append("All routes use byte-identical share images; route-specific preview art is required")

    sitemap_path = dist / "sitemap.xml"
    if not sitemap_path.is_file():
        errors.append("Missing sitemap.xml")
    else:
        try:
            tree = ET.parse(sitemap_path)
            namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            locations = [element.text or "" for element in tree.findall("sm:url/sm:loc", namespace)]
            expected = [canonical(base_url, route["path"]) for route in routes if route.get("index", True)]
            if locations != expected:
                errors.append("sitemap.xml does not exactly match ordered canonical indexable routes")
        except (ET.ParseError, OSError) as exc:
            errors.append(f"Invalid sitemap.xml: {exc}")

    robots_path = dist / "robots.txt"
    expected_sitemap = f"Sitemap: {base_url.rstrip('/')}/sitemap.xml"
    if not robots_path.is_file():
        errors.append("Missing robots.txt")
    elif expected_sitemap not in robots_path.read_text(encoding="utf-8"):
        errors.append("robots.txt does not reference the canonical sitemap URL")

    unresolved = re.compile(r"\{\{[^}]+\}\}|\bCHANGEME\b|\bTODO:", re.IGNORECASE)
    for path in list(root.glob("*.json")) + list((root / "src").rglob("*")):
        if path.is_file() and path.suffix.lower() in {".json", ".html", ".css", ".js", ".md"}:
            try:
                if unresolved.search(path.read_text(encoding="utf-8")):
                    errors.append(f"Unresolved placeholder in {path.relative_to(root)}")
            except UnicodeDecodeError:
                pass

    if strict and warnings:
        errors.extend(f"Strict: {warning}" for warning in warnings)
    return {
        "ok": not errors,
        "routes": len(routes),
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default=".", type=Path)
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
    parser.add_argument("--allow-placeholder-domain", action="store_true", help="Permit reserved .invalid domains for isolated tests")
    parser.add_argument("--json", action="store_true", dest="json_output")
    args = parser.parse_args()
    result = audit(args.root, args.strict, args.allow_placeholder_domain)
    if args.json_output:
        print(json.dumps(result, indent=2))
    else:
        for item in result["errors"]:
            print(f"ERROR: {item}")
        for item in result["warnings"]:
            print(f"WARN: {item}")
        print(f"Audited {result.get('routes', 0)} routes: {'PASS' if result['ok'] else 'FAIL'}")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
