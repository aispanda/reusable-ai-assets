#!/usr/bin/env python3
"""Create a draft reusable-asset record and register it in the central inventory."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import quote


def fail(message: str) -> None:
    raise SystemExit(message)


def main() -> int:
    parser = argparse.ArgumentParser(description="Scaffold and register a draft reusable asset.")
    parser.add_argument("root", type=Path)
    parser.add_argument("--id", required=True, dest="asset_id")
    parser.add_argument("--name", required=True)
    parser.add_argument("--category", required=True)
    parser.add_argument("--keywords", required=True)
    parser.add_argument("--entry-point", default="To be defined")
    parser.add_argument("--folder")
    args = parser.parse_args()

    if not re.fullmatch(r"RA-\d{3}", args.asset_id):
        fail("--id must match RA-NNN")

    root = args.root.resolve()
    inventory = root / "REUSABLE_ASSET_INVENTORY.md"
    if not inventory.is_file():
        fail(f"Inventory not found: {inventory}")

    inventory_text = inventory.read_text(encoding="utf-8")
    if re.search(rf"\|\s*{re.escape(args.asset_id)}\s*\|", inventory_text):
        fail(f"Asset ID already registered: {args.asset_id}")

    folder_name = args.folder or args.name
    if folder_name in {"", ".", ".."} or any(char in folder_name for char in '<>:"/\\|?*'):
        fail("Invalid asset folder name")
    asset_dir = root / folder_name
    if asset_dir.exists():
        fail(f"Asset folder already exists: {asset_dir}")

    record = f"""# {args.asset_id} - {args.name}

| Metadata | Value |
|---|---|
| Category | {args.category} |
| Select when | {args.keywords} |
| Entry point | `{args.entry_point}` |
| Status | Draft |

## Outcome

Define one reusable business result.

## Reuse boundary

Separate reusable core, optional domain starter, and project-specific profile.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| To be defined | To be defined | Reusable core / project profile / evidence / excluded |

## Inputs and outputs

Define contracts and the source-of-truth boundary.

## Use / transfer

Document the shortest safe adoption path.

## Dependencies, cost and licensing

State dependencies, recurring cost, licences and provider constraints.

## Verification

Record executable checks and observed results before changing status to Reusable.

## Boundaries and limitations

State exclusions, assumptions and actions requiring approval.
"""

    created_dir = False
    record_path = asset_dir / "ASSET.md"
    try:
        asset_dir.mkdir()
        created_dir = True
        record_path.write_text(record, encoding="utf-8")

        link = f"{quote(folder_name)}/ASSET.md"
        row = (
            f"| {args.asset_id} | {args.category} | {args.name} | {args.keywords} | "
            f"[`{folder_name}/ASSET.md`]({link}) | Draft | Not verified |"
        )
        inventory.write_text(inventory_text.rstrip() + "\n" + row + "\n", encoding="utf-8")
    except PermissionError:
        if created_dir:
            if record_path.exists():
                record_path.unlink()
            asset_dir.rmdir()
        fail(
            "Write access denied for the canonical asset library. Confirm the exact target "
            "and request narrowly scoped write authorization, then rerun this command."
        )
    except Exception:
        if created_dir:
            if record_path.exists():
                record_path.unlink()
            asset_dir.rmdir()
        raise
    print(f"Created draft {args.asset_id}: {record_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
