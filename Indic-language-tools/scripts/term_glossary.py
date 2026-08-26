"""Load terminology inventories + build prompt blocks + free EN audits."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None


@dataclass
class TermEntry:
    id: str
    gu: list[str]
    preserve_as: str
    also_ok: list[str] = field(default_factory=list)
    forbidden_alone: list[str] = field(default_factory=list)
    traditional_gloss: str = ""
    domain_gloss: str = ""
    status: str = "approved"


@dataclass
class Glossary:
    path: Path
    profile_id: str
    version: int
    notes: str
    terms: list[TermEntry]

    def approved(self) -> list[TermEntry]:
        return [t for t in self.terms if t.status == "approved"]


def load_glossary(path: str | Path) -> Glossary:
    path = Path(path)
    if yaml is None:
        raise RuntimeError("PyYAML required: pip install pyyaml")
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    terms = []
    for row in data.get("terms") or []:
        terms.append(
            TermEntry(
                id=str(row.get("id") or ""),
                gu=[str(x) for x in (row.get("gu") or [])],
                preserve_as=str(row.get("preserve_as") or ""),
                also_ok=[str(x) for x in (row.get("also_ok") or [])],
                forbidden_alone=[str(x) for x in (row.get("forbidden_alone") or [])],
                traditional_gloss=str(row.get("traditional_gloss") or ""),
                domain_gloss=str(row.get("domain_gloss") or "").strip(),
                status=str(row.get("status") or "approved"),
            )
        )
    return Glossary(
        path=path,
        profile_id=str(data.get("profile_id") or path.stem),
        version=int(data.get("version") or 1),
        notes=str(data.get("notes") or "").strip(),
        terms=terms,
    )


def compact_inventory_table(glossary: Glossary, max_terms: int = 40) -> str:
    lines = ["| Gujarati | Keep as | Gloss |", "|----------|---------|-------|"]
    for t in glossary.approved()[:max_terms]:
        gu = " / ".join(t.gu[:2]) if t.gu else "—"
        gloss = (t.domain_gloss or t.traditional_gloss or "").replace("\n", " ")
        if len(gloss) > 80:
            gloss = gloss[:77] + "..."
        lines.append(f"| {gu} | {t.preserve_as} | {gloss} |")
    return "\n".join(lines)


def context_card_body(path: str | Path, max_chars: int = 2200) -> str:
    text = Path(path).read_text(encoding="utf-8")
    # Prefer section after "## Context card"
    if "## Context card" in text:
        text = text.split("## Context card", 1)[1]
    text = text.strip()
    return text[:max_chars]


def audit_locked_terms(source_gu: str, english: str, glossary: Glossary) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    en_l = (english or "").lower()
    for t in glossary.approved():
        if not any(g and g in (source_gu or "") for g in t.gu):
            continue
        ok_forms = [t.preserve_as] + list(t.also_ok)
        has_token = any(f and f.lower() in en_l for f in ok_forms)
        forbidden = [f for f in t.forbidden_alone if f and f.lower() in en_l]
        if not has_token:
            hits.append(
                {
                    "id": t.id,
                    "issue": "missing_preserve_as",
                    "expected": t.preserve_as,
                    "forbidden_seen": forbidden,
                }
            )
    return hits


def strip_timestamps(text: str) -> str:
    return re.sub(r"^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*", "", text, flags=re.M)
