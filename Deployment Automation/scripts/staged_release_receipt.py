#!/usr/bin/env python3
"""Create and validate bounded staged-release evidence receipts."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path


SHA_RE = re.compile(r"^[0-9a-f]{40}$")
DIGEST_RE = re.compile(r"^sha256:[0-9a-f]{64}$")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise ValueError(f"evidence receipt already exists and is immutable: {path}")
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", newline="\n", dir=path.parent, delete=False
    ) as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")
        temporary = Path(handle.name)
    try:
        os.link(temporary, path)
    except FileExistsError as error:
        raise ValueError(f"evidence receipt already exists and is immutable: {path}") from error
    finally:
        temporary.unlink(missing_ok=True)


def sha256_file(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def require_exact_keys(value: object, expected: set[str], label: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    observed = set(value)
    if observed != expected:
        raise ValueError(
            f"{label} fields differ: missing={sorted(expected - observed)}, unknown={sorted(observed - expected)}"
        )
    return value


def require_sha(value: str) -> str:
    if not SHA_RE.fullmatch(value):
        raise ValueError("commit SHA must be 40 lowercase hexadecimal characters")
    return value


def require_digest(value: str) -> str:
    if not DIGEST_RE.fullmatch(value):
        raise ValueError("image digest must be sha256 followed by 64 lowercase hexadecimal characters")
    return value


def hash_files(args: argparse.Namespace) -> None:
    if args.files == "NONE":
        print("NONE")
        return
    root = Path(args.root).resolve()
    digest = hashlib.sha256()
    names = [name.strip() for name in args.files.split(",") if name.strip()]
    if not names:
        raise ValueError("hash file list is empty")
    for name in sorted(set(names)):
        candidate = (root / name).resolve()
        try:
            candidate.relative_to(root)
        except ValueError as error:
            raise ValueError(f"hash input escapes repository root: {name}") from error
        if not candidate.is_file():
            raise ValueError(f"hash input is not a file: {name}")
        digest.update(name.replace("\\", "/").encode("utf-8"))
        digest.update(b"\0")
        digest.update(candidate.read_bytes())
        digest.update(b"\0")
    print(f"sha256:{digest.hexdigest()}")


def build_digest(args: argparse.Namespace) -> None:
    try:
        build = json.load(os.sys.stdin)
    except json.JSONDecodeError as error:
        raise ValueError(f"exact Cloud Build resource is invalid JSON: {error}") from error
    if build.get("id") != args.build_id:
        raise ValueError("Cloud Build resource ID does not match the submitted Build ID")
    if build.get("status") != "SUCCESS":
        raise ValueError(f"Cloud Build status is {build.get('status')!r}, expected 'SUCCESS'")
    if build.get("substitutions", {}).get("COMMIT_SHA") != require_sha(args.commit):
        raise ValueError("Cloud Build COMMIT_SHA does not match the release commit")
    expected_service_account = f"projects/{args.release_project}/serviceAccounts/{args.build_service_account}"
    if build.get("serviceAccount") != expected_service_account:
        raise ValueError("Cloud Build did not use the configured dedicated build service account")
    expected_name = f"{args.image_repository}:{args.commit}"
    matches = [
        image for image in build.get("results", {}).get("images", [])
        if image.get("name") == expected_name
    ]
    if len(matches) != 1:
        raise ValueError("exact Cloud Build resource must contain one matching result image")
    print(require_digest(matches[0].get("digest", "")))


def revision_state(args: argparse.Namespace) -> None:
    try:
        revision = json.load(os.sys.stdin)
    except json.JSONDecodeError as error:
        raise ValueError(f"Cloud Run revision state is invalid JSON: {error}") from error
    spec = require_exact_keys(
        {key: revision.get("spec", {}).get(key) for key in ("serviceAccountName", "containers")},
        {"serviceAccountName", "containers"},
        "revision runtime state",
    )
    if spec["serviceAccountName"] != args.service_account:
        raise ValueError("exact revision uses an unexpected runtime service account")
    containers = spec["containers"]
    if not isinstance(containers, list) or len(containers) != 1 or not isinstance(containers[0], dict):
        raise ValueError("exact revision must contain one container")
    container = containers[0]
    if container.get("image") != f"{args.image_repository}@{require_digest(args.digest)}":
        raise ValueError("exact revision does not use the expected immutable image")
    normalized_env = []
    for item in container.get("env", []):
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            raise ValueError("exact revision contains malformed environment configuration")
        if "value" in item:
            binding = {"name": item["name"], "value": item["value"]}
        elif "valueFrom" in item:
            binding = {"name": item["name"], "valueFrom": item["valueFrom"]}
        else:
            raise ValueError("exact revision environment binding has no value or reference")
        normalized_env.append(binding)
    payload = {
        "serviceAccountName": spec["serviceAccountName"],
        "image": container["image"],
        "env": sorted(normalized_env, key=lambda item: item["name"]),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    print("sha256:" + hashlib.sha256(encoded).hexdigest())


def traffic_state(args: argparse.Namespace) -> None:
    try:
        service = json.load(os.sys.stdin)
    except json.JSONDecodeError as error:
        raise ValueError(f"Cloud Run service state is invalid JSON: {error}") from error
    entries = [
        item for item in service.get("status", {}).get("traffic", [])
        if item.get("revisionName") == args.revision
    ]
    percent = sum(int(item.get("percent", 0) or 0) for item in entries)
    tagged = [item.get("url") for item in entries if item.get("tag") == args.tag and item.get("url")]
    if args.require_tag and len(tagged) != 1:
        raise ValueError(f"exact revision {args.revision} does not have the required unique tag {args.tag}")
    print(f"{percent}\t{tagged[0] if tagged else ''}")


def stage(args: argparse.Namespace) -> None:
    commit = require_sha(args.commit)
    digest = require_digest(args.digest)
    receipt = {
        "schemaVersion": 1,
        "kind": "cloud-run-staging-evidence",
        "createdAt": utc_now(),
        "source": {"branch": args.branch, "commitSha": commit},
        "build": {
            "id": args.build_id,
            "project": args.release_project,
            "serviceAccount": args.build_service_account,
            "imageRepository": args.image_repository,
            "imageTag": f"{args.image_repository}:{commit}",
            "imageDigest": digest,
            "immutableImage": f"{args.image_repository}@{digest}",
            "profileSha256": args.profile_hash,
            "runtimeConfigSha256": args.runtime_config_hash,
            "rulesSha256": args.rules_hash,
        },
        "staging": {
            "project": args.staging_project,
            "service": args.staging_service,
            "region": args.region,
            "revision": args.staging_revision,
            "tag": args.staging_tag,
            "url": args.staging_service_url,
            "tagUrl": args.staging_tag_url,
            "dataBoundary": args.staging_data_boundary,
            "trafficPercent": int(args.staging_traffic),
            "runtimeIdentity": args.staging_runtime_identity,
            "runtimeStateSha256": args.staging_runtime_state_hash,
            "infrastructureVerification": "PASS",
            "testVerification": "PASS",
        },
        "production": {
            "project": args.production_project,
            "service": args.production_service,
            "dataBoundary": args.production_data_boundary,
            "touched": False,
        },
    }
    write_json(Path(args.file), receipt)


def load_validated_stage(args: argparse.Namespace) -> dict:
    path = Path(args.file)
    try:
        receipt = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"staging receipt is unreadable or invalid JSON: {error}") from error

    require_exact_keys(receipt, {"schemaVersion", "kind", "createdAt", "source", "build", "staging", "production"}, "staging receipt")
    require_exact_keys(receipt.get("source"), {"branch", "commitSha"}, "staging receipt source")
    require_exact_keys(receipt.get("build"), {
        "id", "project", "serviceAccount", "imageRepository", "imageTag", "imageDigest", "immutableImage",
        "profileSha256", "runtimeConfigSha256", "rulesSha256",
    }, "staging receipt build")
    require_exact_keys(receipt.get("staging"), {
        "project", "service", "region", "revision", "tag", "url", "tagUrl", "dataBoundary",
        "trafficPercent", "runtimeIdentity", "runtimeStateSha256", "infrastructureVerification", "testVerification",
    }, "staging receipt staging")
    require_exact_keys(receipt.get("production"), {"project", "service", "dataBoundary", "touched"}, "staging receipt production")

    expected = {
        ("schemaVersion",): 1,
        ("kind",): "cloud-run-staging-evidence",
        ("source", "branch"): args.branch,
        ("source", "commitSha"): require_sha(args.commit),
        ("build", "project"): args.release_project,
        ("build", "serviceAccount"): args.build_service_account,
        ("build", "imageRepository"): args.image_repository,
        ("build", "imageTag"): f"{args.image_repository}:{require_sha(args.commit)}",
        ("build", "profileSha256"): args.profile_hash,
        ("build", "runtimeConfigSha256"): args.runtime_config_hash,
        ("build", "rulesSha256"): args.rules_hash,
        ("staging", "project"): args.staging_project,
        ("staging", "service"): args.staging_service,
        ("staging", "region"): args.region,
        ("staging", "revision"): args.expected_staging_revision,
        ("staging", "tag"): args.expected_staging_tag,
        ("staging", "dataBoundary"): args.staging_data_boundary,
        ("staging", "trafficPercent"): args.expected_staging_traffic,
        ("staging", "runtimeIdentity"): args.staging_runtime_identity,
        ("staging", "infrastructureVerification"): "PASS",
        ("staging", "testVerification"): "PASS",
        ("production", "project"): args.production_project,
        ("production", "service"): args.production_service,
        ("production", "dataBoundary"): args.production_data_boundary,
        ("production", "touched"): False,
    }
    for path_parts, expected_value in expected.items():
        value = receipt
        for part in path_parts:
            if not isinstance(value, dict) or part not in value:
                raise ValueError(f"staging receipt is missing {'.'.join(path_parts)}")
            value = value[part]
        if value != expected_value:
            raise ValueError(
                f"staging receipt mismatch for {'.'.join(path_parts)}: expected {expected_value!r}, observed {value!r}"
            )

    digest = require_digest(receipt.get("build", {}).get("imageDigest", ""))
    immutable = receipt.get("build", {}).get("immutableImage")
    if immutable != f"{args.image_repository}@{digest}":
        raise ValueError("staging receipt immutable image does not match repository and digest")
    for field in ("runtimeStateSha256",):
        if not DIGEST_RE.fullmatch(receipt["staging"].get(field, "")):
            raise ValueError(f"staging receipt {field} is malformed")
    for field in ("url", "tagUrl"):
        if not re.fullmatch(r"https://[^\s/]+", receipt["staging"].get(field, "")):
            raise ValueError(f"staging receipt {field} is malformed")

    try:
        created = datetime.fromisoformat(receipt["createdAt"].replace("Z", "+00:00"))
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError("staging receipt createdAt is missing or invalid") from error
    age_hours = (datetime.now(timezone.utc) - created.astimezone(timezone.utc)).total_seconds() / 3600
    if age_hours < -0.1 or age_hours > args.max_age_hours:
        raise ValueError(
            f"staging receipt age is {age_hours:.1f} hours; maximum allowed is {args.max_age_hours}"
        )
    return receipt


def validate(args: argparse.Namespace) -> None:
    receipt = load_validated_stage(args)
    print("\t".join([
        receipt["build"]["imageDigest"],
        receipt["build"]["id"],
        receipt["staging"]["revision"],
        receipt["staging"]["url"],
        receipt["staging"]["tagUrl"],
        receipt["staging"]["runtimeStateSha256"],
    ]))


def promotion(args: argparse.Namespace) -> None:
    staged = load_validated_stage(args)
    digest = staged["build"]["imageDigest"]
    promotion_receipt = {
        "schemaVersion": 1,
        "kind": "cloud-run-promotion-evidence",
        "createdAt": utc_now(),
        "sourceStagingReceipt": {
            "path": str(Path(args.file)),
            "sha256": sha256_file(Path(args.file)),
        },
        "source": staged["source"],
        "build": staged["build"],
        "staging": staged["staging"],
        "production": {
            "project": args.production_project,
            "service": args.production_service,
            "region": args.region,
            "revision": args.production_revision,
            "tag": args.production_tag,
            "url": args.production_service_url,
            "tagUrl": args.production_tag_url,
            "dataBoundary": args.production_data_boundary,
            "trafficPercent": int(args.production_traffic),
            "imageDigest": digest,
            "runtimeIdentity": args.production_runtime_identity,
            "runtimeStateSha256": args.production_runtime_state_hash,
            "infrastructureVerification": "PASS",
            "touched": True,
            "rebuilt": False,
        },
    }
    write_json(Path(args.output), promotion_receipt)


def add_expected(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--file", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--release-project", required=True)
    parser.add_argument("--build-service-account", required=True)
    parser.add_argument("--image-repository", required=True)
    parser.add_argument("--staging-project", required=True)
    parser.add_argument("--staging-service", required=True)
    parser.add_argument("--staging-runtime-identity", required=True)
    parser.add_argument("--expected-staging-revision", required=True)
    parser.add_argument("--expected-staging-tag", required=True)
    parser.add_argument("--expected-staging-traffic", type=int, required=True)
    parser.add_argument("--region", required=True)
    parser.add_argument("--staging-data-boundary", required=True)
    parser.add_argument("--production-project", required=True)
    parser.add_argument("--production-service", required=True)
    parser.add_argument("--production-runtime-identity", required=True)
    parser.add_argument("--production-data-boundary", required=True)
    parser.add_argument("--max-age-hours", type=float, required=True)
    parser.add_argument("--profile-hash", required=True)
    parser.add_argument("--runtime-config-hash", required=True)
    parser.add_argument("--rules-hash", required=True)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser()
    commands = root.add_subparsers(dest="command", required=True)

    stage_parser = commands.add_parser("stage")
    add_expected(stage_parser)
    stage_parser.add_argument("--build-id", required=True)
    stage_parser.add_argument("--digest", required=True)
    stage_parser.add_argument("--staging-revision", required=True)
    stage_parser.add_argument("--staging-tag", required=True)
    stage_parser.add_argument("--staging-service-url", required=True)
    stage_parser.add_argument("--staging-tag-url", required=True)
    stage_parser.add_argument("--staging-traffic", required=True)
    stage_parser.add_argument("--staging-runtime-state-hash", required=True)
    stage_parser.set_defaults(handler=stage)

    validate_parser = commands.add_parser("validate")
    add_expected(validate_parser)
    validate_parser.set_defaults(handler=validate)

    promotion_parser = commands.add_parser("promotion")
    add_expected(promotion_parser)
    promotion_parser.add_argument("--output", required=True)
    promotion_parser.add_argument("--production-revision", required=True)
    promotion_parser.add_argument("--production-tag", required=True)
    promotion_parser.add_argument("--production-service-url", required=True)
    promotion_parser.add_argument("--production-tag-url", required=True)
    promotion_parser.add_argument("--production-traffic", required=True)
    promotion_parser.add_argument("--production-runtime-state-hash", required=True)
    promotion_parser.set_defaults(handler=promotion)

    hash_parser = commands.add_parser("hash-files")
    hash_parser.add_argument("--root", required=True)
    hash_parser.add_argument("--files", required=True)
    hash_parser.set_defaults(handler=hash_files)

    profile_parser = commands.add_parser("hash-profile")
    profile_parser.add_argument("--file", required=True)
    profile_parser.set_defaults(
        handler=lambda args: print(
            "sha256:" + hashlib.sha256(b"profile\0" + Path(args.file).read_bytes()).hexdigest()
        )
    )

    build_parser = commands.add_parser("build-digest")
    build_parser.add_argument("--build-id", required=True)
    build_parser.add_argument("--commit", required=True)
    build_parser.add_argument("--image-repository", required=True)
    build_parser.add_argument("--release-project", required=True)
    build_parser.add_argument("--build-service-account", required=True)
    build_parser.set_defaults(handler=build_digest)

    revision_parser = commands.add_parser("revision-state")
    revision_parser.add_argument("--service-account", required=True)
    revision_parser.add_argument("--image-repository", required=True)
    revision_parser.add_argument("--digest", required=True)
    revision_parser.set_defaults(handler=revision_state)

    traffic_parser = commands.add_parser("traffic-state")
    traffic_parser.add_argument("--revision", required=True)
    traffic_parser.add_argument("--tag", required=True)
    traffic_parser.add_argument("--require-tag", action="store_true")
    traffic_parser.set_defaults(handler=traffic_state)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        args.handler(args)
    except ValueError as error:
        print(f"FAIL: {error}", file=os.sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
