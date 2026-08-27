---
name: stage-cloud-run-release
description: Stage and promote an existing Cloud Run container application through isolated non-production data, immutable evidence, and exact-image production promotion. Use when a Cloud Run project needs a real pre-production runtime test; do not use to create infrastructure, IAM, secrets, DNS, or databases.
---

# Stage Cloud Run Release

Use the RA-002 canonical controller; never reconstruct deployment commands or copy the controller into a project.

1. Read [`../STAGED_RELEASE.md`](../STAGED_RELEASE.md) and the consuming project's deployment/automation router.
2. Confirm that release/build, staging and production use three distinct Google Cloud projects, and that staging/production have distinct runtime identities and data boundaries. Stop if the browser bundle contains production-specific runtime configuration or the staging identity can reach production data.
3. Keep project facts in an ignored `staged-release.config` profile. Keep receipts ignored. Require a dedicated artifact-only `BUILD_SERVICE_ACCOUNT`, a build-only Cloud Build configuration, and bind runtime/rules inputs into the receipt hashes.
4. Run `--check`, then the relevant dry run. Do not create missing projects, billing links, APIs, repositories, services, identities, IAM grants, secrets, databases or DNS; report the exact bootstrap prerequisite and required approval.
5. Run the read-only effective-isolation/prerequisite verifiers. Require separate release/build, staging and production projects. For visual review before authenticated automation, continue only after exact `CANDIDATE`: smoke a zero-traffic tagged staging URL and hand over its exact commit/digest/revision. That tagged origin is visual/UI-only, is not promotion evidence, and must not be added to Firebase authorized domains. Continue to stable staging traffic only after separately exact `STAGE`; then run the real authenticated verification command on the stable origin, revalidate the exact revision, and atomically create the immutable receipt.
6. For production, revalidate the strict receipt, its exact Build ID/build identity, tag URL, runtime fingerprint and authoritative revision state both before and after exact `DEPLOY`. Promote only the receipt's `image@sha256` digest, smoke the tagged zero-traffic revision, then route traffic to that exact revision. Never rebuild during promotion.
7. Report the current receipt paths, Build ID, commit, digest, exact revisions, traffic, verification verdicts and whether production was touched. Do not copy facts from an earlier run.

Cloudflare/static previews may remain an earlier UI gate, but they do not replace Cloud Run staging for server APIs or managed data integrations.

When a consuming project implements its read-only verifier in Node, use
[`references/node-cloud-verifier.mjs`](references/node-cloud-verifier.mjs). It
resolves the installed `gcloud.ps1` wrapper on Windows without a command shell
and fails closed on launch or command errors. For Firebase Management, bind and
verify the resource project in the URL separately; `x-goog-user-project` only
attributes quota/billing. Require the API and existing `serviceusage.services.use`
on that quota project, and never broaden IAM during verification. Adapt only
project-specific checks; do not put credentials or project facts in this package.
