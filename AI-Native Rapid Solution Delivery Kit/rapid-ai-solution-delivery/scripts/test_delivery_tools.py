#!/usr/bin/env python3
"""Smoke tests for the delivery-kit scaffold and audit."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCAFFOLD = HERE / "scaffold_project.py"
AUDIT = HERE / "audit_project.py"


def run(*args: str, expect: int = 0) -> subprocess.CompletedProcess[str]:
    result = subprocess.run([sys.executable, *args], text=True, capture_output=True, check=False)
    assert result.returncode == expect, result.stdout + result.stderr
    return result


def main() -> int:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp) / "lite"
        run(str(SCAFFOLD), str(root), "--project-name", "Example", "--owner", "Owner")
        charter = root / "docs/PROJECT_CHARTER.md"
        original = charter.read_text(encoding="utf-8")
        run(str(SCAFFOLD), str(root), "--project-name", "Changed")
        assert charter.read_text(encoding="utf-8") == original
        run(str(AUDIT), str(root))
        incomplete = run(str(AUDIT), str(root), "--require-complete", expect=1)
        assert "INCOMPLETE" in incomplete.stdout and "UNRESOLVED_DECISION" in incomplete.stdout

        handover = root / "docs/AI_HANDOVER.md"
        current_handover = handover.read_text(encoding="utf-8")
        old_handover = re.sub(r"(\| Last verified \| )\d{4}-\d{2}-\d{2}", r"\g<1>2000-01-01", current_handover)
        handover.write_text(old_handover, encoding="utf-8")
        stale = run(str(AUDIT), str(root), expect=1)
        assert "STALE_HANDOVER" in stale.stdout
        handover.write_text(current_handover, encoding="utf-8")

        root2 = Path(temp) / "standard"
        run(
            str(SCAFFOLD), str(root2), "--project-name", "Example",
            "--mode", "standard", "--stage", "build-ready",
            "--with-research", "--with-ai-exchange",
        )
        assert (root2 / "docs/ARCHITECTURE_CORE.md").is_file()
        assert (root2 / "docs/AUTOMATION_ROUTER.md").is_file()
        assert (root2 / "docs/AI_HANDOVER_PROTOCOL.md").is_file()
        assert (root2 / "research/README.md").is_file()
        assert (root2 / "research/sources").is_dir()
        assert (root2 / "prompts/ai-exchange/README.md").is_file()
        assert (root2 / "scripts/Main-scripts").is_dir()
        audit_args = (
            str(AUDIT), str(root2), "--mode", "standard", "--stage", "build-ready",
            "--with-research", "--with-ai-exchange",
        )
        run(*audit_args)

        extra = root2 / "docs/UNREGISTERED.md"
        extra.write_text("[Missing](MISSING.md)\n", encoding="utf-8")
        result = run(*audit_args, expect=1)
        assert "UNREGISTERED" in result.stdout and "BROKEN_LINK" in result.stdout
        extra.unlink()

    print("Delivery-tool tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
