# Efficient browser verification

Use the installed, hash-pinned package's tests. Keep target URLs, project IDs, fixture
IDs, image files, credentials and receipts in the consumer. Do not copy test bodies.

| Layer | Purpose | Execution |
| --- | --- | --- |
| Runtime unit/API/rules suites | State transitions, role/ownership denials, private drafts, validation and concurrency | Local unit tests and isolated Firebase emulators; no Google account |
| `editorial-browser-journey.mjs` | Representative editorial UI, navigation, comments and permissions | Autonomous disposable loopback browser; rejects remote origins |
| `staging-browser-journey.mjs` | Real hosting/Auth/Storage integration and durable publication | One designated staging article, one isolated Publisher/Admin session; no retries by default |
| Production smoke | Public routes, assets, configuration and tested-image identity | Read-only checks owned by the deployment controller; no synthetic public posts |

The hosted journey checks the actual project/environment and actor role before any
mutation. It inserts an image through the real picker, saves and reloads the draft,
checks preview text, publishes and verifies the release ID after reload. A fresh
anonymous browser context checks the same article text, decoded image and mobile
overflow. Evidence includes the release ID, target and whether media was uploaded
or reused. A successful command alone does not prove these outcomes.

## Consumer setup

1. Use the existing deployment owner (RA-002 where available) to provision or verify
   isolated staging, runtime identity, Firebase configuration and OAuth origins.
   This asset does not grant IAM or build a second deployment controller.
   Before an expensive build, the consumer's read-only prerequisite hook must call
   `verifyImageStoragePrerequisites` from `runtime/tests/staging-preflight.mjs`.
   Supply actual Cloud Storage metadata (not merely Firebase's configured bucket
   name), the target project's numeric ID and effective IAM observations for the
   exact runtime service account. The bucket must exist in that project, enforce
   uniform bucket-level access and public access prevention, and allow object
   create/get/delete. Denied, unknown or inaccessible checks fail closed; never
   grant IAM or create a bucket inside a verifier. Check production prerequisites
   read-only too. The hosted upload still proves actual Storage integration.
   Also call `verifyFirebaseAuthPrerequisites` with that environment's explicit
   project ID, runtime service account and effective IAM adapter. Revocation-aware
   `verifyIdToken(token, true)` needs `firebaseauth.users.get`; signing in through
   Google alone does not prove the server can validate the account. Require
   `CAN_ACCESS` independently for staging and production; deny, unknown, missing
   or failed observations stop release. Provision only the necessary user-read
   permission separately; never grant IAM or disable revocation checks in preflight.
2. Designate one disposable staging draft owned by the test actor, a fixed slug,
   and a small local image fixture. Never select the first article from a list.
3. Sign in once in a fresh Playwright browser and save its state to an ignored local
   file. Capture IndexedDB if the Firebase app uses it. Never reuse or inspect an
   owner's existing browser profile. Treat the capture as a credential; never commit
   it or upload traces publicly. Human Google sign-in remains a setup prerequisite;
   emulator identities do not prove hosted OAuth.
4. Call `validateStagingSession` from `runtime/tests/staging-preflight.mjs` before
   expensive deployment work. Supply `origin`, `projectId`, `productionOrigin`,
   `productionProjectId`, `draftId`, `expectedSlug` and the `storageState` path.
   It rejects production-equivalent targets and missing Firebase session data.
   This establishes setup shape only; the browser proves current access.
5. In the consumer's Playwright test, import `runHostedPublicationJourney` from the
   installed `runtime/tests/staging-browser-journey.mjs`, call it with those target
   inputs, `page` and `uploadFixture`. Use its synchronous `onEvidence` callback to
   retain sanitized progress, then attach that JSON plus PASS/FAIL and the package
   hash in `finally`, including failed runs that already uploaded or published.
   Configure the captured storage state, one worker, no automatic retries,
   and failure-only screenshots/traces. The fixture upload is optional only when
   Storage is genuinely outside the release scope.
6. Bind that command to the existing staging verification hook. Promote the exact
   tested image using its verified receipt; do not rebuild for production.

The fixture, uploaded image and immutable staging publication/audit history are
intentionally retained. Reruns reuse the marked image instead of uploading copies;
each successful publication may append a staging release. Record this retained
history in the consumer ledger. Never promise complete cleanup or copy staging
test data to production. Session expiry fails visibly and requires a new capture.

Additional screenshots, browsers, Storybook or scanners need a demonstrated gap.
Keep broad authorization matrices below E2E and browser checks focused on what
lower-level tests cannot establish. Site-specific layouts and migrations stay in
the consumer's tests.
