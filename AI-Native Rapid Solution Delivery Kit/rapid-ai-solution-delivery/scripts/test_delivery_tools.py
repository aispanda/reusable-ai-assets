#!/usr/bin/env python3
"""Smoke tests for the delivery-kit scaffold and audit."""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
import zipfile
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
        principles = (root2 / "docs/ENGINEERING_PRINCIPLES.md").read_text(encoding="utf-8")
        for marker in (
            "99/10 shorthand",
            "The 10 principles of building with AI",
            "Aim Before You Generate",
            "Test the Logic Before You Trust the Draft",
            "Own the Track, Swap the Engines",
            "Clicks versus code is not the decision",
            "AI Recommends, Human Decides",
            "Pay for the Destination, Not the Fuel",
            "AI-enabled evolution loop",
        ):
            assert marker in principles
        research_prompt = (HERE.parent / "assets/AI_AGE_ENGINEERING_RESEARCH_PROMPT.template.md").read_text(
            encoding="utf-8"
        )
        assert "influential books" in research_prompt and "Do not calculate a 99/10 ratio" in research_prompt
        evidence = (HERE.parent / "assets/AI_AGE_ENGINEERING_EVIDENCE_MATRIX.md").read_text(encoding="utf-8")
        for marker in (
            "OBSERVED",
            "INFERRED",
            "Hands-On Large Language Models",
            "Building Evolutionary Architectures",
            "Designing Data-Intensive Applications",
        ):
            assert marker in evidence
        assert (root2 / "research/README.md").is_file()
        assert (root2 / "research/sources").is_dir()
        research_readme = (root2 / "research/README.md").read_text(encoding="utf-8")
        assert "two-corpus boundary" in research_readme
        synthesis = (root2 / "docs/RESEARCH_SYNTHESIS.md").read_text(encoding="utf-8")
        assert "Evidence packet ID" in synthesis and "private evidence corpus" in synthesis
        documentation_router = (root2 / "docs/DOCUMENTATION_ROUTER.md").read_text(encoding="utf-8")
        assert "must never share an artifact" in documentation_router
        assert (root2 / "prompts/ai-exchange/README.md").is_file()
        assert (root2 / "scripts/Main-scripts").is_dir()
        protocol = (root2 / "docs/AI_HANDOVER_PROTOCOL.md").read_text(encoding="utf-8")
        assert "## Authority boundaries" in protocol
        live_handover = (root2 / "docs/AI_HANDOVER.md").read_text(encoding="utf-8")
        for label in ("Repository / branch", "Local HEAD", "Deployed revision", "Matches deploy?"):
            assert label in live_handover
        exchange = (root2 / "prompts/ai-exchange/README.md").read_text(encoding="utf-8")
        assert "capability profile" in exchange and "verifies Git/deploy state" in exchange
        audit_args = (
            str(AUDIT), str(root2), "--mode", "standard", "--stage", "build-ready",
            "--with-research", "--with-ai-exchange",
        )
        run(*audit_args)

        boundary_sheet = root2 / "docs/BOUNDARY.xlsx"
        with zipfile.ZipFile(boundary_sheet, "w") as package:
            package.writestr("xl/sharedStrings.xml", "<sst><si><t>ExampleVendor</t></si></sst>")
        protected = run(*audit_args, "--forbid-protected-term", "ExampleVendor", expect=1)
        assert "PROTECTED_TERM docs/BOUNDARY.xlsx: ExampleVendor" in protected.stdout
        boundary_sheet.unlink()

        boundary_pdf = root2 / "docs/BOUNDARY.pdf"
        boundary_pdf.write_bytes(b"%PDF-1.4\n% separately reviewed fixture\n")
        unsupported = run(*audit_args, "--forbid-protected-term", "ExampleVendor", expect=1)
        assert "BOUNDARY_REVIEW_REQUIRED PROTECTED docs/BOUNDARY.pdf" in unsupported.stdout
        run(
            *audit_args,
            "--forbid-protected-term", "ExampleVendor",
            "--reviewed-binary", "docs/BOUNDARY.pdf",
        )
        boundary_pdf.unlink()

        evidence_root = Path(temp) / "private-evidence"
        evidence_root.mkdir()
        (evidence_root / "source-note.md").write_text("ExampleProduct evidence only", encoding="utf-8")
        evidence_gap = run(
            *audit_args,
            "--evidence-root", str(evidence_root),
            "--forbid-evidence-term", "ExampleProduct",
            expect=1,
        )
        assert "EVIDENCE_TERM source-note.md: ExampleProduct" in evidence_gap.stdout
        (evidence_root / "source-note.md").write_text("Named evidence only", encoding="utf-8")
        run(
            *audit_args,
            "--evidence-root", str(evidence_root),
            "--forbid-evidence-term", "ExampleProduct",
        )

        protocol_path = root2 / "docs/AI_HANDOVER_PROTOCOL.md"
        protocol_path.write_text(protocol.replace("## Authority boundaries", "## Permissions"), encoding="utf-8")
        missing_protocol = run(*audit_args, expect=1)
        assert "HANDOVER_PROTOCOL_MISSING ## Authority boundaries" in missing_protocol.stdout
        protocol_path.write_text(protocol, encoding="utf-8")

        extra = root2 / "docs/UNREGISTERED.md"
        extra.write_text("[Missing](MISSING.md)\n", encoding="utf-8")
        result = run(*audit_args, expect=1)
        assert "UNREGISTERED" in result.stdout and "BROKEN_LINK" in result.stdout
        extra.unlink()

        root3 = Path(temp) / "controlled"
        run(
            str(SCAFFOLD), str(root3), "--project-name", "Sensitive Example",
            "--mode", "controlled", "--stage", "build-ready", "--with-ai-exchange",
        )
        assert (root3 / "docs/RISK_SECURITY_REGISTER.md").is_file()
        assert "## Authority boundaries" in (
            root3 / "docs/AI_HANDOVER_PROTOCOL.md"
        ).read_text(encoding="utf-8")
        run(
            str(AUDIT), str(root3), "--mode", "controlled", "--stage", "build-ready",
            "--with-ai-exchange",
        )

    print("Delivery-tool tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
