#!/usr/bin/env python3
"""Validate the reusable interface-state evidence package and an optional consumer profile."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ASSET_DIR = Path("Interface State Evidence System")
REQUIRED_ASSET_FILES = (
    "ASSET.md",
    "README.md",
    "templates/UI_CONTEXT_PACKET.md",
    "templates/STATE_CONTRACT.md",
    "templates/PROJECT_PROFILE.example.json",
    "references/evidence-model.md",
    "references/originality-and-data-boundary.md",
    "examples/generic-profile.json",
)
REQUIRED_PROFILE_KEYS = ("schemaVersion", "project", "sourceOfTruth", "adapter", "surfaces", "verification", "boundaries")
REQUIRED_SURFACE_KEYS = ("id", "label", "componentPath", "fixturePath", "contextPacket", "stateContract", "states")


def issue(errors: list[str], text: str) -> None:
    errors.append(text)


def validate_profile(profile_path: Path, errors: list[str]) -> None:
    try:
        value = json.loads(profile_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        issue(errors, f"Profile not found: {profile_path}")
        return
    except json.JSONDecodeError as exc:
        issue(errors, f"Invalid JSON in {profile_path}: {exc}")
        return

    if not isinstance(value, dict):
        issue(errors, "Profile root must be an object")
        return

    for key in REQUIRED_PROFILE_KEYS:
        if key not in value:
            issue(errors, f"Profile missing required key: {key}")

    if value.get("schemaVersion") != "1.0":
        issue(errors, "Profile schemaVersion must be '1.0'")

    adapter = value.get("adapter")
    if isinstance(adapter, dict):
        for key in ("kind", "configPath", "storyOrFixtureRoot", "importsProductionStyles"):
            if key not in adapter:
                issue(errors, f"Profile adapter missing required key: {key}")
        if adapter.get("importsProductionStyles") is not True:
            issue(errors, "Profile adapter must declare importsProductionStyles: true")
    elif adapter is not None:
        issue(errors, "Profile adapter must be an object")

    boundaries = value.get("boundaries")
    if isinstance(boundaries, dict):
        for key in ("syntheticFixturesOnly", "noCredentials", "noProductionData", "releaseRequiresSeparateApproval"):
            if boundaries.get(key) is not True:
                issue(errors, f"Profile boundaries must declare {key}: true")
    elif boundaries is not None:
        issue(errors, "Profile boundaries must be an object")

    surfaces = value.get("surfaces")
    if not isinstance(surfaces, list) or not surfaces:
        issue(errors, "Profile surfaces must be a non-empty array")
        return

    ids: set[str] = set()
    for index, surface in enumerate(surfaces, start=1):
        label = f"surface {index}"
        if not isinstance(surface, dict):
            issue(errors, f"{label} must be an object")
            continue
        for key in REQUIRED_SURFACE_KEYS:
            if not surface.get(key):
                issue(errors, f"{label} missing required key: {key}")
        surface_id = surface.get("id")
        if isinstance(surface_id, str):
            if surface_id in ids:
                issue(errors, f"Duplicate surface id: {surface_id}")
            ids.add(surface_id)
        states = surface.get("states")
        if not isinstance(states, list) or not states or not all(isinstance(state, str) and state.strip() for state in states):
            issue(errors, f"{label} states must be a non-empty list of strings")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the reusable interface-state evidence package.")
    parser.add_argument("--root", type=Path, required=True, help="Reusable asset library root")
    parser.add_argument("--profile", type=Path, help="Optional consumer profile JSON")
    args = parser.parse_args()

    root = args.root.resolve()
    asset_dir = root / ASSET_DIR
    errors: list[str] = []
    for relative_path in REQUIRED_ASSET_FILES:
        candidate = asset_dir / relative_path
        if not candidate.is_file():
            issue(errors, f"Missing required asset file: {ASSET_DIR / relative_path}")

    inventory = root / "REUSABLE_ASSET_INVENTORY.md"
    if not inventory.is_file():
        issue(errors, "Missing reusable asset inventory")
    elif "RA-009" not in inventory.read_text(encoding="utf-8"):
        issue(errors, "Inventory does not register RA-009")

    if args.profile:
        validate_profile(args.profile.resolve(), errors)

    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Interface State Evidence System validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
