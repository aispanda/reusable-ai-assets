#!/usr/bin/env python3
"""Validate a reusable-asset library without changing it."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REQUIRED_HEADINGS = (
    "## Outcome",
    "## Transfer manifest",
    "## Verification",
    "## Boundaries",
)
LOCAL_OUTPUT_NAMES = {"node_modules", "dist", "dist-public", "generated", "review", "test-results", "playwright-report", "__pycache__"}
SECRET_FILE_NAMES = {".env", ".env.local", ".env.production", "credentials.json", "service-account.json"}
SECRET_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".pyc"}
TEXT_SUFFIXES = {".md", ".txt", ".py", ".js", ".mjs", ".ts", ".tsx", ".json", ".yaml", ".yml", ".toml", ".sh", ".ps1", ".dbml", ".config", ".example"}
MACHINE_PATH = re.compile(r"(?i)(?:[a-z]:[\\/](?:users|personal)[\\/]|/(?:users|home)/|/[a-z]/personal/)")
SECRET_CONTENT = re.compile(r"(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}|\bAIza[A-Za-z0-9_-]{20,}|\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bxox[baprs]-[A-Za-z0-9-]{20,})")


def load_policy(path: Path | None) -> dict[str, list[str]]:
    """Load project-specific publication rules without embedding them in this asset."""
    if path is None:
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot read validation policy {path}: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError("Validation policy must be a JSON object")
    supported = {
        "forbidden_terms",
        "additional_secret_patterns",
        "additional_machine_path_patterns",
        "additional_secret_file_names",
        "additional_output_directory_names",
    }
    unknown = sorted(set(raw) - supported)
    if unknown:
        raise ValueError(f"Unsupported validation policy keys: {', '.join(unknown)}")
    policy: dict[str, list[str]] = {}
    for key, value in raw.items():
        if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
            raise ValueError(f"Validation policy '{key}' must be a list of non-empty strings")
        policy[key] = value
    return policy


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a reusable-asset library.")
    parser.add_argument("root", nargs="?", default=Path.cwd())
    parser.add_argument(
        "--strict-clean",
        action="store_true",
        help="Reject local dependency/generated directories; use on a staged transfer package.",
    )
    parser.add_argument(
        "--policy",
        type=Path,
        help="JSON policy containing project-specific forbidden terms and additional safety patterns.",
    )
    parser.add_argument(
        "--forbid-term",
        action="append",
        default=[],
        help="Reject a case-insensitive project, client or private term; repeat as needed for public-release checks.",
    )
    args = parser.parse_args()
    try:
        policy = load_policy(args.policy)
        additional_secret_patterns = [re.compile(pattern) for pattern in policy.get("additional_secret_patterns", [])]
        additional_machine_paths = [re.compile(pattern) for pattern in policy.get("additional_machine_path_patterns", [])]
    except (ValueError, re.error) as exc:
        print(f"Invalid validation policy: {exc}")
        return 2
    root = Path(args.root).resolve()
    inventory = root / "REUSABLE_ASSET_INVENTORY.md"
    errors: list[str] = []
    if not inventory.is_file():
        errors.append(f"Missing inventory: {inventory}")
    else:
        text = inventory.read_text(encoding="utf-8")
        ids = re.findall(r"^\|\s*(RA-\d{3})\s*\|", text, flags=re.MULTILINE)
        duplicates = sorted({asset_id for asset_id in ids if ids.count(asset_id) > 1})
        for asset_id in duplicates:
            errors.append(f"Duplicate asset ID: {asset_id}")
        links = re.findall(r"\]\(([^)]+/ASSET\.md)\)", text)
        if not links:
            errors.append("Inventory contains no ASSET.md links")
        for raw in links:
            target = root / raw.replace("%20", " ")
            if not target.is_file():
                errors.append(f"Broken asset record link: {raw}")
                continue
            record = target.read_text(encoding="utf-8")
            heading = record.splitlines()[0] if record else ""
            if not re.fullmatch(r"# RA-\d{3} (?:-|\N{EN DASH}|\N{EM DASH}).+", heading):
                errors.append(f"{target}: first heading must start '# RA-NNN - Asset name'")
            for heading in REQUIRED_HEADINGS:
                if heading not in record:
                    errors.append(f"{target}: missing heading beginning '{heading}'")

        registered = {str((root / raw.replace("%20", " ")).resolve()).lower() for raw in links}
        for record_path in root.glob("*/ASSET.md"):
            if str(record_path.resolve()).lower() not in registered:
                errors.append(f"Unregistered asset record: {record_path}")

    forbidden_originals = [term for term in [*policy.get("forbidden_terms", []), *args.forbid_term] if term.strip()]
    forbidden_terms = [term.casefold() for term in forbidden_originals]
    secret_file_names = SECRET_FILE_NAMES | {name.casefold() for name in policy.get("additional_secret_file_names", [])}
    output_names = LOCAL_OUTPUT_NAMES | {name.casefold() for name in policy.get("additional_output_directory_names", [])}
    policy_path = args.policy.resolve() if args.policy else None
    for path in root.rglob("*"):
        if path.name.casefold() in secret_file_names:
            errors.append(f"Forbidden secret-bearing path: {path}")
        elif path.is_file() and path.suffix.lower() in SECRET_SUFFIXES:
            errors.append(f"Forbidden secret/generated file type: {path}")
        elif args.strict_clean and path.name.casefold() in output_names:
            errors.append(f"Forbidden staged-package path: {path}")

        if not path.is_file() or path.resolve() == policy_path:
            continue
        if any(part.casefold() in output_names or part == ".git" for part in path.parts):
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in {"Dockerfile", "README", "LICENSE"}:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if SECRET_CONTENT.search(content):
            errors.append(f"Possible credential/private key in: {path}")
        if any(pattern.search(content) for pattern in additional_secret_patterns):
            errors.append(f"Policy-defined possible credential/private value in: {path}")
        if args.strict_clean and (MACHINE_PATH.search(content) or any(pattern.search(content) for pattern in additional_machine_paths)):
            errors.append(f"Hard-coded personal machine path in: {path}")
        folded = content.casefold()
        for original, forbidden in zip(forbidden_originals, forbidden_terms):
            if forbidden and forbidden in folded:
                errors.append(f"Forbidden project/private term '{original}' in: {path}")

    for skill_path in root.rglob("SKILL.md"):
        if len(skill_path.read_text(encoding="utf-8").splitlines()) > 500:
            errors.append(f"Skill exceeds 500-line progressive-disclosure limit: {skill_path}")

    if errors:
        print("Asset library validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"Asset library OK: {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
