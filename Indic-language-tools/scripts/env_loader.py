"""
Safe KEY=value env loader for Indic tooling.

Skips comment/blank/label lines. Never hard-codes a personal machine path —
callers pass an optional Path (project-local .env only).
"""
from __future__ import annotations

import os
from pathlib import Path


def load_env_file(path: Path | str | None) -> int:
    """Load KEY=value into os.environ (setdefault). Returns count of keys set."""
    if not path:
        return 0
    p = Path(path)
    if not p.is_file():
        return 0
    n = 0
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if not k or not v or " " in k or not k.replace("_", "").isalnum() or k[0].isdigit():
            continue
        if k not in os.environ:
            os.environ[k] = v
            n += 1
    return n


def ensure_utf8_stdio() -> None:
    import sys

    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass
