#!/usr/bin/env python3
"""Create a non-destructive, progressively governed project skeleton."""

from __future__ import annotations

import argparse
import datetime as dt
import shutil
import sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / "assets"

COMMON = {
    "AGENTS.md": "AGENTS.template.md",
    "docs/DOCUMENTATION_ROUTER.md": "DOCUMENTATION_ROUTER.template.md",
    "docs/PROJECT_CHARTER.md": "PROJECT_CHARTER.template.md",
    "docs/PROJECT_PLAN.md": "PROJECT_PLAN.template.md",
    "docs/WORK_ITEM_REGISTER.md": "WORK_ITEM_REGISTER.template.md",
    "docs/DECISION_REGISTER.md": "DECISION_REGISTER.template.md",
    "docs/FIRST_SLICE_BUILD_BRIEF.md": "FIRST_SLICE_BUILD_BRIEF.template.md",
    "docs/AI_HANDOVER.md": "AI_HANDOVER.template.md",
    "docs/AI_HANDOVER_PROTOCOL.md": "AI_HANDOVER_PROTOCOL.template.md",
}
STANDARD = {
    "docs/ENGINEERING_PRINCIPLES.md": "ENGINEERING_PRINCIPLES.template.md",
    "docs/TECHNOLOGY_OPTIONS_MATRIX.md": "TECHNOLOGY_OPTIONS_MATRIX.template.md",
    "docs/ARCHITECTURE_CORE.md": "ARCHITECTURE_CORE.template.md",
    "docs/DATA_MODEL.md": "DATA_MODEL.template.md",
    "docs/RESEARCH_SYNTHESIS.md": "RESEARCH_SYNTHESIS.template.md",
    "docs/SEED_IDEAS.md": "SEED_IDEAS.template.md",
    "docs/seeds/README.md": "SEEDS_FOLDER_README.template.md",
}
CONTROLLED = {
    "docs/RISK_SECURITY_REGISTER.md": "RISK_SECURITY_REGISTER.template.md",
    "docs/COMPLIANCE_EVIDENCE.md": "COMPLIANCE_EVIDENCE.template.md",
}
BUILD_READY = {"docs/AUTOMATION_ROUTER.md": "AUTOMATION_ROUTER.template.md"}
RESEARCH = {"research/README.md": "RESEARCH_VAULT_README.template.md"}
AI_EXCHANGE = {"prompts/ai-exchange/README.md": "AI_EXCHANGE_README.template.md"}

OWNERSHIP = {
    "PROJECT_CHARTER.md": "Business outcome, users, success, constraints, and boundary",
    "PROJECT_PLAN.md": "Phases, gates, status, and next action",
    "WORK_ITEM_REGISTER.md": "Outcome-oriented requirements and acceptance",
    "DECISION_REGISTER.md": "Options, recommendations, and human dispositions",
    "FIRST_SLICE_BUILD_BRIEF.md": "Authorized first vertical slice and verification",
    "AI_HANDOVER.md": "Compact current operational state",
    "AI_HANDOVER_PROTOCOL.md": "Stable cross-tool handover and evidence rules",
    "ENGINEERING_PRINCIPLES.md": "Cross-cutting engineering philosophy",
    "TECHNOLOGY_OPTIONS_MATRIX.md": "Technology research and finalist evidence",
    "ARCHITECTURE_CORE.md": "Accepted system structure and data flow",
    "DATA_MODEL.md": "Logical entities, meaning, and relationships",
    "RESEARCH_SYNTHESIS.md": "Source-backed research findings",
    "SEED_IDEAS.md": "Uncommitted opportunities and revisit triggers",
    "docs/seeds/README.md": "Deep seed files (raw capture) and naming rules",
    "RISK_SECURITY_REGISTER.md": "Material risk scenarios and controls",
    "COMPLIANCE_EVIDENCE.md": "Obligations, controls, and proof",
    "AUTOMATION_ROUTER.md": "Maintained scripts and safety boundaries",
    "research/README.md": "Research-vault structure, evidence, and commitment boundary",
    "prompts/ai-exchange/README.md": "Bounded cross-agent exchange rules and naming",
}


