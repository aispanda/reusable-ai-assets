#!/usr/bin/env python3
"""Smoke-test the reusable-asset scaffold and validator with a temporary library."""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    scripts = Path(__file__).resolve().parent
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        (root / "REUSABLE_ASSET_INVENTORY.md").write_text(
            "# Inventory\n\n| ID | Category | Asset | Use when | Record | Status | Verified |\n"
            "|---|---|---|---|---|---|---|\n",
            encoding="utf-8",
        )
        scaffold = [
            sys.executable,
            str(scripts / "scaffold_asset.py"),
            str(root),
            "--id",
            "RA-004",
            "--name",
            "Example Asset",
            "--category",
            "Test",
            "--keywords",
            "example, verification",
        ]
        subprocess.run(scaffold, check=True, capture_output=True, text=True)
        assert (root / "Example Asset" / "ASSET.md").is_file()
        inventory = (root / "REUSABLE_ASSET_INVENTORY.md").read_text(encoding="utf-8")
        assert "RA-004" in inventory and "Example%20Asset/ASSET.md" in inventory
        subprocess.run(
            [sys.executable, str(scripts / "validate_asset.py"), str(root)],
            check=True,
            capture_output=True,
            text=True,
        )
        contaminated = root / "Example Asset" / "private-example.md"
        contaminated.write_text("ProjectSecret and C:\\Users\\example\\keys.env", encoding="utf-8")
        policy = root / "public-validation-policy.json"
        policy.write_text(
            '{"forbidden_terms":["ProjectSecret"],'
            '"additional_secret_file_names":["private-provider.json"]}',
            encoding="utf-8",
        )
        public_gate = subprocess.run(
            [
                sys.executable,
                str(scripts / "validate_asset.py"),
                str(root),
                "--strict-clean",
                "--policy",
                str(policy),
            ],
            capture_output=True,
            text=True,
        )
        assert public_gate.returncode != 0
        assert "Hard-coded personal machine path" in public_gate.stdout
        assert "Forbidden project/private term" in public_gate.stdout
        (root / "private-provider.json").write_text("{}", encoding="utf-8")
        filename_gate = subprocess.run(
            [sys.executable, str(scripts / "validate_asset.py"), str(root), "--policy", str(policy)],
            capture_output=True,
            text=True,
        )
        assert filename_gate.returncode != 0
        assert "Forbidden secret-bearing path" in filename_gate.stdout
        (root / "private-provider.json").unlink()
        contaminated.unlink()
        subprocess.run(
            [
                sys.executable,
                str(scripts / "validate_asset.py"),
                str(root),
                "--strict-clean",
                "--policy",
                str(policy),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        duplicate = subprocess.run(scaffold, capture_output=True, text=True)
        assert duplicate.returncode != 0
    print("Asset scaffold/validator smoke test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
