#!/usr/bin/env python3
"""Validate the Lean Decision Review Cell reusable-process package."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REQUIRED_FILES = (
    "ASSET.md",
    "README.md",
    "templates/REVIEW_PACKET.md",
    "references/role-cards.md",
    "references/guardrails-and-escalation.md",
    "references/evaluation-cases.md",
    "examples/fictional-review-packet.md",
)

REQUIRED_ASSET_MARKERS = (
    "# RA-010 — Lean Decision Review Cell",
    "## Outcome",
    "## Reuse boundary",
    "## Transfer manifest",
    "## Inputs and outputs",
    "## Use / transfer",
    "## Verification",
    "## Boundaries and limitations",
)

REQUIRED_PACKET_MARKERS = (
    "## 1. Work boundary",
    "## 2. Evidence available now",
    "## 3. Product-outcome review",
    "## 4. Experience and accessibility review",
    "## 5. Evidence and risk review",
    "## 6. Human decision",
    "## 7. Canonical links",
    "`ACCEPT` / `AMEND` / `DEFER`",
)


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    for relative_path in REQUIRED_FILES:
        candidate = root / relative_path
        if not candidate.is_file():
            errors.append(f"Missing required file: {relative_path}")

    asset_file = root / "ASSET.md"
    if asset_file.is_file():
        asset_text = asset_file.read_text(encoding="utf-8")
        for marker in REQUIRED_ASSET_MARKERS:
            if marker not in asset_text:
                errors.append(f"ASSET.md is missing marker: {marker}")

    packet_file = root / "templates/REVIEW_PACKET.md"
    if packet_file.is_file():
        packet_text = packet_file.read_text(encoding="utf-8")
        for marker in REQUIRED_PACKET_MARKERS:
            if marker not in packet_text:
                errors.append(f"REVIEW_PACKET.md is missing marker: {marker}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate the Lean Decision Review Cell package."
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Path to the Lean Decision Review Cell asset directory.",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    errors = validate(root)
    if errors:
        print("Lean Decision Review Cell validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Lean Decision Review Cell validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
