#!/usr/bin/env python3
"""Deterministic tests for the AI Spanda delivery gate."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True
from fetch_linear_issue import decode_response
from set_pull_request_status import StatusError, status_payload

CHECK = Path(__file__).with_name("check_delivery.py")
FETCH = Path(__file__).with_name("fetch_linear_issue.py")
STATUS = Path(__file__).with_name("set_pull_request_status.py")
ASSETS = CHECK.parents[1] / "assets"
CONTRACT = """### User story
As an owner, I want a gate, so that unsafe work stops.
### Change
Add one gate.
### Done when
The gate passes or fails deterministically.
### Evidence
Automated fixture.
### Deployment
Later.
"""
PR_BODY = """## Linear issue
https://linear.app/ai-spanda/issue/AI-88/governance-enforcement
## Change
Add the governance gate.
## Evidence
- [x] Deterministic checks passed.
- [x] Acceptance outcome verified.
## Independent verifier
Reviewer: verifier
Result: APPROVED
Finding: No blocking findings.
## Deployment
Protected production workflow.
"""


def command(*args: str, expect: int = 0) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["GOVERNANCE_TEST_MODE"] = "1"
    result = subprocess.run(
        [sys.executable, str(CHECK), *args], text=True, capture_output=True, env=env
    )
    assert result.returncode == expect, result.stdout + result.stderr
    return result


def git(root: Path, *args: str) -> str:
    result = subprocess.run(["git", "-C", str(root), *args], text=True, capture_output=True)
    assert result.returncode == 0, result.stdout + result.stderr
    return result.stdout.strip()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def copy(adopted: Path, relative: str, source: Path) -> None:
    target = adopted / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)


def pr_event(body: str, head_sha: str) -> dict:
    return {
        "pull_request": {
            "head": {"ref": "owner/ai-88-governance", "sha": head_sha},
            "updated_at": "2026-08-26T12:00:00Z",
            "body": body,
        }
    }


def main() -> int:
    with tempfile.TemporaryDirectory() as temp:
        base = Path(temp)
        repo = base / "repo"
        repo.mkdir()
        git(repo, "init", "-b", "main")
        git(repo, "config", "user.email", "test@example.invalid")
        git(repo, "config", "user.name", "Test")
        (repo / "README.md").write_text("fixture\n", encoding="utf-8")
        git(repo, "add", "README.md")
        git(repo, "commit", "-m", "Initial")
        git(repo, "remote", "add", "origin", str(repo))
        git(repo, "fetch", "origin", "main:refs/remotes/origin/main")
        git(repo, "switch", "-c", "owner/ai-88-governance")

        issue = base / "issue.json"
        event = base / "event.json"
        revision = base / "revision.json"
        branch_sha = git(repo, "rev-parse", "HEAD")
        valid_issue = {
            "identifier": "AI-88",
            "branchName": "owner/ai-88-governance",
            "status": "Ready",
            "description": CONTRACT,
            "stateHistory": [{"state": {"name": "Ready"}}],
        }
        write_json(issue, valid_issue)
        write_json(event, pr_event(PR_BODY, branch_sha))
        common = (
            "--repo-root", str(repo), "--branch", "owner/ai-88-governance",
            "--issue-json", str(issue), "--event-json", str(event),
            "--revision-output", str(revision),
        )
        command("--mode", "ci", *common)
        assert json.loads(revision.read_text(encoding="utf-8"))["headSha"] == branch_sha
        command(
            "--mode", "ci", "--repo-root", str(repo), "--branch", "owner/ai-88-governance",
            "--issue-json", str(issue), "--event-json", str(event), expect=1,
        )
        command(
            "--mode", "ci", "--repo-root", str(repo), "--branch", "owner/no-issue",
            "--issue-json", str(issue), "--event-json", str(event), expect=1,
        )

        write_json(issue, {**valid_issue, "status": "Backlog"})
        command("--mode", "ci", *common, expect=1)
        write_json(issue, {**valid_issue, "status": "In Progress", "stateHistory": []})
        command("--mode", "ci", *common, expect=1)
        write_json(issue, {**valid_issue, "description": "### Change\nOnly."})
        command("--mode", "ci", *common, expect=1)
        tbd_contract = "\n".join(
            f"### {heading}\nTBD"
            for heading in ("User story", "Change", "Done when", "Evidence", "Deployment")
        )
        write_json(issue, {**valid_issue, "description": tbd_contract})
        command("--mode", "ci", *common, expect=1)
        angle_contract = "\n".join(
            f"### {heading}\n<describe>"
            for heading in ("User story", "Change", "Done when", "Evidence", "Deployment")
        )
        write_json(issue, {**valid_issue, "description": angle_contract})
        command("--mode", "ci", *common, expect=1)
        write_json(issue, {**valid_issue, "branchName": "owner/ai-88-other"})
        command("--mode", "ci", *common, expect=1)

        write_json(issue, valid_issue)
        incomplete = pr_event("## Linear issue\nAI-88", branch_sha)
        write_json(event, incomplete)
        command("--mode", "ci", *common, expect=1)
        identifier_only = PR_BODY.replace(
            "https://linear.app/ai-spanda/issue/AI-88/governance-enforcement", "AI-88"
        )
        write_json(event, pr_event(identifier_only, branch_sha))
        command("--mode", "ci", *common, expect=1)
        unchecked = PR_BODY.replace("- [x]", "- [ ]", 1)
        write_json(event, pr_event(unchecked, branch_sha))
        command("--mode", "ci", *common, expect=1)
        empty_evidence = PR_BODY.replace(
            "- [x] Deterministic checks passed.\n- [x] Acceptance outcome verified.", "- [x]"
        )
        write_json(event, pr_event(empty_evidence, branch_sha))
        command("--mode", "ci", *common, expect=1)
        missing_change = PR_BODY.replace("## Change\nAdd the governance gate.\n", "")
        write_json(event, pr_event(missing_change, branch_sha))
        command("--mode", "ci", *common, expect=1)
        untouched = (ASSETS / "PULL_REQUEST_TEMPLATE.template.md").read_text(encoding="utf-8")
        untouched = untouched.replace(
            "https://linear.app/<workspace>/issue/AI-___/<slug>",
            "https://linear.app/ai-spanda/issue/AI-88/governance-enforcement",
        ).replace("- [ ]", "- [x]").replace("Reviewer: PENDING", "Reviewer: verifier").replace(
            "Result: PENDING", "Result: APPROVED"
        ).replace("Finding: PENDING", "Finding: None")
        write_json(event, pr_event(untouched, branch_sha))
        command("--mode", "ci", *common, expect=1)
        pending = PR_BODY.replace("Reviewer: verifier", "Reviewer: PENDING").replace(
            "Result: APPROVED", "Result: PENDING"
        )
        write_json(event, pr_event(pending, branch_sha))
        command("--mode", "ci", *common, expect=1)

        write_json(event, pr_event(PR_BODY, branch_sha))
        (repo / "dirty.txt").write_text("dirty\n", encoding="utf-8")
        command("--mode", "ci", *common, expect=1)
        (repo / "dirty.txt").unlink()

        git(repo, "switch", "main")
        head = git(repo, "rev-parse", "HEAD")
        write_json(issue, {**valid_issue, "status": "Human Review"})
        review = base / "review.json"
        approved_review = {
            "pull_request": {
                "number": 1,
                "author": "builder",
                "mergedAt": "2026-08-26T00:00:00Z",
                "mergeCommitSha": head,
                "base": "main",
                "body": PR_BODY,
                "head": {"sha": "b" * 40},
            },
            "reviews": [{"reviewer": "verifier", "state": "APPROVED", "commit_id": "b" * 40}],
        }
        write_json(review, approved_review)
        deploy = (
            "--mode", "deploy", "--repo-root", str(repo), "--branch", "main",
            "--issue", "AI-88", "--issue-json", str(issue), "--environment", "production",
            "--review-json", str(review),
        )
        command(*deploy, "--reviewed-sha", head)
        command(*deploy, "--reviewed-sha", "0" * 40, expect=1)
        write_json(
            review,
            {**approved_review, "reviews": [
                {"reviewer": "verifier", "state": "APPROVED"},
                {"reviewer": "verifier", "state": "CHANGES_REQUESTED", "commit_id": "b" * 40},
            ]},
        )
        command(*deploy, "--reviewed-sha", head, expect=1)
        write_json(
            review,
            {**approved_review, "reviews": [
                {"reviewer": "verifier", "state": "APPROVED", "commit_id": "a" * 40}
            ]},
        )
        command(*deploy, "--reviewed-sha", head, expect=1)

        raw = base / "raw-linear.json"
        normalized = base / "normalized-linear.json"
        write_json(raw, {
            "id": "AI-88", "gitBranchName": "owner/ai-88-governance", "status": "Ready",
            "description": CONTRACT, "url": "https://linear.app/ai-spanda/issue/AI-88/example",
            "stateHistory": [{"state": {"name": "Ready"}}],
        })
        env = os.environ.copy()
        env["GOVERNANCE_TEST_MODE"] = "1"
        result = subprocess.run(
            [sys.executable, str(FETCH), "--issue", "AI-88", "--input-json", str(raw), "--output", str(normalized)],
            text=True, capture_output=True, env=env,
        )
        assert result.returncode == 0, result.stdout + result.stderr
        assert json.loads(normalized.read_text(encoding="utf-8"))["branchName"] == "owner/ai-88-governance"
        rpc = {"jsonrpc": "2.0", "id": 7, "result": {"ok": True}}
        encoded = json.dumps(rpc).encode("utf-8")
        assert decode_response(encoded, "application/json", 7) == rpc
        assert decode_response(b"event: message\ndata: " + encoded + b"\n\n", "text/event-stream", 7) == rpc
        status_pr = {
            "head": {"sha": "a" * 40},
            "updated_at": "2026-08-26T12:00:00Z",
            "body": PR_BODY,
        }
        expected_revision = {
            "headSha": "a" * 40,
            "updatedAt": "2026-08-26T12:00:00Z",
            "bodySha256": __import__("hashlib").sha256(PR_BODY.encode("utf-8")).hexdigest(),
        }
        status_sha, payload = status_payload(
            status_pr, "success", "owner/repo", expected_revision
        )
        assert status_sha == "a" * 40 and payload["context"] == "delivery-contract"
        try:
            status_payload(
                {**status_pr, "body": PR_BODY + "\nchanged"},
                "success", "owner/repo", expected_revision,
            )
        except StatusError:
            pass
        else:
            raise AssertionError("A changed pull request accepted an obsolete verified revision.")

        adopted = base / "adopted"
        copy(adopted, "AGENTS.md", ASSETS / "AGENTS.template.md")
        copy(adopted, "docs/GOVERNANCE_ACTIVATION.md", ASSETS / "GOVERNANCE_ACTIVATION.template.md")
        copy(adopted, ".github/pull_request_template.md", ASSETS / "PULL_REQUEST_TEMPLATE.template.md")
        copy(adopted, ".github/workflows/governance.yml", ASSETS / "GOVERNANCE_WORKFLOW.template.yml")
        copy(adopted, ".github/workflows/quality.yml", ASSETS / "QUALITY_WORKFLOW.template.yml")
        copy(adopted, ".github/workflows/release.yml", ASSETS / "RELEASE_WORKFLOW.template.yml")
        copy(adopted, "governance/check_delivery.py", CHECK)
        copy(adopted, "governance/fetch_linear_issue.py", FETCH)
        copy(adopted, "governance/set_pull_request_status.py", STATUS)
        quality_script = adopted / "governance/run_quality.sh"
        quality_script.write_text("#!/usr/bin/env sh\nset -eu\nexit 0\n", encoding="utf-8")
        command("--mode", "audit", "--repo-root", str(adopted))
        (adopted / ".github/workflows/governance.yml").write_text("name: broken\n", encoding="utf-8")
        command("--mode", "audit", "--repo-root", str(adopted), expect=1)

    print("Governance-check tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
