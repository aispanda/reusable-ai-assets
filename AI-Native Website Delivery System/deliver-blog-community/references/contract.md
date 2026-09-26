# Consumer contract

## State and permission model

Baseline proposal: signed-out readers can read published content; new Google users
are Commenters; Authors edit their own drafts; Publishers and Administrators manage
editorial drafts and publish/unpublish; only existing Administrators approve role
requests and moderate other users' comments. Test both allowed and denied actions.
Roles are application data, not browser trust. A different policy is a versioned
product decision, not an installer convenience.

Publications follow:
draft -> verified preview -> immutable published version;
published version + private working draft -> new verified publication;
published -> unpublished -> recoverable trash -> unpublished restore.
Never-published drafts can also move to trash. Live publication blocks trash.
Keep release/audit history distinct from the editable document.

User-visible Title is separate from headings within Body. Make it labelled,
synchronized with the library, and required before publication. Preview, final
review and receipt must agree on title, revision, public URL and environment.
Native confirmation reliability is not assumed: test cancel, confirm, Escape and
focus using the actual supported browser surface.

## Profile

Only reference secrets through the consumer's approved credential system.
The example profile is fictional and authorizes nothing. Exact environment origins,
project IDs, branch and fixture references are mandatory before mutation.
Cross-environment isolation is checked independently of different string names.

Before adoption confirm: initial Admin authority; permanent erasure versus trash;
comment retention after unpublish; role upgrades/revocation; moderation audit and
abuse controls; stack/runtime versions; data migration/backup/rollback requirements.
Unknown policy blocks only actions that depend on it, not unrelated read-only work.

## Evidence and tests

Scenario fields are id, actors, steps, expected, layer, status and automationRef.
The JSON is a specification; map IDs into actual versioned tests. Never call the
scenario catalogue an executed E2E suite. A run result additionally records commit,
environment, target, fixture ledger, assertion evidence and defect classification.

Use API/rules tests for role/ownership/input combinations, browser tests for actual
OAuth and representative lifecycle/UX, and anonymous requests for public visibility.
Do not share mutable fixtures between parallel workers. Preserve failed-run
evidence while removing only verified test-owned resources.

Fast release checks are risk-selected; security denials and changed lifecycle
boundaries cannot be skipped for token savings. A text-only publish smoke does not
prove images, embeds, moderation, role approvals, accessibility or cross-site reuse.

## Authority

A profile and an agent's recommendation are not authority. Actual deployment,
IAM, secrets, billing, migration and destructive tests require scoped approval.
Scripts enforce mechanical gates; agent instructions do not replace server policy.
