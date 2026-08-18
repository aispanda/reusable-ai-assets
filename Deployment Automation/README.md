# Deployment Automation

## Start here

- Deploy or decide the next deployment step: read the Preflight and this runbook only.
- Create a branch, PR, merge, or release: complete the Preflight, then follow the relevant numbered step.
- Review or improve this asset/process: read the full governance standard and this full asset before proposing changes.

A reusable wrapper for controlled Google Cloud Build deployments to Cloud Run:

`Preflight -> typed DEPLOY gate -> Cloud Build -> infrastructure/content verification -> handover`

The script never commits, pushes, changes IAM, changes infrastructure settings or executes rollback. Its only production mutation is `gcloud builds submit`, available through `--deploy` after the typed gate.

## Source-publication boundary

Deployment approval does not authorize a commit or push. Before publishing a revision needed by preflight, separately confirm the exact remote URL, branch, repository visibility, commit author, authenticated Git principal, revision and any sensitive/public data in the diff. Obtain explicit source-publication approval for that destination and scope. The toolkit fails closed when local `HEAD` differs from the configured remote branch; it never repairs Git or pushes on the operator's behalf.

Custom hostnames are a **separate** zero-cost flow: [`CUSTOM_DOMAIN.md`](CUSTOM_DOMAIN.md) (Cloud Run domain mapping only — no ALB). Use `scripts/custom_domain/domain_map.sh` and `apply_dns.py`. Deferred enhancements: backlog table in `CUSTOM_DOMAIN.md` (CD-B1…B5).

## Setup

Copy `deployment.config.example` into the consuming project as `deployment.config`, replace every value and keep that project-owned file outside this reusable package.

The consuming project must not retain a second full copy of `deploy.sh`. Its active automation/documentation routers must point to this RA-002 owner. If a stable project-local command is useful, keep only a thin adapter that locates this central script, sets `DEPLOY_CONFIG`, and delegates every argument unchanged. During adoption or upgrade, search active prompts, runbooks and routers for older deployment paths, hard-coded regions and ad-hoc `gcloud run deploy` / Cloud Run source-deploy instructions; retire or mark historical every competing operator path before production use.

```bash
DEPLOY_CONFIG="/path/to/deployment.config" bash "/path/to/deployment-automation/deploy.sh" --check
DEPLOY_CONFIG="/path/to/deployment.config" bash "/path/to/deployment-automation/deploy.sh" --deploy
DEPLOY_CONFIG="/path/to/deployment.config" bash "/path/to/deployment-automation/deploy.sh" --verify
```

On Windows, use Git Bash. If `bash` is not on the PowerShell `PATH`, invoke the installed executable explicitly, commonly `C:\Program Files\Git\bin\bash.exe`; the controller restores Git's `/usr/bin` and `/bin` paths when PowerShell omits them. Pass Windows configuration paths normally; the controller converts them when needed. When PowerShell starts Git Bash with `-lc`, escape spaces inside POSIX paths in the command string, for example `Deployment\ Automation/deploy.sh`; ordinary nested quotes can be consumed before Bash receives them. Keep the repository `cd`, `DEPLOY_CONFIG` and controller call in the same `-lc` command.

Use `--deploy --dry-run` to show the gate and command without submitting anything.

## Custom domains

Custom hostnames are a **separate** procedure from `--deploy`. See [`CUSTOM_DOMAIN.md`](CUSTOM_DOMAIN.md) and copy [`custom-domain.config.example`](custom-domain.config.example) into the project. Registrar is project-chosen (Spaceship is one option among many). Cloud mutation uses approval token `DOMAIN`.

## Approval and retry safety

1. Run `--check`, then `--deploy --dry-run`.
2. Query Cloud Build for the exact commit SHA before opening the gate or retrying.
3. Use one visible deployment process and one approval channel.
4. Accept only the exact token `DEPLOY`; do not infer approval.
5. Do not report deployment as started until `submitting Cloud Build` and a Build ID appear.
6. Give the foreground runner enough time for both preflight and Cloud Build; use at least a 15 minute command timeout when the calling tool imposes one.
7. If the caller times out after submission, do not resubmit. Query Cloud Build by the exact commit SHA, then reconcile the image digest, serving revision, traffic and public route before deciding whether a retry is needed.
8. The handover re-fetches `origin/<branch>` and re-queries the serving revision, traffic and image digest immediately before printing. If any of those moved, it prints `REPORT RECONCILE: STALE` and exits non-zero. Do not copy an earlier commit, revision, traffic, image, test count or issue diagnosis from memory. Use that run's handover block, the current test command, and the project's canonical issue log.

