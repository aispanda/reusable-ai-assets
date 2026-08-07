# RA-002 — Deployment Automation

| Metadata | Value |
|---|---|
| Category | Cloud deployment |
| Select when | Google Cloud Build, Cloud Run, preflight, typed approval, release verification or retry safety |
| Entry point | [`deploy.sh`](deploy.sh) |
| Status | Existing reusable toolkit |

## Outcome

Provide a controlled manual deployment flow: preflight → exact `DEPLOY` gate → Cloud Build → infrastructure/content verification → handover. It does not commit, push, modify IAM/infrastructure or execute rollback.

## Transfer manifest

- [`README.md`](README.md): authoritative operating procedure, safety boundaries and configuration.
- [`deploy.sh`](deploy.sh): deployment controller with first/repeat-release readiness classification, explicit-project cloud calls and automatic Cloud Run URL resolution.
- [`test.sh`](test.sh): local-only test suite using stubs; never contacts Google Cloud.
- [`deployment.config.example`](deployment.config.example): per-project configuration contract.
- [`ISSUES_AND_RESOLUTIONS.md`](ISSUES_AND_RESOLUTIONS.md): reusable deployment failures, fixes and prevention gates.
- [`DEPLOY_PROJECT_PROMPT.md`](DEPLOY_PROJECT_PROMPT.md): reusable AI deployment request.
- `examples/`: project request examples; adapt rather than copy facts blindly.

## Use

Follow `README.md`. Copy only `deployment.config.example` into a consuming project and keep secrets out of configuration.

## Verification

Verify locally with:

```bash
bash "./test.sh"
```

## Boundaries

Deployment is an external state change and always requires its documented preflight and approval gate. First-deployment infrastructure creation remains separately explicit. A project owns its deployment configuration; this central toolkit owns reusable deployment behavior.
