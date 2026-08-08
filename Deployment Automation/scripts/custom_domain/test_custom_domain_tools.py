#!/usr/bin/env python3
"""Local tests for custom-domain helpers. Never contacts GCP or Spaceship."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import apply_dns  # noqa: E402
import export_dns_records  # noqa: E402


class ExportTests(unittest.TestCase):
    def test_records_from_mapping_cname(self) -> None:
        payload = {
            "status": {
                "resourceRecords": [
                    {"type": "CNAME", "name": "www.example.com.", "rrdata": ["ghs.googlehosted.com."]}
                ]
            }
        }
        recs = export_dns_records.records_from_mapping(payload)
        self.assertEqual(recs[0]["type"], "CNAME")
        self.assertEqual(recs[0]["cname"], "ghs.googlehosted.com")

    def test_host_label(self) -> None:
        self.assertEqual(export_dns_records.host_label("example.com", "example.com"), "@")
        self.assertEqual(export_dns_records.host_label("www.example.com", "example.com"), "www")


class ApplyTests(unittest.TestCase):
    def test_to_spaceship_items(self) -> None:
        items = apply_dns.to_spaceship_items(
            [
                {"type": "A", "name": "@", "address": "203.0.113.10", "ttl": 300},
                {"type": "CNAME", "name": "www", "cname": "ghs.googlehosted.com", "ttl": 300},
                {"type": "TXT", "name": "@", "value": "verify=abc", "ttl": 300},
            ]
        )
        self.assertEqual(items[0]["address"], "203.0.113.10")
        self.assertEqual(items[1]["cname"], "ghs.googlehosted.com")
        self.assertEqual(items[2]["value"], "verify=abc")

    def test_apex_domain(self) -> None:
        self.assertEqual(apply_dns.apex_domain({"hosts": ["www.example.com", "example.com"]}), "example.com")

    def test_manual_prints(self) -> None:
        plan = {
            "source": "cloud-run-domain-mapping",
            "hosts": ["example.com"],
            "registrar_hint": "other",
            "records": [{"type": "A", "name": "@", "address": "203.0.113.10"}],
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
            json.dump(plan, fh)
            path = fh.name
        proc = subprocess.run(
            [sys.executable, str(ROOT / "apply_dns.py"), "--plan", path, "--provider", "manual", "--dry-run"],
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertIn("203.0.113.10", proc.stdout)

    def test_spaceship_dry_run_no_network(self) -> None:
        plan = {
            "source": "cloud-run-domain-mapping",
            "hosts": ["example.com"],
            "records": [{"type": "CNAME", "name": "www", "cname": "ghs.googlehosted.com"}],
        }
        with mock.patch.dict("os.environ", {"SPACESHIP_API_KEY": "k", "SPACESHIP_API_SECRET": "s"}):
            apply_dns.apply_spaceship(plan, dry_run=True)


class PolicyTests(unittest.TestCase):
    def test_domain_map_script_forbids_alb_mention_in_help_path(self) -> None:
        text = (ROOT / "domain_map.sh").read_text(encoding="utf-8")
        self.assertIn("Never creates ALB", text)
        self.assertIn("domain-mappings", text)


if __name__ == "__main__":
    unittest.main()
