"""Tests the kit validator, not application behavior."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from validate_contract import ROOT, load_json, validate_package, validate_profile, runtime_packaging_errors


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.profile = load_json(ROOT / "assets/profile.example.json")

    def test_package_and_fictional_profile(self):
        errors, ids = validate_package()
        self.assertEqual(errors, [])
        self.assertEqual(len(ids), 36)
        self.assertEqual(validate_profile(self.profile), [])

    def test_two_consumer_profiles(self):
        second = copy.deepcopy(self.profile)
        second["consumer"] = "other-magazine"
        second["environments"] = {
            "staging": {"origin": "https://staging.other.example", "dataProject": "other-stage"},
            "production": {"origin": "https://other.example", "dataProject": "other-live"}}
        self.assertEqual(validate_profile(second), [])

    def test_react_flask_consumer_uses_standalone_blog_service_profile(self):
        self.profile["stack"] = "react-vite-flask+blog-service"
        self.assertEqual(validate_profile(self.profile), [])
        self.profile["stack"] = "native-react-flask-rewrite"
        self.assertTrue(validate_profile(self.profile))

    def test_missing_and_unknown_fields(self):
        del self.profile["branch"]
        self.assertTrue(validate_profile(self.profile))
        self.profile["apiKey"] = "fictional-not-a-credential"
        self.assertTrue(validate_profile(self.profile))

    def test_isolation_and_role_escalation_rejected(self):
        self.profile["environments"]["production"] = self.profile["environments"]["staging"]
        self.assertTrue(validate_profile(self.profile))
        self.profile["defaultRole"] = "administrator"
        self.assertTrue(validate_profile(self.profile))

    def test_duplicate_fixture_identity_rejected(self):
        self.profile["fixtureIdentityRefs"]["authorB"] = self.profile["fixtureIdentityRefs"]["authorA"]
        self.assertTrue(validate_profile(self.profile))

    def test_equivalent_origins_rejected(self):
        self.profile["environments"]["staging"]["origin"] = "https://journal.example"
        self.profile["environments"]["production"]["origin"] = "https://JOURNAL.EXAMPLE:443/"
        self.assertIn("staging and production origins must differ", validate_profile(self.profile))

    def test_invalid_ports_rejected(self):
        for port in ("notaport", "65536", "-1"):
            with self.subTest(port=port):
                self.profile["environments"]["staging"]["origin"] = "https://journal.example:" + port
                self.assertTrue(validate_profile(self.profile))

    def test_unsafe_origins_and_bad_structures(self):
        for value in ("http://site.example", "https://name:pass@site.example", "https://site.example/path", None):
            with self.subTest(value=value):
                self.profile["environments"]["staging"]["origin"] = value
                self.assertTrue(validate_profile(self.profile))
        self.assertTrue(validate_profile([]))

    def runtime_fixture(self, directory):
        root = Path(directory)
        shutil.copytree(ROOT / "assets", root / "assets")
        (root / "runtime/server").mkdir(parents=True)
        (root / "runtime/tests").mkdir(parents=True)
        # Discovery references are present; no application behavior is asserted.
        for row in load_json(root / "assets/scenarios.json")["scenarios"]:
            if row["automationRef"]:
                (root / row["automationRef"]).write_text("// isolated validator fixture", encoding="utf-8")
        (root / "runtime/server/start.mjs").write_text("// isolated entry fixture", encoding="utf-8")
        (root / "runtime/tests/check.test.mjs").write_text("// isolated test fixture", encoding="utf-8")
        (root / "runtime/pnpm-lock.yaml").write_text("lockfileVersion: '9.0'", encoding="utf-8")
        manifest = {
            "name": "@example/blog", "version": "0.2.0-rc.1", "type": "module",
            "scripts": {"build": "astro build", "start": "node --env-file-if-exists=.env server/start.mjs",
                        "test": "node --test tests/check.test.mjs",
                        "test:rules": "firebase emulators:exec 'node --test tests/check.test.mjs'",
                        "test:integration": "firebase emulators:exec 'node --test tests/check.test.mjs'"}}
        (root / "runtime/package.json").write_text(json.dumps(manifest), encoding="utf-8")
        return root, manifest

    def test_packaged_runtime_passes_presence_gate_without_full_scenario_claim(self):
        with tempfile.TemporaryDirectory() as directory:
            root, _ = self.runtime_fixture(directory)
            errors, ids = validate_package(root, require_runtime=True)
            self.assertEqual(errors, [])
            self.assertEqual(len(ids), 36)
            missing = [r["id"] for r in load_json(root / "assets/scenarios.json")["scenarios"] if r["automationRef"] is None]
            self.assertEqual(missing, [])
            self.assertTrue(all(row["status"] == "UNPROVEN" for row in load_json(root / "assets/scenarios.json")["scenarios"]))

    def test_runtime_gate_rejects_missing_entry_manifest_lock_and_referenced_tests(self):
        for relative in ("runtime/package.json", "runtime/pnpm-lock.yaml", "runtime/server/start.mjs", "runtime/tests/check.test.mjs"):
            with self.subTest(relative=relative), tempfile.TemporaryDirectory() as directory:
                root, _ = self.runtime_fixture(directory)
                (root / relative).unlink()
                errors, _ = validate_package(root, require_runtime=True)
                self.assertTrue(any("RUNTIME_" in error for error in errors))

    def test_runtime_gate_rejects_corrupt_manifests_and_missing_scripts(self):
        for value in ("{bad json", "[]", '{}', '{"name":"example","version":"broken","type":"module"}'):
            with self.subTest(value=value), tempfile.TemporaryDirectory() as directory:
                root, _ = self.runtime_fixture(directory)
                (root / "runtime/package.json").write_text(value, encoding="utf-8")
                self.assertTrue(runtime_packaging_errors(root))

    def test_runtime_test_references_cannot_escape_package(self):
        with tempfile.TemporaryDirectory() as directory:
            root, manifest = self.runtime_fixture(directory)
            manifest["scripts"]["test"] = "node --test tests/../../../outside.test.mjs"
            (root / "runtime/package.json").write_text(json.dumps(manifest), encoding="utf-8")
            self.assertTrue(any("RUNTIME_TEST_FILE_MISSING" in error for error in runtime_packaging_errors(root)))

    def test_cli_distinguishes_packaging_from_runtime_readiness(self):
        command = [sys.executable, "-B", str(ROOT / "scripts/validate_contract.py"), "--profile", str(ROOT / "assets/profile.example.json")]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout)
        report = json.loads(result.stdout)
        self.assertEqual(report["status"], "PASS_CONFIG_ONLY")
        self.assertIs(report["runtimeReady"], False)
        self.assertIsInstance(report["runtimePackaged"], bool)
        self.assertEqual(report["missingScenarioAutomation"], [])
        self.assertIn("No tests executed", report["coverageNote"])

    def test_contract_drift_cli(self):
        _, ids = validate_package()
        with tempfile.TemporaryDirectory() as folder:
            contract = Path(folder) / "contract.md"
            contract.write_text("\n".join(ids), encoding="utf-8")
            command = [sys.executable, "-B", str(ROOT / "scripts/validate_contract.py"), "--contract", str(contract)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout)
            contract.write_text("AUTH-01", encoding="utf-8")
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn("CONTRACT_DRIFT", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=1)