def selected(
    mode: str,
    stage: str,
    with_research: bool = False,
    with_ai_exchange: bool = False,
) -> dict[str, str]:
    files = dict(COMMON)
    if mode in {"standard", "controlled"}:
        files.update(STANDARD)
    if mode == "controlled":
        files.update(CONTROLLED)
    if stage == "build-ready":
        files.update(BUILD_READY)
    if with_research:
        files.update(RESEARCH)
    if with_ai_exchange:
        files.update(AI_EXCHANGE)
    return files


def router_rows(files: dict[str, str]) -> str:
    rows = []
    order = 1
    for relative in files:
        name = Path(relative).name
        owner_key = relative if relative in OWNERSHIP else name
        if owner_key in OWNERSHIP:
            link = relative[5:] if relative.startswith("docs/") else "../" + relative
            rows.append(f"| {order} | [{relative}]({link}) | {OWNERSHIP[owner_key]} | Draft |")
            order += 1
    return "\n".join(rows)


def render(template: Path, tokens: dict[str, str]) -> str:
    text = template.read_text(encoding="utf-8")
    for key, value in tokens.items():
        text = text.replace("{{" + key + "}}", value)
    return text


def scaffold(args: argparse.Namespace) -> int:
    root = Path(args.project_root).expanduser().resolve()
    files = selected(args.mode, args.stage, args.with_research, args.with_ai_exchange)
    tokens = {
        "PROJECT_NAME": args.project_name,
        "OWNER": args.owner,
        "DATE": dt.date.today().isoformat(),
        "MODE": args.mode.title(),
        "DOCUMENT_ROWS": router_rows(files),
    }
    planned = [root / relative for relative in files]
    if args.stage == "build-ready":
        planned += [root / p for p in ("src", "tests", "scripts/Main-scripts", "scripts/One-off-scripts")]
    if args.with_research:
        planned += [root / p for p in ("research/sources", "research/notes")]
    if args.dry_run:
        for path in planned:
            print(f"WOULD CREATE {path}")
        return 0

    created_files: list[Path] = []
    created_dirs: list[Path] = []
    skipped: list[Path] = []
    try:
        for relative, template_name in files.items():
            target = root / relative
            if target.exists():
                skipped.append(target)
                continue
            missing = []
            cursor = target.parent
            while cursor != root.parent and not cursor.exists():
                missing.append(cursor)
                cursor = cursor.parent
            target.parent.mkdir(parents=True, exist_ok=True)
            created_dirs.extend(reversed(missing))
            target.write_text(render(ASSETS / template_name, tokens), encoding="utf-8")
            created_files.append(target)
        if args.stage == "build-ready":
            for relative in ("src", "tests", "scripts/Main-scripts", "scripts/One-off-scripts"):
                folder = root / relative
                if folder.exists():
                    continue
                folder.mkdir(parents=True, exist_ok=True)
                created_dirs.append(folder)
        if args.with_research:
            for relative in ("research/sources", "research/notes"):
                folder = root / relative
                if folder.exists():
                    continue
                folder.mkdir(parents=True, exist_ok=True)
                created_dirs.append(folder)
    except (OSError, PermissionError) as exc:
        for path in reversed(created_files):
            path.unlink(missing_ok=True)
        for path in sorted(set(created_dirs), key=lambda p: len(p.parts), reverse=True):
            if path.exists() and not any(path.iterdir()):
                path.rmdir()
        print(f"ERROR: {exc}. Grant write access only to the intended project folder.", file=sys.stderr)
        return 2

    print(f"Created {len(created_files)} files; skipped {len(skipped)} existing files.")
    if skipped:
        print("Existing files were not changed; integrate missing sections surgically if needed.")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project_root")
    parser.add_argument("--project-name", required=True)
    parser.add_argument("--owner", default="To be assigned")
    parser.add_argument("--mode", choices=("lite", "standard", "controlled"), default="lite")
    parser.add_argument("--stage", choices=("kickoff", "build-ready"), default="kickoff")
    parser.add_argument("--with-research", action="store_true")
    parser.add_argument("--with-ai-exchange", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(scaffold(parse_args()))
