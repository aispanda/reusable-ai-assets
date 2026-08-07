# Cloud Run handoff

This reference prepares an artifact for controlled deployment. It does not authorise deployment.

## Container contract

- The ingress container must listen on `0.0.0.0` and the injected `PORT`; Cloud Run commonly supplies 8080.
- Keep the container stateless. Persist durable data in an external managed service selected by the project architecture.
- Build images reproducibly and deploy an immutable revision/digest where the deployment system supports it.
- Keep runtime secrets out of images, source, and public environment configuration.

## Static profile

The bundled starter includes:

- multi-stage optional build pattern is unnecessary because generation occurs before image build;
- Nginx on port 8080;
- `try_files $uri $uri/index.html /404.html` so deep routes resolve to their own generated HTML;
- immutable caching for fingerprintable assets and conservative caching for HTML;
- a lightweight health endpoint.

## Project-owned variables

Never place these values in the reusable asset:

- domain and DNS zone;
- cloud project/account;
- region;
- registry and image name;
- service name;
- public/private ingress choice;
- service account and permissions;
- secret names and environment values;
- budgets, concurrency, min/max instances, CPU/memory;
- monitoring, alerting, and rollback targets.

## Classify the release

Declare one path before changing cloud state:

- **First deployment:** required APIs, registry, service, public/private ingress and permissions may not exist. Bootstrap them explicitly and idempotently, then record what was created.
- **Repeat release:** infrastructure exists. Deploy only an immutable, traceable revision through the approved release automation.

Do not force a first deployment through a repeat-release wrapper by inventing a service URL, domain, repository or permission.

## Independent approval gates

Treat these as separate decisions:

1. publish or update source in its configured repository;
2. create or modify cloud infrastructure and IAM;
3. deploy a production revision;
4. change DNS or a custom-domain mapping.

A request to deploy does not silently authorise committing private work, making a repository public, widening ingress or changing DNS. Capture the approver and exact revision for each applicable gate.

## Handoff checklist

1. Declare first deployment or repeat release.
2. Resolve the approved CLI, shell, package manager and container/build runtime by exact executable path and version; do not assume `PATH`.
3. Verify authenticated account and active project independently. Pass the project explicitly to every mutating cloud command.
4. Confirm active billing, project access, region, registry and service values before image work; keep personal identity out of public source.
5. For first deployment, verify required build, registry and runtime APIs; verify or explicitly create the target image repository and service prerequisites.
6. Confirm repository visibility and that the exact public artifact contains no secrets, proprietary fixtures, local paths or prohibited terminology.
7. Obtain source-publication approval when a commit/push is required; record the clean remote revision to deploy.
8. Clean build and strict site audit pass.
9. Container builds locally or in the approved build service. If no local container engine exists, record that fact and make the approved cloud build the mandatory image gate; do not install one implicitly.
10. Container listens on the Cloud Run port contract.
11. Public routes and health endpoint return expected status/content.
12. Build context excludes private, heavy and irrelevant files without excluding public assets.
13. Image, service, region, account and domain values come from project-owned configuration.
14. Rollback target and post-deploy probes are defined.
15. Infrastructure, deployment and DNS approvers explicitly authorise their applicable production actions.
16. Deployment automation performs build, deploy, verification and evidence capture.

## Preflight evidence

Record only concise values needed to prove control: release class, account, project, region, enabled required APIs, repository/service existence, source revision, container verification environment and approval status. Never print credentials or secret values.