An active AI task may relay an exact user-approved `DEPLOY` token through LF-only POSIX input in the same attached process. A foreground terminal is also valid. Never use a detached console or a pipeline that can append `\r`. When PowerShell wraps Git Bash through `-lc`, prefer the Bash builtin `echo DEPLOY` for the relay. Do not embed `\n` inside a multiply quoted `printf` command unless the received bytes are independently proven; the outer shell may consume the backslash and turn the token into `DEPLOYn`.

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
| `DEPLOY_DOMAIN` | `AUTO` for the Cloud Run origin, or a live origin without trailing slash (set to the custom HTTPS origin after domain cutover) |
| `BUILD_WORKING_DIRECTORY` | build directory relative to repository root |
| `BUILD_COMMAND` | explicitly trusted production-build command |
| `CLOUD_BUILD_CONFIG` | Cloud Build YAML path relative to repository root |
| `IMAGE_REPOSITORY` | image name without the SHA tag |
| `DEFAULT_VERIFY_ROUTE` | verification route beginning with `/` |
| `EXPECTED_TRAFFIC_PERCENT` | expected traffic on the serving revision |

`AUTO` resolves an existing service URL during preflight or classifies a missing service as a first deployment and resolves its URL after the build.

## First-deployment readiness

Preflight checks target-project access independently from the CLI default, active billing, Cloud Build/Artifact Registry/Cloud Run APIs, the target Artifact Registry repository and Cloud Run service existence. A different CLI default project is reported but cannot redirect operations because every cloud call receives the configured project explicitly. Missing APIs or repositories stop before approval with the exact bootstrap prerequisite; infrastructure creation remains a separate explicit decision.

Before release, inspect the container install layer: it must receive every dependency-policy file before installing packages (for example, the package-manager workspace configuration as well as the manifest and lockfile). This prevents local builds from passing while a clean cloud build applies different supply-chain rules.

The configured production build must also leave the repository clean. Preflight checks `git status` again after the build so generated files, formatting changes or line-ending rewrites cannot make the submitted Cloud Build context differ from the commit SHA used as the image tag.

## Secret bootstrap safety

Secret Manager/API enablement, secret creation, IAM bindings and key rotation are infrastructure mutations outside `deploy.sh`; obtain separate explicit approval before each bootstrap scope. Grant runtime access on the individual secret, use a dedicated runtime identity, and prefer a dedicated database or similarly isolated data boundary over a project-wide data role.

On Windows PowerShell, fail closed and use the runtime-compatible instance API. Do not use static `RandomNumberGenerator.Fill`: it is absent on some installed .NET runtimes, and a non-terminating PowerShell error can otherwise leave a zero-filled buffer flowing into Secret Manager.

```powershell
$ErrorActionPreference = 'Stop'
$keyBytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $rng.GetBytes($keyBytes)
  $encodedKey = [Convert]::ToBase64String($keyBytes)
  $encodedKey | & $approvedGcloudPath secrets versions add $approvedSecretName --project=$approvedProject --data-file=-
} finally {
  $rng.Dispose()
  [Array]::Clear($keyBytes, 0, $keyBytes.Length)
  $encodedKey = $null
}
```

Do not print the encoded value. Verify the stored version by capturing `secrets versions access` into memory and reporting only: exact version, 44 Base64 characters, 32 decoded bytes and more than one distinct decoded byte value. Destroy any invalid version before deployment, then pin the verified numeric version in Cloud Run instead of `latest`.

## Test

```bash
bash "./test.sh"
```

The test uses a temporary repository and stubbed commands. It never contacts Google Cloud or deploys.
Its Windows fixture stubs both `curl` and `curl.exe` because the deployment controller deliberately prefers the native executable when available.
The suite includes a standalone `--verify` fixture that must print `REPORT RECONCILE: PASS`, and a fixture where origin moves ahead of HEAD that must print `REPORT RECONCILE: STALE` and exit non-zero.
