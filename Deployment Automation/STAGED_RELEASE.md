# Staged Cloud Run release

Use this path when a dynamic Cloud Run application must be proven against isolated non-production data before production. It complements `deploy.sh`; it does not replace the established direct-release path.

`Source commit -> one build -> immutable digest -> isolated staging -> evidence receipt -> no-traffic production candidate -> exact-revision traffic`

## Non-negotiable boundaries

- Release/build, staging and production use three different Google Cloud projects; staging and production also use different runtime identities and data-boundary identifiers.
- The staging identity must have no production-data access. Cross-project image use is limited to Artifact Registry Reader on the image repository for the relevant Cloud Run service agent.
- Browser-visible environment configuration must be supplied at runtime. A bundle that bakes a production Firebase/API project cannot be accepted as the same image tested in staging.
- The Cloud Build configuration builds and pushes only, and Cloud Build must use a dedicated build identity whose effective access is verified as artifact-only. The YAML keyword scan is advisory; IAM is the enforcement boundary.
- Project-specific isolation and prerequisite commands are read-only verifiers. The controller has no arbitrary setup hook. Rules, runtime profiles and infrastructure changes are completed as separately governed prerequisites and bound through `RULES_FILE` and `RUNTIME_CONFIG_FILES`.
- First-time project, billing, API, repository, service, database, identity, IAM, secret and DNS creation is separate bootstrap work requiring explicit scope and approval.
- Building therefore creates no build, log, source-bucket or artifact state in production.
- Receipts are immutable evidence, not authority. Promotion re-queries the exact Build ID, build identity, digest, tagged staging revision, traffic, runtime identity/configuration fingerprint and current input hashes.

## Project adoption

1. Copy `staged-release.config.example` into the consuming project as an ignored project profile.
2. Add `.release-evidence/` to the project ignore policy.
3. Supply a build-only Cloud Build configuration whose `results.images` contains exactly `IMAGE_REPOSITORY:COMMIT_SHA`; bootstrap a distinct `BUILD_SERVICE_ACCOUNT` with project-scoped log writing, repository-scoped artifact writing, and `SOURCE_BUCKET`-scoped object reading only.
4. Make the application accept environment-specific public configuration at runtime so one digest can safely run in both projects.
5. Bootstrap the two existing Cloud Run services, distinct runtime identities, isolated data projects, rules and repository access separately. The controller never creates or changes those prerequisites.
6. Set the mandatory `ISOLATION_VERIFY_COMMAND` to a read-only consumer test that proves the build identity cannot mutate runtimes/data and the staging identity cannot access production data. The two prerequisite verifiers may be read-only drift checks or `NONE` when the built-in checks fully cover the consumer.
7. Set `STAGING_VERIFY_COMMAND` to the project's real authenticated browser/API journey. After the controller proves the stable staging service origin routes to the exact revision, the command receives that stable origin as `TARGET_URL`, plus `TARGET_PROJECT`, `TARGET_SERVICE`, `TARGET_REGION`, `RELEASE_COMMIT` and `IMAGE_DIGEST`. The controller revalidates the exact revision after the journey.

Keep only the profile and an optional thin launcher in the project. Do not copy `staged_release.sh` or the receipt helper.

## Commands

```bash
STAGED_RELEASE_CONFIG=/project/.staged-release.config bash /library/Deployment\ Automation/staged_release.sh --check
STAGED_RELEASE_CONFIG=/project/.staged-release.config bash /library/Deployment\ Automation/staged_release.sh --stage --dry-run
STAGED_RELEASE_CONFIG=/project/.staged-release.config bash /library/Deployment\ Automation/staged_release.sh --stage
STAGED_RELEASE_CONFIG=/project/.staged-release.config bash /library/Deployment\ Automation/staged_release.sh --verify-stage
STAGED_RELEASE_CONFIG=/project/.staged-release.config bash /library/Deployment\ Automation/staged_release.sh --promote --dry-run
STAGED_RELEASE_CONFIG=/project/.staged-release.config bash /library/Deployment\ Automation/staged_release.sh --promote
```

- `--stage` accepts only `STAGE`. It builds once under the dedicated build identity (or resumes the one exact successful Build ID), retrieves the digest from that resource, deploys a deterministic tagged revision with zero traffic, smokes that tag, routes the isolated staging service to the exact revision, runs the authenticated journey on the service's stable origin, revalidates the exact revision, then atomically creates the staging receipt.
- `--verify-stage` revalidates the receipt, exact Build resource, revision, digest, traffic, URL and project verification command without rebuilding.
- `--promote` accepts only `DEPLOY`. It revalidates staging, deploys the receipt digest to a deterministic tagged production revision with zero traffic, smokes the tag, routes traffic to that exact revision, and writes a separate promotion receipt. It never runs Cloud Build.

## Evidence contract

The ignored staging receipt records:

- source branch and full commit SHA;
- exact Cloud Build ID and dedicated build identity;
- image repository, SHA tag, digest and immutable reference;
- profile, runtime-configuration and rules hashes;
- staging project, service, region, revision, service URL, exact tag URL, runtime identity/configuration fingerprint, data boundary and verification verdicts;
- production target identity with `touched: false`.

The promotion receipt preserves the strict staging evidence, records its SHA-256, and records the exact production revision, tag URL, runtime fingerprint, traffic, digest, `rebuilt: false` and production verification result. Receipt creation fails if the path already exists; receipts must not contain credentials, tokens, command output or user data.

## Verification

```bash
bash test_staged_release.sh
python -B scripts/test_staged_release_receipt.py
```

Run the reusable stub tests before a single bounded live staging build. The consuming project must additionally prove its real authenticated workflow and that production data remains unchanged.
