"""Read-only package/profile checks. Never deploys or claims runtime verification."""
import argparse
import json
from pathlib import Path
import re
import tomllib
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
ROLES = {"admin", "publisher", "authorA", "authorB", "commenter", "viewer", "inactive"}
PROFILE_KEYS = {"schemaVersion", "capability", "consumer", "issue", "branch", "stack",
                "environments", "defaultRole", "deletionMode", "fixtureIdentityRefs"}


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def validate_profile(profile):
    errors = []
    if not isinstance(profile, dict):
        return ["profile must be an object"]
    if set(profile) != PROFILE_KEYS:
        errors.append("profile fields do not match the declared schema")
    if profile.get("schemaVersion") != 1 or profile.get("capability") != "blog-community":
        errors.append("unsupported profile version/capability")
    for key in ("consumer", "issue", "branch"):
        if not isinstance(profile.get(key), str) or not profile[key].strip():
            errors.append(f"missing {key}")
    if profile.get("stack") not in {"astro-firebase-cloud-run", "react-vite-flask+blog-service"}:
        errors.append("unsupported stack profile; native React/Flask runtime rewriting is not included")
    if profile.get("defaultRole") != "commenter":
        errors.append("baseline default role must be commenter; policy change needs review")
    if profile.get("deletionMode") != "recoverable-trash":
        errors.append("permanent deletion is not supported by this contract")
    environments = profile.get("environments")
    if not isinstance(environments, dict) or set(environments) != {"staging", "production"}:
        errors.append("explicit staging and production environments are required")
        environments = {}
    values = []
    origins = []
    for name in ("staging", "production"):
        env = environments.get(name)
        if not isinstance(env, dict) or set(env) != {"origin", "dataProject"}:
            errors.append(f"invalid {name} environment fields")
            continue
        try:
            origin = urlparse(env["origin"])
            port = origin.port  # Access also rejects malformed and out-of-range ports.
            valid = (origin.scheme == "https" and origin.hostname and not origin.username
                     and not origin.password and not origin.query and not origin.fragment
                     and origin.path in ("", "/"))
            if valid:
                origins.append((origin.scheme, origin.hostname.lower(),
                                443 if port is None else port))
        except (ValueError, TypeError, AttributeError):
            valid = False
        if not valid:
            errors.append(f"{name} requires an HTTPS origin without credentials")
        if not isinstance(env["dataProject"], str) or not env["dataProject"].strip():
            errors.append(f"{name} data project missing")
        values.append(env)
    if len(values) == 2:
        if len(origins) == 2 and origins[0] == origins[1]:
            errors.append("staging and production origins must differ")
        if values[0]["dataProject"] == values[1]["dataProject"]:
            errors.append("staging and production data projects must differ")
    refs = profile.get("fixtureIdentityRefs")
    if not isinstance(refs, dict) or set(refs) != ROLES:
        errors.append("all isolated fixture identity references are required")
    elif any(not isinstance(v, str) or not v.strip() for v in refs.values()):
        errors.append("fixture identity references must be nonempty strings")
    elif len(set(refs.values())) != len(ROLES):
        errors.append("fixture identities must be distinct")
    return errors


def packaged_file(root, relative):
    """Check package containment and nonempty regular files; do not execute them."""
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        return False
    target = (root / relative).resolve()
    return root.resolve() in target.parents and target.is_file() and target.stat().st_size > 0


def runtime_packaging_errors(root=ROOT):
    """Presence/manifest checks only, not syntax, installation, tests or readiness."""
    errors = []
    for relative in ("runtime/package.json", "runtime/pnpm-lock.yaml", "runtime/server/start.mjs"):
        if not packaged_file(root, relative):
            errors.append(f"RUNTIME_FILE_MISSING: {relative}")
    if errors:
        return errors
    try:
        manifest = load_json(root / "runtime/package.json")
    except (OSError, ValueError, TypeError):
        return ["RUNTIME_MANIFEST_INVALID: package.json must be readable JSON"]
    if not isinstance(manifest, dict):
        return ["RUNTIME_MANIFEST_INVALID: package.json must be an object"]
    if (not isinstance(manifest.get("name"), str) or not manifest["name"].strip()
            or not isinstance(manifest.get("version"), str)
            or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?", manifest["version"])
            or manifest.get("type") != "module"):
        errors.append("RUNTIME_MANIFEST_INVALID: versioned ESM package identity required")
    scripts = manifest.get("scripts")
    if not isinstance(scripts, dict):
        return errors + ["RUNTIME_SCRIPTS_MISSING: scripts must be an object"]
    start = scripts.get("start", "")
    if not isinstance(start, str) or not re.fullmatch(r"node(?: --env-file-if-exists=\.env)? server/start\.mjs", start):
        errors.append("RUNTIME_START_INVALID: start must use packaged server/start.mjs")
    if not isinstance(scripts.get("build"), str) or not scripts["build"].strip():
        errors.append("RUNTIME_BUILD_MISSING: build command required")
    for name in ("test", "test:rules", "test:integration"):
        command = scripts.get(name)
        if not isinstance(command, str) or "node --test " not in command:
            errors.append(f"RUNTIME_TEST_SCRIPT_INVALID: {name}")
            continue
        references = re.findall(r"(?<![\w./])tests/[^\s\"';&|<>]+\.mjs\b", command)
        if not references:
            errors.append(f"RUNTIME_TEST_SCRIPT_INVALID: {name} has no concrete test files")
        for reference in references:
            if (".." in Path(reference).parts or not reference.endswith(".test.mjs")
                    or not packaged_file(root, "runtime/" + reference)):
                errors.append(f"RUNTIME_TEST_FILE_MISSING: {reference}")
    return errors


