#!/usr/bin/env python3
"""Create a neutral, zero-dependency static website project from a site profile."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
STARTER = SKILL_ROOT / "assets" / "starters" / "static-content"
AUDITOR = SKILL_ROOT / "scripts" / "audit_site.py"


def fail(message: str) -> None:
    raise SystemExit(message)


def validate_destination(destination: Path) -> Path:
    destination = destination.resolve()
    if destination == destination.anchor or destination.parent == destination:
        fail(f"Unsafe destination: {destination}")
    if destination.exists() and any(destination.iterdir()):
        fail(f"Destination must be new or empty: {destination}")
    return destination


def validate_profile(path: Path) -> None:
    try:
        profile = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Cannot read profile: {exc}")
    if not isinstance(profile.get("site"), dict) or not isinstance(profile.get("routes"), list):
        fail("Profile must contain site object and routes list")
    if not profile["routes"]:
        fail("Profile routes list cannot be empty")


def scaffold(destination: Path, profile: Path, build: bool) -> None:
    destination = validate_destination(destination)
    profile = profile.resolve()
    validate_profile(profile)
    if not STARTER.is_dir() or not AUDITOR.is_file():
        fail("Reusable starter resources are incomplete")
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(STARTER, destination, dirs_exist_ok=True)
    shutil.copy2(profile, destination / "site-profile.json")
    (destination / "scripts").mkdir(exist_ok=True)
    shutil.copy2(AUDITOR, destination / "scripts" / "audit_site.py")
    if build:
        command = [sys.executable, str(destination / "scripts" / "build_site.py")]
        completed = subprocess.run(command, cwd=destination, check=False)
        if completed.returncode:
            fail(f"Initial build failed with exit code {completed.returncode}")
    print(f"Created website project: {destination}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", required=True, type=Path)
    parser.add_argument("--profile", required=True, type=Path)
    parser.add_argument("--no-build", action="store_true")
    args = parser.parse_args()
    scaffold(args.destination, args.profile, not args.no_build)
    return 0


if __name__ == "__main__":
    sys.exit(main())
