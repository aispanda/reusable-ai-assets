#!/usr/bin/env python3
"""Read-only structural and build-readiness audit for a scaffolded project."""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path
from urllib.parse import unquote

sys.dont_write_bytecode = True
from scaffold_project import selected

EXCLUDED_DIRS = {"archive", "archived", "history", "generated", "tmp", "node_modules", ".git"}
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
PLACEHOLDER_RE = re.compile(r"\[([A-Z][^\]\n]{1,100})\](?!\()")
HANDOVER_DATE_RE = re.compile(r"\|\s*Last verified\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|", re.I)
PROTOCOL_MARKERS = ("## Required handover", "## Authority boundaries", "## Required handback")
HANDOVER_STATE_LABELS = (
    "Repository / branch",
    "Local HEAD",
    "Deployed revision",
    "Matches deploy?",
    "## Authorized scope",
    "## Do not",
)


def active_markdown(root: Path) -> list[Path]:
    paths: list[Path] = []
    for relative in ("docs", "research", "prompts/ai-exchange"):
        base = root / relative
        if not base.is_dir():
            continue
        for path in base.rglob("*.md"):
            if not any(part.lower() in EXCLUDED_DIRS for part in path.relative_to(root).parts):
                paths.append(path)
    return sorted(set(paths))


def router_has(router_text: str, root: Path, path: Path) -> bool:
    relative = path.relative_to(root).as_posix()
    if relative == "docs/DOCUMENTATION_ROUTER.md":
        return True
    from_docs = Path("..") / Path(relative) if not relative.startswith("docs/") else Path(relative[5:])
    link = from_docs.as_posix()
    return relative in router_text or f"({link})" in router_text


def local_link_gaps(path: Path, root: Path) -> list[str]:
    gaps: list[str] = []
    text = path.read_text(encoding="utf-8")
    for raw in LINK_RE.findall(text):
        target = raw.strip().strip("<>")
        if not target or target.startswith(("#", "http://", "https://", "mailto:")) or "{{" in target:
            continue
        target = unquote(target.split("#", 1)[0]).strip()
        if not target:
            continue
        candidate = Path(target)
        if not candidate.is_absolute():
            candidate = (path.parent / candidate).resolve()
        if not candidate.exists():
            gaps.append(f"BROKEN_LINK {path.relative_to(root).as_posix()} -> {target}")
    return gaps


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project_root")
    parser.add_argument("--mode", choices=("lite", "standard", "controlled"), default="lite")
    parser.add_argument("--stage", choices=("kickoff", "build-ready"), default="kickoff")
    parser.add_argument("--with-research", action="store_true")
    parser.add_argument("--with-ai-exchange", action="store_true")
    parser.add_argument("--handover-max-age-days", type=int, default=14)
    parser.add_argument("--require-complete", action="store_true")
    args = parser.parse_args()

    root = Path(args.project_root).expanduser().resolve()
    gaps: list[str] = []
    files = selected(args.mode, args.stage, args.with_research, args.with_ai_exchange)
    for relative in files:
        if not (root / relative).is_file():
            gaps.append(f"MISSING {relative}")

    required_dirs: list[str] = []
    if args.stage == "build-ready":
        required_dirs += ["src", "tests", "scripts/Main-scripts", "scripts/One-off-scripts"]
    if args.with_research:
        required_dirs += ["research/sources", "research/notes"]
    for relative in required_dirs:
        if not (root / relative).is_dir():
            gaps.append(f"MISSING {relative}/")

    router = root / "docs/DOCUMENTATION_ROUTER.md"
    router_text = router.read_text(encoding="utf-8") if router.is_file() else ""
    markdown = active_markdown(root)
    for path in markdown:
        if not router_has(router_text, root, path):
            gaps.append(f"UNREGISTERED {path.relative_to(root).as_posix()}")
        gaps.extend(local_link_gaps(path, root))

    protocol = root / "docs/AI_HANDOVER_PROTOCOL.md"
    if protocol.is_file():
        protocol_text = protocol.read_text(encoding="utf-8")
        for marker in PROTOCOL_MARKERS:
            if marker not in protocol_text:
                gaps.append(f"HANDOVER_PROTOCOL_MISSING {marker}")

    handover = root / "docs/AI_HANDOVER.md"
    if handover.is_file() and args.handover_max_age_days >= 0:
        handover_text = handover.read_text(encoding="utf-8")
        for label in HANDOVER_STATE_LABELS:
            if label not in handover_text:
                gaps.append(f"HANDOVER_STATE_MISSING {label}")
        match = HANDOVER_DATE_RE.search(handover_text)
        if not match:
            gaps.append("HANDOVER_DATE_MISSING docs/AI_HANDOVER.md")
        else:
            verified = dt.date.fromisoformat(match.group(1))
            age = (dt.date.today() - verified).days
            if age < 0 or age > args.handover_max_age_days:
                gaps.append(f"STALE_HANDOVER docs/AI_HANDOVER.md ({age} days)")

    if args.require_complete:
        for path in markdown:
            text = path.read_text(encoding="utf-8")
            if "{{" in text or PLACEHOLDER_RE.search(text) or re.search(r"\b(?:TODO|TBD)\b", text):
                gaps.append(f"INCOMPLETE {path.relative_to(root).as_posix()}")
        decisions = root / "docs/DECISION_REGISTER.md"
        if decisions.is_file() and re.search(r"\|\s*Proposed\s*\|", decisions.read_text(encoding="utf-8"), re.I):
            gaps.append("UNRESOLVED_DECISION docs/DECISION_REGISTER.md")

    if gaps:
        print("\n".join(dict.fromkeys(gaps)))
        return 1
    print("Project governance structure OK.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
