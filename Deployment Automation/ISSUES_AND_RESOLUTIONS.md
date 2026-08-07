# Deployment issues and resolutions

Record reusable root causes only. A resolution is complete when its prevention step is incorporated into the workflow or release checklist.

| ID | Symptom | Root cause | Resolution | Prevention |
|---|---|---|---|---|
| DA-001 | First release cannot build, push or resolve a service URL | Repeat-release assumptions hid missing APIs, image repository and service | Classify first deployment; verify billing/APIs/repository; resolve the runtime URL after deployment | Preflight checks first-deployment readiness before mutation |
| DA-002 | Local build passes but clean cloud container install rejects a dependency-age rule | The Docker install layer did not include the package-manager policy file | Copy all policy files before dependency installation; retain the rule and exclude only an explicitly reviewed package/version | Container review compares local and install-layer policy inputs |
| DA-003 | CLI default project differs from deployment target | Shared workstation retained another project's default | Pass the target project explicitly on every cloud command and show the mismatch as a warning | Preflight verifies access and billing against the configured target, not the global default |
| DA-004 | Deployment succeeds but the public URL returns 403 | The build principal created the service but could not apply unauthenticated invocation | Apply the approved public/private access policy with an authorised principal, then verify anonymously | Treat access mode as a separate release gate and test without credentials |
| DA-005 | Verifier reports failure although build, image digest and serving revision are correct | It depended on one legacy console phrase that newer builders omit | Treat log wording as diagnostic; verify build status, immutable registry digest, revision digest and traffic through APIs | Never use mutable console text as authoritative release evidence |
| DA-006 | A newly public healthy service returns one transient 503 during verification | First-request platform or instance readiness briefly lagged the ready control-plane state | Retry only transient HTTP failures with a small bounded delay, then fail loudly | Public-route checks use two bounded retries and still require final HTTP 200 |
