#!/usr/bin/env python3
"""Fail-closed AI Spanda issue, Git, pull-request, and release preflight."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ISSUE_RE = re.compile(r"(?:^|/)(AI-\d+)(?:-|$)", re.IGNORECASE)
HEADING_RE = re.compile(r"^#{2,3}\s+(.+?)\s*$", re.MULTILINE)
PLACEHOLDER_RE = re.compile(r"\b(?:TBD|TBC|TODO|PENDING)\b|<[^>\r\n]+>", re.IGNORECASE)
REQUIRED_HEADINGS = {"change", "done when", "evidence", "deployment"}
WORK_STATES = {
    "ready", "in progress", "ai verification", "human review", "in review", "release verification",
}
DEPLOY_STATES = {"human review", "in review", "release verification"}
ADOPTION_FILES = (
    "AGENTS.md",
    "docs/GOVERNANCE_ACTIVATION.md",
    "governance/run_quality.sh",
    ".github/pull_request_template.md",
    ".github/workflows/governance.yml",
    ".github/workflows/quality.yml",
    ".github/workflows/release.yml",
)
ADOPTION_MARKERS = {
    "AGENTS.md": (
        "AI-Spanda-Engineering-Delivery-AI-Agent-Governance-Standard-v1",
        "check_delivery.py",
        "reviewed merged SHA",
    ),
    "docs/GOVERNANCE_ACTIVATION.md": (
        "delivery-contract", "repository-quality", "production", "TFY_API_KEY",
    ),
    "governance/run_quality.sh": ("#!/usr/bin/env sh",),
    ".github/pull_request_template.md": (
        "## Linear issue", "## Evidence", "## Independent verifier", "Result: PENDING", "## Deployment",
    ),
    ".github/workflows/governance.yml": (
        "pull_request_target:", "github.event.repository.default_branch", "TFY_API_KEY",
        "concurrency:", "fetch_linear_issue.py", "set_pull_request_status.py", "--mode ci",
        "--revision-output", "--expected-revision",
    ),
    ".github/workflows/quality.yml": ("pull_request:", "--mode audit", "run_quality.sh"),
    ".github/workflows/release.yml": (
        "workflow_dispatch:", "environment: production", "TFY_API_KEY", "--mode deploy",
    ),
}


class GateError(RuntimeError):
    pass


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), *args], text=True, capture_output=True, check=False
    )
    if result.returncode:
        raise GateError(f"Git command failed: {' '.join(args)}")
    return result.stdout.strip()


def branch_name(root: Path, supplied: str | None) -> str:
    return supplied or os.environ.get("GITHUB_HEAD_REF") or git(root, "branch", "--show-current")


def issue_from_branch(branch: str) -> str:
    match = ISSUE_RE.search(branch)
    if not match:
        raise GateError("Branch must contain an issue key such as AI-88.")
    return match.group(1).upper()


def load_json(path: str | None) -> dict:
    if not path:
        return {}
    return json.loads(Path(path).read_text(encoding="utf-8"))


def normalize_issue(raw: dict, expected: str) -> tuple[str, str, str, list]:
    identifier = str(raw.get("identifier") or raw.get("id") or "").upper()
    state = raw.get("state")
    status = state.get("name", "") if isinstance(state, dict) else raw.get("status", state or "")
    description = raw.get("description") or ""
    canonical_branch = raw.get("branchName") or raw.get("gitBranchName") or raw.get("branch_name") or ""
    history = raw.get("stateHistory") or raw.get("state_history") or []
    if identifier != expected:
        raise GateError(f"Issue evidence is for {identifier or 'UNKNOWN'}, expected {expected}.")
    return str(status).strip(), description, str(canonical_branch).strip(), history


def sections(markdown: str) -> dict[str, str]:
    matches = list(HEADING_RE.finditer(markdown))
    return {
        match.group(1).strip().casefold(): markdown[
            match.end() : matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        ].strip()
        for index, match in enumerate(matches)
    }


def issue_url_pattern(identifier: str) -> re.Pattern[str]:
    return re.compile(
        rf"https://linear\.app/[^/\s)]+/issue/{re.escape(identifier)}(?:/|[\s)]|$)",
        re.IGNORECASE,
    )


def check_contract(
    identifier: str, status: str, description: str, deploy: bool, state_history: list
) -> None:
    allowed = DEPLOY_STATES if deploy else WORK_STATES
    if status.casefold() not in allowed:
        raise GateError(f"{identifier} status {status or 'UNKNOWN'} is not allowed for this gate.")
    prior_states = {
        str(entry.get("state", {}).get("name") or entry.get("name") or "").casefold()
        for entry in state_history
        if isinstance(entry, dict)
    }
    if status.casefold() != "ready" and "ready" not in prior_states:
        raise GateError(f"{identifier} has no verified Ready-state history.")
    contract = sections(description)
    missing = sorted(heading for heading in REQUIRED_HEADINGS if not contract.get(heading))
    if not any(contract.get(heading) for heading in ("user story", "user impact")):
        missing.insert(0, "user story or user impact")
    if missing:
        raise GateError("Linear contract is missing: " + ", ".join(missing) + ".")
    required_sections = [*REQUIRED_HEADINGS]
    required_sections.append("user story" if contract.get("user story") else "user impact")
    placeholders = [
        heading for heading in required_sections
        if PLACEHOLDER_RE.search(contract[heading])
    ]
    if placeholders:
        raise GateError("Linear contract contains placeholders: " + ", ".join(sorted(placeholders)) + ".")


def check_pr(event: dict, identifier: str, branch: str) -> None:
    pr = event.get("pull_request")
    if not pr:
        raise GateError("Pull-request event evidence is required in CI mode.")
    event_branch = str(pr.get("head", {}).get("ref") or "")
    if event_branch and event_branch != branch:
        raise GateError("Pull-request head branch does not match the verified branch.")
    body = pr.get("body") or ""
    if not issue_url_pattern(identifier).search(body):
        raise GateError(f"Pull request must contain the Linear URL for {identifier}.")
    contract = sections(body)
    required = {"change", "evidence", "independent verifier", "deployment"}
    missing = sorted(heading for heading in required if not contract.get(heading))
    if missing:
        raise GateError("Pull request is missing: " + ", ".join(missing) + ".")
    placeholders = [heading for heading in required if PLACEHOLDER_RE.search(contract[heading])]
    if placeholders:
        raise GateError(
            "Pull request contains placeholders: " + ", ".join(sorted(placeholders)) + "."
        )
    template_sentinels = {
        "change": "Smallest observable change and its canonical owner.",
        "deployment": "`not applicable`, `later`, or the protected production path and verification required.",
    }
    unchanged = [
        heading for heading, sentinel in template_sentinels.items()
        if contract[heading].strip() == sentinel
    ]
    if unchanged:
        raise GateError(
            "Pull request retains template text: " + ", ".join(sorted(unchanged)) + "."
        )
    evidence = contract["evidence"]
    checked = re.findall(r"^\s*-\s*\[x\]\s*(.*?)\s*$", evidence, re.IGNORECASE | re.MULTILINE)
    if not checked or "- [ ]" in evidence.casefold() or any(not item.strip(" `:-") for item in checked):
        raise GateError("Pull-request evidence must contain completed checks and no unchecked items.")
    if any(item.strip().casefold() in {"deterministic checks", "acceptance outcome"} for item in checked):
        raise GateError("Pull-request evidence must replace template labels with actual results.")
    verifier = contract["independent verifier"]
    if not re.search(r"^Reviewer:\s*(?!PENDING\s*$).+", verifier, re.IGNORECASE | re.MULTILINE):
        raise GateError("Pull request must name an independent verifier.")
    if not re.search(r"^Result:\s*APPROVED\s*$", verifier, re.IGNORECASE | re.MULTILINE):
        raise GateError("Independent verifier result must be APPROVED.")


def pull_request_evidence(event_json: str | None, pr_number: int | None) -> dict:
    if event_json:
        if os.environ.get("GOVERNANCE_TEST_MODE") != "1":
            raise GateError("Pull-request fixtures are allowed only in deterministic test mode.")
        return load_json(event_json)
    if not pr_number or pr_number < 1:
        raise GateError("A live pull-request number is required in CI mode.")
    repository = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if not repository or "/" not in repository:
        raise GateError("GitHub repository identity is unavailable.")
    pr = github_json(f"https://api.github.com/repos/{repository}/pulls/{pr_number}")
    if not isinstance(pr, dict):
        raise GateError("GitHub returned invalid pull-request evidence.")
    return {"pull_request": pr}


def pull_request_revision(event: dict) -> dict[str, str]:
    pr = event.get("pull_request") or {}
    sha = str(pr.get("head", {}).get("sha") or "")
    updated_at = str(pr.get("updated_at") or pr.get("updatedAt") or "").strip()
    if len(sha) != 40 or any(char not in "0123456789abcdefABCDEF" for char in sha):
        raise GateError("GitHub returned an invalid pull-request head SHA.")
    if not updated_at:
        raise GateError("GitHub returned no pull-request revision timestamp.")
    body = str(pr.get("body") or "")
    return {
        "headSha": sha,
        "updatedAt": updated_at,
        "bodySha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
    }


def check_clean(root: Path) -> None:
    if git(root, "status", "--porcelain", "--untracked-files=all"):
        raise GateError("Working tree is not clean.")


def github_json(url: str) -> object:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        raise GateError("Protected GitHub review credential is unavailable.")
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise GateError(f"GitHub review lookup failed with HTTP {exc.code}.") from None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        raise GateError("GitHub review lookup failed without usable evidence.") from None


def fetch_review_evidence(head: str) -> dict:
    repository = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if not repository or "/" not in repository:
        raise GateError("GitHub repository identity is unavailable.")
    encoded_sha = urllib.parse.quote(head, safe="")
    pulls = github_json(f"https://api.github.com/repos/{repository}/commits/{encoded_sha}/pulls")
    if not isinstance(pulls, list):
        raise GateError("GitHub returned invalid pull-request evidence.")
    merged = next(
        (
            pr for pr in pulls
            if pr.get("merged_at")
            and pr.get("merge_commit_sha") == head
            and pr.get("base", {}).get("ref") == "main"
        ),
        None,
    )
    if not merged:
        raise GateError("HEAD is not a reviewed pull-request merge commit on main.")
    reviews: list[dict] = []
    page = 1
    while True:
        page_reviews = github_json(
            f"https://api.github.com/repos/{repository}/pulls/{merged['number']}/reviews"
            f"?per_page=100&page={page}"
        )
        if not isinstance(page_reviews, list):
            raise GateError("GitHub returned invalid review evidence.")
        reviews.extend(page_reviews)
        if len(page_reviews) < 100:
            break
        page += 1
    return {"pull_request": merged, "reviews": reviews}


def review_evidence(path: str | None, head: str) -> dict:
    if path:
        if os.environ.get("GOVERNANCE_TEST_MODE") != "1":
            raise GateError("Review fixtures are allowed only in deterministic test mode.")
        return load_json(path)
    return fetch_review_evidence(head)


def check_review(evidence: dict, identifier: str, head: str) -> None:
    pr = evidence.get("pull_request") or {}
    merged_at = pr.get("merged_at") or pr.get("mergedAt")
    merge_sha = pr.get("merge_commit_sha") or pr.get("mergeCommitSha")
    base = pr.get("base")
    base_branch = base.get("ref") if isinstance(base, dict) else base
    body = pr.get("body") or ""
    author = pr.get("user", {}).get("login") if isinstance(pr.get("user"), dict) else pr.get("author")
    pr_head = pr.get("head")
    pr_head_sha = pr_head.get("sha") if isinstance(pr_head, dict) else pr.get("headSha")
    if not merged_at or merge_sha != head or base_branch != "main":
        raise GateError("GitHub evidence does not prove a merged main pull request for HEAD.")
    if not pr_head_sha:
        raise GateError("GitHub evidence does not identify the final pull-request head commit.")
    if not issue_url_pattern(identifier).search(body):
        raise GateError(f"Merged pull request does not link {identifier}.")
    latest: dict[str, tuple[str, str]] = {}
    for review in evidence.get("reviews") or []:
        user = review.get("user")
        login = user.get("login") if isinstance(user, dict) else review.get("reviewer")
        if login:
            latest[str(login).casefold()] = (
                str(review.get("state") or "").upper(),
                str(review.get("commit_id") or review.get("commitId") or ""),
            )
    approved = [
        login for login, (state, commit_id) in latest.items()
        if state == "APPROVED" and commit_id == pr_head_sha
    ]
    if not approved or (author and all(login == str(author).casefold() for login in approved)):
        raise GateError("No current independent GitHub approval exists for the merged pull request.")


def check_deploy(
    root: Path,
    branch: str,
    identifier: str,
    reviewed_sha: str | None,
    environment: str | None,
    review_json: str | None,
) -> None:
    if branch != "main":
        raise GateError("Production publication is allowed only from main.")
    if environment != "production":
        raise GateError("Production publication requires the protected production environment.")
    head = git(root, "rev-parse", "HEAD")
    if not reviewed_sha or reviewed_sha != head:
        raise GateError("Reviewed SHA does not match HEAD.")
    if git(root, "rev-parse", "origin/main") != head:
        raise GateError("HEAD is not the current origin/main revision.")
    check_review(review_evidence(review_json, head), identifier, head)


def check_adoption(root: Path, checker_path: str, fetcher_path: str, status_path: str) -> None:
    paths = (*ADOPTION_FILES, checker_path, fetcher_path, status_path)
    missing = [path for path in paths if not (root / path).is_file()]
    if missing:
        raise GateError("Governance adoption is missing: " + ", ".join(missing) + ".")
    invalid = []
    for path, markers in ADOPTION_MARKERS.items():
        content = (root / path).read_text(encoding="utf-8")
        if any(marker not in content for marker in markers):
            invalid.append(path)
    checker = (root / checker_path).read_text(encoding="utf-8")
    if any(marker not in checker for marker in (
        "def check_pr", "def pull_request_revision", "def check_deploy", "commit_id",
        "def check_adoption",
    )):
        invalid.append(checker_path)
    fetcher = (root / fetcher_path).read_text(encoding="utf-8")
    if any(marker not in fetcher for marker in ("TFY_API_KEY", '"tools/list"', '"tools/call"')):
        invalid.append(fetcher_path)
    status_setter = (root / status_path).read_text(encoding="utf-8")
    if any(marker not in status_setter for marker in (
        "delivery-contract", "statuses", "--expected-revision",
    )):
        invalid.append(status_path)
    quality = (root / "governance/run_quality.sh").read_text(encoding="utf-8")
    if "CONFIGURE_PROJECT_QUALITY_COMMANDS" in quality:
        invalid.append("governance/run_quality.sh")
    privileged = (root / ".github/workflows/governance.yml").read_text(encoding="utf-8")
    if re.search(r"^\s*ref:\s*\$\{\{\s*github\.event\.pull_request\.head", privileged, re.MULTILINE):
        invalid.append(".github/workflows/governance.yml")
    if invalid:
        raise GateError("Governance adoption is incomplete: " + ", ".join(sorted(set(invalid))) + ".")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("local", "ci", "deploy", "audit"), required=True)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--branch")
    parser.add_argument("--issue")
    parser.add_argument("--issue-json")
    parser.add_argument("--event-json")
    parser.add_argument("--pr-number", type=int)
    parser.add_argument("--revision-output")
    parser.add_argument("--reviewed-sha")
    parser.add_argument("--review-json")
    parser.add_argument("--environment")
    parser.add_argument("--checker-path", default="governance/check_delivery.py")
    parser.add_argument("--fetcher-path", default="governance/fetch_linear_issue.py")
    parser.add_argument("--status-path", default="governance/set_pull_request_status.py")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.repo_root).expanduser().resolve()
    try:
        if args.mode == "audit":
            check_adoption(root, args.checker_path, args.fetcher_path, args.status_path)
            print("PASS governance structure; remote controls require external verification")
            return 0
        branch = branch_name(root, args.branch)
        identifier = (args.issue or issue_from_branch(branch)).upper()
        issue = load_json(args.issue_json)
        if not issue:
            raise GateError("Verified TrueFoundry Linear issue evidence is required.")
        status, description, canonical_branch, state_history = normalize_issue(issue, identifier)
        check_contract(identifier, status, description, args.mode == "deploy", state_history)
        if args.mode != "deploy" and canonical_branch.casefold() != branch.casefold():
            raise GateError("Branch does not match the branch generated by the Linear issue.")
        if args.mode == "ci":
            if not args.revision_output:
                raise GateError("CI mode requires a verified pull-request revision output.")
            pr_evidence = pull_request_evidence(args.event_json, args.pr_number)
            check_pr(pr_evidence, identifier, branch)
        check_clean(root)
        if args.mode == "ci":
            Path(args.revision_output).write_text(
                json.dumps(pull_request_revision(pr_evidence), sort_keys=True), encoding="utf-8"
            )
        if args.mode == "deploy":
            check_deploy(
                root, branch, identifier, args.reviewed_sha, args.environment, args.review_json
            )
    except (GateError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 1
    print(f"PASS {args.mode} {identifier} {status}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