def validate_package(root=ROOT, require_runtime=False):
    root = Path(root)
    errors = []
    catalogue = load_json(root / "assets/scenarios.json")
    rows = catalogue.get("scenarios", [])
    ids = [row.get("id") for row in rows if isinstance(row, dict)]
    if len(ids) != len(rows) or not ids or len(set(ids)) != len(ids):
        errors.append("scenario IDs must be nonempty and unique")
    required = {"id", "actors", "steps", "expected", "layer", "status", "automationRef"}
    missing_tests = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        sid = row.get("id", "")
        if set(row) != required or not re.fullmatch(r"(AUTH|ROLE|BLOG|EDIT|COM)-[0-9]{2}", str(sid)):
            errors.append("invalid scenario schema")
        if any(not isinstance(row.get(k), str) or not row[k].strip()
               for k in ("actors", "steps", "expected", "layer")):
            errors.append(f"{sid}: missing actionable scenario fields")
        if row.get("status") != "UNPROVEN":
            errors.append(f"{sid}: run evidence must stay outside the reusable specification")
        ref = row.get("automationRef")
        if ref is None:
            missing_tests.append(sid)
        elif not isinstance(ref, str):
            errors.append(f"{sid}: invalid automation reference")
        else:
            target = (root / ref).resolve()
            if (Path(ref).is_absolute() or root.resolve() not in target.parents
                    or not target.is_file()):
                errors.append(f"{sid}: automation must reference an existing packaged file")
    for path in (root / "assets/codex-agents").glob("*.toml"):
        adapter = tomllib.loads(path.read_text(encoding="utf-8"))
        if not all(isinstance(adapter.get(k), str) and adapter[k].strip()
                   for k in ("name", "description", "developer_instructions")):
            errors.append(f"{path.name}: incomplete agent adapter")
        if "model" in adapter or "mcp_servers" in adapter:
            errors.append(f"{path.name}: operator-specific model/tool settings must stay external")
    if require_runtime:
        errors.extend(runtime_packaging_errors(root))
    return errors, ids


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", type=Path)
    parser.add_argument("--contract", type=Path, help="Consumer-owned Markdown contract; compare exact scenario ID set.")
    parser.add_argument("--require-runtime", action="store_true", help="Require packaged runtime entry point, manifest and referenced tests; does not grant release readiness.")
    args = parser.parse_args()
    try:
        errors, ids = validate_package(require_runtime=args.require_runtime)
        if args.profile:
            errors.extend(validate_profile(load_json(args.profile)))
        if args.contract:
            expected = set(re.findall(r"\b(?:AUTH|ROLE|BLOG|EDIT|COM)-[0-9]{2}\b",
                                      args.contract.read_text(encoding="utf-8")))
            if not expected or expected != set(ids):
                errors.append("CONTRACT_DRIFT: scenario IDs do not match the supplied contract")
        runtime_errors = runtime_packaging_errors()
        scenarios = load_json(ROOT / "assets/scenarios.json")["scenarios"]
        missing = [row["id"] for row in scenarios if row.get("automationRef") is None]
        print(json.dumps({"status": "BLOCKED" if errors else "PASS_CONFIG_ONLY",
                          "scenarioCount": len(ids), "runtimePackaged": not runtime_errors,
                          "runtimeReady": False, "missingScenarioAutomation": missing,
                          "coverageNote": "References may cover only part of a scenario; see references/coverage.md. No tests executed by this validator.",
                          "errors": errors}, separators=(",", ":")))
        return 2 if errors else 0
    except (OSError, ValueError, TypeError, KeyError) as error:
        print(json.dumps({"status": "BLOCKED", "runtimePackaged": False, "runtimeReady": False,
                          "errors": [type(error).__name__ + ": invalid or missing package input"]}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
