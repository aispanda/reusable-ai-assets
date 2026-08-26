"""
De-roll YouTube auto-caption transcripts before MT / sampling.

YouTube GU captions often use a rolling window:
  A: "hello"
  B: "hello world"     # grows
  C: "world"           # shows only new tail
  D: "world foo"       # grows again

Naively joining adjacent lines (or feeding raw lines to Bhashini) duplicates text.

Hard pipeline rule: crystal-clear rolling repetition MUST be derolled before Bhashini.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

TS_RE = re.compile(r"^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$")


def parse_caption_lines(path: Path) -> list[dict]:
    rows: list[dict] = []
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        s = raw.strip()
        if not s:
            continue
        m = TS_RE.match(s)
        if m and m.group(2).strip():
            rows.append({"t": m.group(1), "gu": m.group(2).strip(), "raw": s})
        else:
            # keep non-timestamp lines as opaque (rare)
            rows.append({"t": "", "gu": s, "raw": s})
    return rows


def _is_roll_continue(prev: str, cur: str) -> bool:
    """True if cur is the same rolling window as prev (grow / shrink / echo)."""
    if not cur or not prev:
        return False
    if cur == prev:
        return True
    if cur.startswith(prev) or prev.startswith(cur):
        return True
    if cur in prev or prev in cur:
        return True
    return False


def deroll_cues(cues: list[dict]) -> list[dict]:
    """
    Collapse rolling caption windows into one cue per growth cycle.
    Keeps the timestamp of the first line in each cycle; keeps the longest text.
    """
    if not cues:
        return []
    out: list[dict] = []
    start_t = cues[0].get("t") or ""
    best = cues[0].get("gu") or ""

    def flush() -> None:
        nonlocal best, start_t
        g = (best or "").strip()
        if g:
            out.append({"t": start_t, "gu": g})

    for cur in cues[1:]:
        text = (cur.get("gu") or "").strip()
        if not text:
            continue
        if _is_roll_continue(best, text):
            # same window: keep longest form; keep earliest timestamp
            if len(text) > len(best):
                best = text
            continue
        flush()
        start_t = cur.get("t") or start_t
        best = text
    flush()
    return out


def format_cues(cues: list[dict]) -> str:
    lines = []
    for c in cues:
        t = c.get("t") or ""
        gu = c.get("gu") or ""
        if t:
            lines.append(f"[{t}] {gu}")
        else:
            lines.append(gu)
    return "\n".join(lines) + ("\n" if lines else "")


def deroll_file(
    src: Path,
    dest: Path | None = None,
    *,
    write_bak: bool = False,
) -> dict:
    """
    Deroll src → dest (default: overwrite src).
    If write_bak and overwriting, copy original to src.with_suffix(src.suffix + '.rolling.bak') once.
    """
    src = Path(src)
    dest = Path(dest) if dest else src
    parsed = parse_caption_lines(src)
    cleaned = deroll_cues(parsed)
    text = format_cues(cleaned)

    if write_bak and dest.resolve() == src.resolve():
        bak = Path(str(src) + ".rolling.bak")
        if not bak.is_file():
            bak.write_text(src.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")
    return {
        "src": str(src),
        "dest": str(dest),
        "lines_in": len(parsed),
        "lines_out": len(cleaned),
        "removed": max(0, len(parsed) - len(cleaned)),
        "reduction_pct": round(100.0 * (1 - (len(cleaned) / max(len(parsed), 1))), 1),
    }


def merge_adjacent_gu(a: str, b: str) -> str:
    """Overlap-aware join for sampling two consecutive derolled cues."""
    a, b = (a or "").strip(), (b or "").strip()
    if not a:
        return b
    if not b or a == b:
        return a
    if b.startswith(a):
        return b
    if a.startswith(b):
        return a
    if a in b:
        return b
    if b in a:
        return a
    # tail-head token overlap
    ta, tb = a.split(), b.split()
    maxk = 0
    for k in range(1, min(len(ta), len(tb)) + 1):
        if ta[-k:] == tb[:k]:
            maxk = k
    if maxk:
        return (a + " " + " ".join(tb[maxk:])).strip()
    return f"{a} {b}".strip()


def main() -> int:
    ap = argparse.ArgumentParser(description="De-roll YouTube caption transcripts before MT")
    ap.add_argument("transcript", type=Path)
    ap.add_argument("--out", type=Path, default=None, help="Default: overwrite input")
    ap.add_argument("--bak", action="store_true", help="Keep .rolling.bak when overwriting")
    args = ap.parse_args()
    stats = deroll_file(args.transcript, args.out, write_bak=args.bak)
    try:
        print(stats)
    except UnicodeEncodeError:
        # Windows cp1252 consoles choke on Gujarati in stats; file already written.
        print({k: stats[k] for k in stats if k != "sample"} if isinstance(stats, dict) else "deroll_ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
