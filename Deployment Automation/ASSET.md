# RA-002 — Deployment Automation

| Metadata | Value |
|---|---|
| Category | Cloud deployment |
| Select when | Google Cloud Build, Cloud Run, preflight, typed approval, release verification or retry safety |
| Entry point | [`deploy.sh`](deploy.sh) |
| Status | Existing reusable toolkit |

## Outcome

Provide a controlled manual deployment flow: preflight → exact `DEPLOY` gate → Cloud Build → infrastructure/content verification → handover. Separately, provide a custom-domain procedure (GCP mapping + registrar DNS adapters) behind its own approvals. Deploy path does not commit, push, modify IAM or execute rollback; domain path mutates only after explicit `DOMAIN`/DNS gates.

## Transfer manifest

- [`README.md`](README.md): authoritative operating procedure, safety boundaries and configuration.
- [`deploy.sh`](deploy.sh): deployment controller with first/repeat-release readiness classification, explicit-project cloud calls and automatic Cloud Run URL resolution.
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
python scripts/custom_domain/test_custom_domain_tools.py
node --test scripts/cloud-run-image-access.test.mjs
```

## Boundaries

Deployment is an external state change and always requires its documented preflight and approval gate. First-deployment infrastructure creation remains separately explicit. Custom domains use Cloud Run domain mapping only (no ALB under default zero-cost policy). A project owns its deployment and domain configuration; this central toolkit owns reusable behavior. See `CUSTOM_DOMAIN.md` backlog CD-B1…B5 before proposing a new domain-related inventory asset.
