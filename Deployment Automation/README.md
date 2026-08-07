# Deployment Automation

A reusable wrapper for controlled Google Cloud Build deployments to Cloud Run:

`Preflight -> typed DEPLOY gate -> Cloud Build -> infrastructure/content verification -> handover`

The script never commits, pushes, changes IAM, changes infrastructure settings or executes rollback. Its only production mutation is `gcloud builds submit`, available through `--deploy` after the typed gate.

## Setup

Copy `deployment.config.example` into the consuming project as `deployment.config`, replace every value and keep that project-owned file outside this reusable package.

```bash
DEPLOY_CONFIG="/path/to/deployment.config" bash "/path/to/deployment-automation/deploy.sh" --check
DEPLOY_CONFIG="/path/to/deployment.config" bash "/path/to/deployment-automation/deploy.sh" --deploy
DEPLOY_CONFIG="/path/to/deployment.config" bash "/path/to/deployment-automation/deploy.sh" --verify
```

Use `--deploy --dry-run` to show the gate and command without submitting anything.

## Approval and retry safety

1. Run `--check`, then `--deploy --dry-run`.
2. Query Cloud Build for the exact commit SHA before opening the gate or retrying.
3. Use one visible deployment process and one approval channel.
4. Accept only the exact token `DEPLOY`; do not infer approval.
5. Do not report deployment as started until `submitting Cloud Build` and a Build ID appear.

An active AI task may relay an exact user-approved `DEPLOY` token through LF-only POSIX input in the same attached process. A foreground terminal is also valid. Never use a detached console or a pipeline that can append `\r`.

Classify failures as preflight, approval transport, submission/build or post-deploy verification. Verify complete public redirect chains; an internal scheme or port is a defect.

## Agent deployment prompts

- [`DEPLOY_PROJECT_PROMPT.md`](DEPLOY_PROJECT_PROMPT.md): reusable request.
- [`examples/sample-deploy-request.md`](examples/sample-deploy-request.md): fictional editable example.

## Configuration

Configuration is restricted data, never sourced or evaluated. Use unquoted `KEY=VALUE`, one entry per line, optional blank lines and full-line comments. Unknown, duplicate, missing or malformed keys stop execution.

| Key | Meaning |
|---|---|
| `DEPLOY_PROJECT` | Google Cloud project ID |
| `DEPLOY_SERVICE` | Cloud Run service name |
| `DEPLOY_REGION` | Cloud Run region |
| `DEPLOY_BRANCH` | required local and remote branch |
| `DEPLOY_DOMAIN` | live origin without trailing slash |
| `BUILD_WORKING_DIRECTORY` | build directory relative to repository root |
| `BUILD_COMMAND` | explicitly trusted production-build command |
| `CLOUD_BUILD_CONFIG` | Cloud Build YAML path relative to repository root |
| `IMAGE_REPOSITORY` | image name without the SHA tag |
| `DEFAULT_VERIFY_ROUTE` | verification route beginning with `/` |
| `EXPECTED_TRAFFIC_PERCENT` | expected traffic on the serving revision |

## Test

```bash
bash "./test.sh"
```

The test uses a temporary repository and stubbed commands. It never contacts Google Cloud or deploys.
