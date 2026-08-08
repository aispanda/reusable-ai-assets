#!/usr/bin/env python3
"""Apply a DNS plan JSON via a registrar adapter (spaceship) or print manual steps."""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


SPACESHIP_BASE = "https://spaceship.dev/api/v1"


def load_plan(path: str) -> dict[str, Any]:
    with open(path, encoding="utf-8") as fh:
        plan = json.load(fh)
    if not isinstance(plan.get("records"), list) or not plan["records"]:
        raise SystemExit("plan has no records[] — export from domain_map.sh --export-dns first")
    return plan


def apex_domain(plan: dict[str, Any]) -> str:
    hosts = plan.get("hosts") or []
    if not hosts:
        raise SystemExit("plan missing hosts[]")
    # shortest hostname is usually apex
    host = sorted((h.strip().rstrip(".") for h in hosts), key=len)[0]
    return host[4:] if host.startswith("www.") else host


def to_spaceship_items(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for rec in records:
        rr_type = (rec.get("type") or "").upper()
        name = rec.get("name") or "@"
        ttl = int(rec.get("ttl") or 3600)
        item: dict[str, Any] = {"type": rr_type, "name": name, "ttl": ttl}
        if rr_type in {"A", "AAAA"}:
            item["address"] = rec["address"]
        elif rr_type == "CNAME":
            item["cname"] = rec.get("cname") or rec.get("value")
        elif rr_type == "TXT":
            item["value"] = rec.get("value")
        elif rr_type == "ALIAS":
            item["aliasName"] = rec.get("aliasName") or rec.get("value")
        else:
            # pass through common value field; Spaceship may reject unknown types
            if "value" in rec:
                item["value"] = rec["value"]
            else:
                raise SystemExit(f"unsupported record type in plan: {rr_type}")
        items.append(item)
    return items


def spaceship_request(method: str, path: str, body: Any | None = None) -> tuple[int, str]:
    key = os.environ.get("SPACESHIP_API_KEY", "")
    secret = os.environ.get("SPACESHIP_API_SECRET", "")
    if not key or not secret:
        raise SystemExit("set SPACESHIP_API_KEY and SPACESHIP_API_SECRET")
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        SPACESHIP_BASE + path,
        data=data,
        method=method,
        headers={
            "X-API-Key": key,
            "X-API-Secret": secret,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Spaceship HTTP {exc.code}: {detail}") from exc


def apply_spaceship(plan: dict[str, Any], dry_run: bool) -> None:
    domain = apex_domain(plan)
    items = to_spaceship_items(plan["records"])
    payload = {"force": False, "items": items}
    if dry_run:
        print(json.dumps({"provider": "spaceship", "domain": domain, "would_put": payload}, indent=2))
        return
    try:
        status, body = spaceship_request("PUT", f"/dns/records/{urllib.parse.quote(domain)}", payload)
    except SystemExit as exc:
        msg = str(exc)
        if "HTTP 401" in msg or "HTTP 403" in msg or "HTTP 404" in msg:
            raise SystemExit(
                f"{msg}\nHint (DA-010): Spaceship may block non-allowlisted IPs. "
                "Re-run with --provider manual and paste records in the registrar UI."
            ) from exc
        raise
    print(json.dumps({"provider": "spaceship", "domain": domain, "http_status": status, "body": body or None}))


def apply_manual(plan: dict[str, Any], dry_run: bool) -> None:
    domain = apex_domain(plan)
    print(f"# Manual DNS for {domain} (registrar={plan.get('registrar_hint')})")
    print("# Add exactly these records from Cloud Run domain mapping:")
    for rec in plan["records"]:
        print(json.dumps(rec, sort_keys=True))
    if dry_run:
        print("# dry-run: nothing published")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", required=True, help="dns-plan.json from export_dns_records.py")
    parser.add_argument("--provider", choices=("spaceship", "manual"), default="manual")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    plan = load_plan(args.plan)
    if plan.get("source") != "cloud-run-domain-mapping":
        print("WARN: plan source is not cloud-run-domain-mapping", file=sys.stderr)

    if args.provider == "spaceship":
        apply_spaceship(plan, args.dry_run)
    else:
        apply_manual(plan, args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
