#!/usr/bin/env python3
"""Isolated regression tests for the reusable website-delivery tools."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCAFFOLD = SKILL_ROOT / "scripts" / "scaffold_site.py"
AUDIT = SKILL_ROOT / "scripts" / "audit_site.py"
PROFILE = SKILL_ROOT / "assets" / "templates" / "SITE_PROFILE.example.json"


class DeliveryToolsTest(unittest.TestCase):
    def test_clean_scaffold_and_strict_audit(self) -> None:
        with tempfile.TemporaryDirectory(prefix="website-delivery-") as temporary:
            project = Path(temporary) / "site"
            scaffold = subprocess.run(
                [sys.executable, str(SCAFFOLD), "--destination", str(project), "--profile", str(PROFILE)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(scaffold.returncode, 0, scaffold.stdout + scaffold.stderr)
            audit = subprocess.run(
                [sys.executable, str(AUDIT), str(project), "--strict", "--allow-placeholder-domain", "--json"],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(audit.returncode, 0, audit.stdout + audit.stderr)
            result = json.loads(audit.stdout)
            self.assertTrue(result["ok"])
            self.assertEqual(result["routes"], 6)
            self.assertTrue((project / "dist" / "catalogue" / "cordless-drill" / "index.html").is_file())
            cards = sorted((project / "dist" / "social").glob("*.png"))
            self.assertEqual(len(cards), 6)
            hashes = {hashlib.sha256(card.read_bytes()).hexdigest() for card in cards}
            self.assertGreater(len(hashes), 1)

    def test_missing_share_card_fails(self) -> None:
        with tempfile.TemporaryDirectory(prefix="website-delivery-") as temporary:
            project = Path(temporary) / "site"
            subprocess.run(
                [sys.executable, str(SCAFFOLD), "--destination", str(project), "--profile", str(PROFILE)],
                capture_output=True,
                text=True,
                check=True,
            )
            (project / "dist" / "social" / "home.png").unlink()
            audit = subprocess.run(
                [sys.executable, str(AUDIT), str(project), "--allow-placeholder-domain"],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(audit.returncode, 0)
            self.assertIn("missing share image", audit.stdout.lower())

    def test_scaffold_refuses_nonempty_destination(self) -> None:
        with tempfile.TemporaryDirectory(prefix="website-delivery-") as temporary:
            project = Path(temporary) / "site"
            project.mkdir()
            (project / "owned.txt").write_text("preserve", encoding="utf-8")
            scaffold = subprocess.run(
                [sys.executable, str(SCAFFOLD), "--destination", str(project), "--profile", str(PROFILE)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(scaffold.returncode, 0)
            self.assertEqual((project / "owned.txt").read_text(encoding="utf-8"), "preserve")


if __name__ == "__main__":
    unittest.main(verbosity=2)
