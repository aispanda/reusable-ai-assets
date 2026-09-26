#!/usr/bin/env python3

from __future__ import annotations

import argparse
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("staged_release_receipt.py")
SPEC = importlib.util.spec_from_file_location("staged_release_receipt", MODULE_PATH)
assert SPEC and SPEC.loader
receipt = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(receipt)

COMMIT = "a" * 40
DIGEST = "sha256:" + "b" * 64
SERVICE_ACCOUNT_SUFFIX = "iam." + "gserviceaccount.com"
BUILD_ACCOUNT = "fixture-build@release-project-123." + SERVICE_ACCOUNT_SUFFIX


def expected(file: Path) -> argparse.Namespace:
    return argparse.Namespace(
        file=str(file),
        branch="main",
        commit=COMMIT,
        release_project="release-project-123",
        build_service_account=BUILD_ACCOUNT,
        image_repository="us-east1-docker.pkg.dev/release-project-123/repo/web",
        staging_project="stage-project-123",
        staging_service="web-stage",
        staging_runtime_identity="fixture-stage@stage-project-123." + SERVICE_ACCOUNT_SUFFIX,
        expected_staging_revision="web-stage-aaaaaaaaaaaa",
        expected_staging_tag="candidate-aaaaaaaaaaaa",
        expected_staging_traffic=100,
        region="us-east1",
        staging_data_boundary="project:stage-project-123/firestore:(default)",
        production_project="prod-project-123",
        production_service="web",
        production_runtime_identity="fixture-prod@prod-project-123." + SERVICE_ACCOUNT_SUFFIX,
        production_data_boundary="project:prod-project-123/firestore:(default)",
        max_age_hours=72.0,
        profile_hash="sha256:" + "c" * 64,
        runtime_config_hash="sha256:" + "d" * 64,
        rules_hash="sha256:" + "e" * 64,
    )


class ReceiptTests(unittest.TestCase):
    @staticmethod
    def stage_args(path: Path) -> argparse.Namespace:
        args = expected(path)
        args.build_id = "11111111-1111-1111-1111-111111111111"
        args.digest = DIGEST
        args.staging_revision = "web-stage-aaaaaaaaaaaa"
        args.staging_tag = "candidate-aaaaaaaaaaaa"
        args.staging_service_url = "https://stage.example.test"
        args.staging_tag_url = "https://candidate-stage.example.test"
        args.staging_traffic = "100"
        args.staging_runtime_state_hash = "sha256:" + "1" * 64
        return args

    def test_stage_receipt_validates_and_binds_hashes(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "stage.json"
            args = self.stage_args(path)
            receipt.stage(args)

            with contextlib.redirect_stdout(io.StringIO()) as output:
                receipt.validate(expected(path))
            fields = output.getvalue().strip().split("\t")
            self.assertEqual(fields[0], DIGEST)
            self.assertEqual(fields[2], "web-stage-aaaaaaaaaaaa")

            payload = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(payload["build"]["rulesSha256"], "sha256:" + "e" * 64)
            self.assertFalse(payload["production"]["touched"])

    def test_tampered_receipt_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "stage.json"
            args = self.stage_args(path)
            receipt.stage(args)
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["build"]["runtimeConfigSha256"] = "sha256:" + "f" * 64
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "runtimeConfigSha256"):
                receipt.load_validated_stage(expected(path))

    def test_tampered_image_tag_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "stage.json"
            args = self.stage_args(path)
            receipt.stage(args)
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["build"]["imageTag"] = "attacker.example/repo/web:latest"
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "imageTag"):
                receipt.load_validated_stage(expected(path))

    def test_receipts_are_immutable_strict_and_promotion_binds_source_hash(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "stage.json"
            receipt.stage(self.stage_args(path))
            with self.assertRaisesRegex(ValueError, "immutable"):
                receipt.stage(self.stage_args(path))

            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["unexpected"] = True
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "unknown"):
                receipt.load_validated_stage(expected(path))

            del payload["unexpected"]
            path.write_text(json.dumps(payload), encoding="utf-8")
            promotion_args = expected(path)
            promotion_args.output = str(Path(temp) / "production.json")
            promotion_args.production_revision = "web-aaaaaaaaaaaa"
            promotion_args.production_tag = "candidate-aaaaaaaaaaaa"
            promotion_args.production_service_url = "https://prod.example.test"
            promotion_args.production_tag_url = "https://candidate-prod.example.test"
            promotion_args.production_traffic = "100"
            promotion_args.production_runtime_state_hash = "sha256:" + "2" * 64
            receipt.promotion(promotion_args)
            promoted = json.loads(Path(promotion_args.output).read_text(encoding="utf-8"))
            self.assertEqual(promoted["sourceStagingReceipt"]["sha256"], receipt.sha256_file(path))

    def test_exact_build_resource_selects_one_expected_digest(self) -> None:
        build = {
            "id": "11111111-1111-1111-1111-111111111111",
            "status": "SUCCESS",
            "serviceAccount": "projects/release-project-123/serviceAccounts/" + BUILD_ACCOUNT,
            "substitutions": {"COMMIT_SHA": COMMIT},
            "results": {"images": [
                {"name": "unrelated/image:tag", "digest": "sha256:" + "1" * 64},
                {"name": "repo/image:" + COMMIT, "digest": DIGEST},
            ]},
        }
        args = argparse.Namespace(
            build_id=build["id"], commit=COMMIT, image_repository="repo/image",
            release_project="release-project-123",
            build_service_account=BUILD_ACCOUNT,
        )
        with patch("sys.stdin", io.StringIO(json.dumps(build))):
            with contextlib.redirect_stdout(io.StringIO()) as output:
                receipt.build_digest(args)
        self.assertEqual(output.getvalue().strip(), DIGEST)

    def test_build_with_wrong_commit_is_rejected(self) -> None:
        build = {
            "id": "11111111-1111-1111-1111-111111111111",
            "status": "SUCCESS",
            "serviceAccount": "projects/release-project-123/serviceAccounts/" + BUILD_ACCOUNT,
            "substitutions": {"COMMIT_SHA": "0" * 40},
            "results": {"images": [{"name": "repo/image:" + COMMIT, "digest": DIGEST}]},
        }
        args = argparse.Namespace(
            build_id=build["id"], commit=COMMIT, image_repository="repo/image",
            release_project="release-project-123",
            build_service_account=BUILD_ACCOUNT,
        )
        with patch("sys.stdin", io.StringIO(json.dumps(build))):
            with self.assertRaisesRegex(ValueError, "COMMIT_SHA"):
                receipt.build_digest(args)

    def test_traffic_selection_is_revision_specific_and_order_independent(self) -> None:
        service = {"status": {"traffic": [
            {"revisionName": "other", "percent": 95},
            {"revisionName": "target", "percent": 5, "tag": "candidate", "url": "https://candidate.test"},
        ]}}
        args = argparse.Namespace(revision="target", tag="candidate", require_tag=True)
        with patch("sys.stdin", io.StringIO(json.dumps(service))):
            with contextlib.redirect_stdout(io.StringIO()) as output:
                receipt.traffic_state(args)
        self.assertEqual(output.getvalue().strip(), "5\thttps://candidate.test")

    def test_hash_files_rejects_escape(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "root"
            root.mkdir()
            outside = Path(temp) / "outside.txt"
            outside.write_text("private", encoding="utf-8")
            args = argparse.Namespace(root=str(root), files="../outside.txt")
            with self.assertRaisesRegex(ValueError, "escapes"):
                receipt.hash_files(args)


if __name__ == "__main__":
    unittest.main()
