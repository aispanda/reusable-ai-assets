---
name: deliver-blog-community
description: Install, verify, or upgrade a site's Google sign-in, role requests, comments, draft editing, and snapshot publishing using a versioned blog capability. Use for this combined capability, not generic website design.
---

# Deliver Blog Community

Current runtime: **0.2.0-rc.8 local integration candidate; not a production release**.
Read [CAPABILITY.md](CAPABILITY.md) first. Code is in `runtime/`; use the hash-pinned
installer and [runtime instructions](references/runtime.md). Configuration checks
alone never establish tested delivery or complete scenario coverage.

## Route by request

- **Repeatable adoption:** use [the deterministic driver](references/adoption-driver.md)
  for pinned install, verification and guarded upgrades. Keep consumer configuration outside core.
- **Native Node host:** use [the native mount](references/integration-node.md) to preserve host routes.
- **Staging and autonomous browser testing:** use [the shared staging journey](references/staging-testing.md)
  with the consumer's isolated project, designated fixture and captured test session.
- **Collections/users:** the runtime includes administrator collection and user management,
  role invitations, application review and artwork uploads. A cross-site versioned media library is not included.
- **Assess/adopt:** validate the consumer profile against [the contract](references/contract.md).
  Inspect the existing site's auth, roles and data before suggesting replacement.
- **Verify:** read only relevant IDs from [scenarios.json](assets/scenarios.json);
  map them to actual API/rules/browser tests, not a new prose-only test plan.
- **Fix/upgrade:** obtain exact defect, branch, source version and resource boundary;
  make one owned diff, rerun affected checks and an independent review.
- **Package/release:** use the existing reusable-asset and deployment owners when
  available. Explicitly authorized local candidate extraction/testing can precede
  source deployment. Staging/production each require their own authority and
  exact-version evidence. A clean independent consumer must pass before declaring
  reusable production readiness; do not block its isolated local test on that proof.

Use [agent roles](references/agent-roles.md) only if delegation adds independent work.
A single lead plus bounded independent verifier is the default recommendation, not
a mandatory permanent agent team. Other IDEs use the same Markdown contract;
[Codex adapters](assets/codex-agents/) are optional and do not confer cloud authority.

## Inputs and operating rules

Read only the consumer's issue contract, actual Git branch, profile, relevant
scenario IDs, changed files, and evidence since the previous checkpoint.
Missing authority, target or ownership blocks mutations; report the exact gap.
Do not make up a default Admin, hosting project, credential or production target.

Run `python scripts/validate_contract.py --profile <consumer-profile>`.
This validates configuration only. `--require-runtime` verifies required packaged
runtime files and test commands; `runtimeReady:false` remains distinct from presence.
Run the actual tests and report all 36 IDs using `runtime/tests/scenarios.test.mjs`.
Keep missing layers/features UNPROVEN, even when their linked backend suite passes.

Keep these invariants through every adaptation:
- Explicit account sign-in lands on the host home page after access/profile initialization.
  Restoring a session must not redirect an account-settings visit. My articles and
  bare studio open the list; only an explicit New/Edit action opens an editor.
  Emulator session injection does not prove Google sign-in or its landing behavior.
- New sign-ins receive the lowest approved role, not automatic publishing rights.
- API/rules enforce role, ownership and current active status independently of UI.
- Draft edits never alter the live snapshot until explicit authorized publication.
- Public success requires a release ID, correct environment URL and anonymous check.
- Published articles cannot be trashed; cancellation performs no mutation.
- Use disposable resource IDs and an explicit cleanup ledger. Never use list
  position/title alone as deletion authority; preserve pre-existing user content.
- Auth/session files, private evidence and site data stay outside this package.
- Reports distinguish PASS, FAIL and UNPROVEN for the exact version/environment.

## Handoff

For copy-ready invocation, second-site testing and bounded repair prompts, read
[adoption prompts](references/adoption-prompts.md). Do not regenerate these instructions.

Return changed paths/version, scenario results, evidence links, remaining blockers
and the next authorized action. Mark deployment and adoption separately from source
tests. Do not generate another orchestrator or copy the whole conversation.

For support and upgrade boundaries see [CAPABILITY.md](CAPABILITY.md).

For React/Vite + Flask, use [the standalone-service adapters](references/integration-react-flask.md).
For autonomous two-task repair, use [coordination](references/coordination.md):
deterministic file watcher plus separately supported task scheduler, immutable IDs,
exact package hashes, no cross-file ownership violations or implied release authority.
