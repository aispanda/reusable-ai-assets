# Deterministic adoption driver

`node scripts/adopt.mjs plan PROFILE ENVIRONMENT` checks the exact archive hash/version,
profile environment, prerequisite hashes, executable pins and install-root ownership.
Plan writes nothing and runs no configured commands. Profiles are trusted local executable
configuration, never accepted from website visitors or an unreviewed remote source.

`install` creates a dedicated owned root, calls the existing hash-pinned package installer,
runs explicit consumer verification, and rechecks installed integrity. Repeating it verifies
the same files and reruns tests. It never overwrites an unmanaged directory. Ownership is
bound to site + environment + canonical install root, not a particular profile revision.
For an upgrade in the same root, add `expectedPreviousPackageSha256` equal to the last
successfully verified package's hash. Missing/wrong previous hashes block changes. A repeat
of the already verified target is idempotent even with the original upgrade profile.
Configuration changes for the same owner rerun all pins and checks. A root-level lock prevents
concurrent adoptions; interrupted locks require inspection, never automatic removal.
The owner marker advances atomically only after verification succeeds, and older package
directories remain untouched. This is package adoption state, not the hosted release state.
`verify` requires an existing owned root, uses the same integrity checks and reruns tests.
No dependencies, cloud resources, administrator accounts, IAM grants, or data are created.

Use `assets/adoption-profile.example.json` as a deliberately invalid fictional template.
Paths must be absolute (Windows paths are accepted on Windows). The parent of installRoot
must already exist. Pin the actual site's configuration, lockfile, test scripts, and relevant
adapter sources as prerequisites. Point consumer tests at the installed release. Commands
use executable + argv with shell disabled. Never place secrets in args or the profile.
Verification commands are consumer-owned and must exercise relevant acceptance behavior;
an exit-zero placeholder proves nothing. Tests rerun every adoption, so no environment or
dependency change is covered by a stale cache. Evidence reports paths/hashes, platform,
Node version, exit codes and output digests; it does not print child output or credentials.
On failure, rerun the named command locally to inspect output. Each command is time/output
bounded; test runners must own and clean up child services rather than leave detached daemons.

## Existing deployment owner

Optional `deployment` has `owner: "RA-002"`, `protocol: "deploy-sh-v1"`, absolute `executable` (Bash), `script`
(existing deploy.sh), `config` (existing deployment.config), `cwd`, and the corresponding
`executableSha256`, `scriptSha256`, `configSha256`. The driver passes DEPLOY_CONFIG through
the environment. It does not interpret or invent cloud configuration.

For staging/production only, after explicit human/task authority, externally set
`BLOG_ADOPTION_AUTHORIZATION=DEPLOY:SITE:ENVIRONMENT:PROFILE_SHA256` using the plan's fingerprint,
then invoke `deploy`. This token binds the request, not a substitute for actual authorization.
The driver performs verification, delegates `deploy.sh --deploy --dry-run`, rechecks pins,
then delegates `deploy.sh --deploy` with the authorized `DEPLOY` confirmation on stdin.
RA-002 still owns branch/remote identity, duplicate-build prevention, release gates and
deployment execution. Any nonzero preflight/deployment result blocks success. No alternative
deployment engine is introduced. DELEGATED_SUCCESS is not anonymous hosted acceptance:
retain the deployment owner's exact revision/digest/traffic and production-safe smoke evidence.

This delegation supports only the existing `deploy.sh` interface. It does **not** implement
`staged_release.sh`, staged build receipts, promotion across projects, or promotion approval.
For a consumer already using that workflow (such as AIspanda), omit this profile's deployment
section, run package install/verify, then invoke its existing staged-release owner from the
consumer adapter. Preserve that owner's CLI, config, receipt and promotion gates. Do not
substitute deploy.sh for a staged promotion flow. Unsupported protocol identifiers fail closed.

This installs a package, not an arbitrary site's routing/database migration. Consumers must
provide their existing supported adapter and meaningful tests. Run `node --test scripts/adopt.test.mjs`
for clean-fixture coverage of read-only planning, repeat adoption, tampering, ownership,
prerequisites, verification failure and deployment delegation/authorization/failure.
