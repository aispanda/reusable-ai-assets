# RA-002 — Deployment Automation

| Metadata | Value |
|---|---|
| Category | Cloud deployment |
| Select when | Google Cloud Build, Cloud Run, isolated staging, exact-image promotion, preflight, typed approval, release verification or retry safety |
| Entry point | [`deploy.sh`](deploy.sh) |
| Status | Existing reusable toolkit |

## Outcome

Provide a controlled direct deployment flow and an isolated staged-release flow. Staged releases build once, verify an immutable digest against a separate data project, and promote that exact digest without rebuilding. Separately, provide a custom-domain procedure behind its own approvals. No path commits, pushes, creates infrastructure, modifies IAM or executes rollback.

## Transfer manifest

- [`README.md`](README.md): authoritative operating procedure, safety boundaries and configuration.
- [`deploy.sh`](deploy.sh): deployment controller with first/repeat-release readiness classification, explicit-project cloud calls and automatic Cloud Run URL resolution.
- [`staged_release.sh`](staged_release.sh): build-once staging and exact-image promotion controller with separate `STAGE` and `DEPLOY` gates.
- [`STAGED_RELEASE.md`](STAGED_RELEASE.md): isolation, runtime-configuration, evidence and consumer-adoption contract.
- [`stage-cloud-run-release/SKILL.md`](stage-cloud-run-release/SKILL.md): portable Agent Skill entry point.
- [`stage-cloud-run-release/references/node-cloud-verifier.mjs`](stage-cloud-run-release/references/node-cloud-verifier.mjs): portable, shell-free `gcloud` and Firebase Management helpers for Node-based consumer verifiers.
- [`scripts/staged_release_receipt.py`](scripts/staged_release_receipt.py): strict receipt hashing, creation and validation helper.
- [`staged-release.config.example`](staged-release.config.example): replaceable two-environment project profile.
- [`CUSTOM_DOMAIN.md`](CUSTOM_DOMAIN.md): custom-domain mapping, DNS publication and cutover verification.
- [`custom-domain.config.example`](custom-domain.config.example): project-owned domain contract.
- [`scripts/custom_domain/`](scripts/custom_domain/): cloud + registrar DNS helpers (registrar-agnostic core; provider adapters).
- [`scripts/cloud-run-image-access.mjs`](scripts/cloud-run-image-access.mjs): read-only verification of staging and production Cloud Run service agents' effective access to a cross-project image repository; consumer hook integration is required.
- [`test.sh`](test.sh): local-only test suite using stubs; never contacts Google Cloud.
- [`deployment.config.example`](deployment.config.example): per-project configuration contract.
- [`ISSUES_AND_RESOLUTIONS.md`](ISSUES_AND_RESOLUTIONS.md): reusable deployment failures, fixes and prevention gates.
- [`DEPLOY_PROJECT_PROMPT.md`](DEPLOY_PROJECT_PROMPT.md): reusable AI deployment request.
- `examples/`: project request examples; adapt rather than copy facts blindly.

## Use

Follow `README.md` for deploys. For custom domains, follow `CUSTOM_DOMAIN.md` and copy `custom-domain.config.example` into the project. Keep secrets out of configuration.

## Verification

Verify locally with:

```bash
bash "./test.sh"
STAGED_RELEASE_PYTHON=python bash "./test_staged_release.sh"
python -B scripts/test_staged_release_receipt.py
python scripts/custom_domain/test_custom_domain_tools.py
node --test stage-cloud-run-release/references/node-cloud-verifier.test.mjs
node --test scripts/cloud-run-image-access.test.mjs
```

## Boundaries

Deployment is an external state change and always requires its documented preflight and approval gate. Release/build, staging and production must use three distinct projects; staging and production must also have distinct runtime identities and data boundaries. The same image requires runtime-injected environment configuration. Staged builds require a separate artifact-only build identity, read-only effective-isolation/prerequisite verifiers, exact tagged-revision checks and immutable receipts. Authenticated staging journeys use a stable service origin only after it is proven to route to the exact tested revision. First-deployment infrastructure creation remains separately explicit. Custom domains use Cloud Run domain mapping only (no ALB under default zero-cost policy). A project owns its profiles and environment resources; this central toolkit owns reusable behavior.
