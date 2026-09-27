#!/usr/bin/env python3
"""Publish the trusted delivery-contract status to the current pull-request head."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

CONTEXT = "delivery-contract"
DESCRIPTIONS = {
    "pending": "Verifying the live Linear and pull-request contract",
    "success": "Live Linear and pull-request contract verified",
    "failure": "Linear or pull-request contract failed",
    "error": "Governance verification could not complete",
}


class StatusError(RuntimeError):
    pass


def request_json(url: str, token: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise StatusError(f"GitHub status request failed with HTTP {exc.code}.") from None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        raise StatusError("GitHub status request failed without usable evidence.") from None
    if not isinstance(result, dict):
        raise StatusError("GitHub returned invalid status evidence.")
    return result


def status_payload(
    pr: dict, state: str, repository: str, expected_revision: dict | None = None
) -> tuple[str, dict]:
    sha = str(pr.get("head", {}).get("sha") or "")
    if len(sha) != 40 or any(char not in "0123456789abcdefABCDEF" for char in sha):
        raise StatusError("GitHub returned an invalid pull-request head SHA.")
    if expected_revision is not None:
        current = {
            "headSha": sha,
            "updatedAt": str(pr.get("updated_at") or pr.get("updatedAt") or "").strip(),
            "bodySha256": hashlib.sha256(str(pr.get("body") or "").encode("utf-8")).hexdigest(),
        }
        if current != expected_revision:
            raise StatusError("Pull request changed after governance verification.")
    run_url = ""
    if os.environ.get("GITHUB_RUN_ID"):
        run_url = (
            f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{repository}/actions/runs/"
            f"{os.environ['GITHUB_RUN_ID']}"
        )
    return sha, {
        "state": state,
        "context": CONTEXT,
        "description": DESCRIPTIONS[state],
        "target_url": run_url,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pr-number", type=int, required=True)
    parser.add_argument("--state", choices=tuple(DESCRIPTIONS), required=True)
    parser.add_argument("--expected-revision")
    args = parser.parse_args()
    try:
        if args.pr_number < 1:
            raise StatusError("Pull-request number must be positive.")
        token = os.environ.get("GITHUB_TOKEN", "").strip()
        repository = os.environ.get("GITHUB_REPOSITORY", "").strip()
        if not token or not repository or "/" not in repository:
            raise StatusError("Protected GitHub status authority is unavailable.")
        if args.state == "success" and not args.expected_revision:
            raise StatusError("Successful status requires the verified pull-request revision.")
        expected = None
        if args.expected_revision:
            expected = json.loads(Path(args.expected_revision).read_text(encoding="utf-8"))
            if not isinstance(expected, dict):
                raise StatusError("Verified pull-request revision is invalid.")
        pr = request_json(f"https://api.github.com/repos/{repository}/pulls/{args.pr_number}", token)
        sha, payload = status_payload(pr, args.state, repository, expected)
        request_json(
            f"https://api.github.com/repos/{repository}/statuses/{sha}",
            token,
            payload,
        )
    except (StatusError, OSError, ValueError) as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 1
    print(f"PASS {CONTEXT} {args.state}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
