#!/usr/bin/env python3
"""Export Cloud Run domain-mapping DNS records to a registrar-neutral plan JSON."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any


def run_gcloud(args: list[str]) -> dict[str, Any]:
    cmd = ["gcloud", *args, "--format=json"]
    proc = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"gcloud failed ({proc.returncode}): {proc.stderr.strip() or proc.stdout.strip()}")
    raw = proc.stdout.strip()
    if not raw:
        return {}
    return json.loads(raw)


def records_from_mapping(payload: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    status = payload.get("status") or {}
    resource_records = status.get("resourceRecords") or payload.get("resourceRecords") or []
    for rr in resource_records:
        rr_type = (rr.get("type") or "").upper()
        name = rr.get("name") or "@"
        rrdata = rr.get("rrdata") or rr.get("rrdatas") or []
        if isinstance(rrdata, str):
            rrdata = [rrdata]
        for value in rrdata:
            item: dict[str, Any] = {"type": rr_type, "name": name, "ttl": int(rr.get("ttl") or 3600)}
            if rr_type in {"A", "AAAA"}:
                item["address"] = value
            elif rr_type == "CNAME":
                item["cname"] = value.rstrip(".")
            elif rr_type == "TXT":
                item["value"] = value
            else:
                item["value"] = value
            out.append(item)
    return out


def host_label(fqdn: str, apex_guess: str | None) -> str:
    fqdn = fqdn.rstrip(".")
    if apex_guess and (fqdn == apex_guess or fqdn.endswith("." + apex_guess)):
        if fqdn == apex_guess:
            return "@"
        return fqdn[: -(len(apex_guess) + 1)]
    # best-effort: leftmost label, or @ if single label
    parts = fqdn.split(".")
    return "@" if len(parts) <= 2 else parts[0]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--region", required=True)
    parser.add_argument("--hosts", required=True, help="Comma-separated hostnames")
    parser.add_argument("--registrar", default="other")
    parser.add_argument("--canonical", default="")
    args = parser.parse_args()

    hosts = [h.strip() for h in args.hosts.split(",") if h.strip()]
    if not hosts:
        raise SystemExit("no hosts provided")

    # Prefer longest hostname as apex candidate for relative names
    apex = sorted(hosts, key=len)[0]
    if apex.startswith("www."):
        apex = apex[4:]

    all_records: list[dict[str, Any]] = []
    mappings: list[dict[str, Any]] = []
    for host in hosts:
        payload = run_gcloud(
            [
                "beta",
                "run",
                "domain-mappings",
                "describe",
                f"--domain={host}",
                f"--region={args.region}",
                f"--project={args.project}",
            ]
        )
        mappings.append({"host": host, "raw_status": (payload.get("status") or {})})
        for rec in records_from_mapping(payload):
            # Normalize name to registrar-relative when Google returns FQDN
            name = rec.get("name") or "@"
            if name not in {"@", "*"} and "." in name:
                rec["name"] = host_label(name.rstrip("."), apex)
            all_records.append(rec)

    plan = {
        "version": 1,
        "source": "cloud-run-domain-mapping",
        "project": args.project,
        "region": args.region,
        "registrar_hint": args.registrar,
        "canonical": args.canonical or None,
        "hosts": hosts,
        "records": all_records,
        "mappings": [{"host": m["host"]} for m in mappings],
    }
    json.dump(plan, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
