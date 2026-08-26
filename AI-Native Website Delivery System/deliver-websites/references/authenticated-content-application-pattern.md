# Authenticated content application pattern

Use this pattern when a content-led website grows into a member application with protected authoring, publication, comments or discussions, role-aware actions, and optional user-funded AI connections. It complements the static/public page system; it does not make accounts or community features a default.

## Activation gate

Activate only when each selected capability has a named user journey, data owner, operational owner and acceptance proof. Preserve extension seams without implementing dormant modules.

| Capability | Activation evidence | Minimum proof |
|---|---|---|
| Member identity | Private or personalised value exists | Sign-in, sign-out, recovery, first-use profile and denied-state journeys |
| Editorial workspace | Named non-developer authors need durable drafts | Role allow/deny matrix, autosave recovery and concurrent-edit handling |
| Publishing | An approved role must release without editing source manually | Final review, deterministic conversion, validation, idempotent release, live URL and failure recovery |
| Comments/discussions | Participation demand and a moderation owner exist | Ownership, moderation, bounded reads/writes, tombstones, abuse and retention behavior |
| User-funded AI connection | A user-owned provider account delivers an approved task | Least-privilege connection, credential boundary, bounded request, explicit human application and disconnect proof |

## Shared system contract

Build one thin vertical slice before expanding modules:

1. A public, read-only content route remains available without privileged browser state.
2. Authentication establishes identity; authorization is evaluated separately for every protected read and mutation.
3. A verified new member receives the least-privileged useful role. Profile categories and outreach consent remain separate from authorization roles.
4. Interface visibility explains authority but never enforces it alone. Database rules or privileged APIs reject the equivalent direct request.
5. Public content, working drafts, private ownership records, audit events and temporary credentials have distinct storage and retention boundaries.
6. All important actions expose loading, success, partial, denied, stale/conflict and recoverable failure states.
7. Privileged publishing, role administration and security-sensitive moderation stay server-side; repository and deployment credentials never enter browser code.

## Identity and onboarding

- Prefer one continuation action for registration and returning sign-in when the provider supports it.
- Request only the smallest identity scopes needed for the named journey.
- Collect the stable account identifier and minimum operational/audit facts; treat display names and profile images as optional presentation data, not authority.
- Make optional profile fields skippable and bounded to product-owned categories when consistent analysis is required.
- Keep professional interests, community preferences and marketing consent separate from permissions.
- Do not infer sensitive traits from content, group, comment or AI activity.
- Clear session-only credentials and connection state on disconnect, sign-out and tab close.

## Roles, ownership and moderation

Define a compact project-owned role matrix. For each action, record the interface state and the enforcing rule or API.

- New members start with the least-privileged useful role; self-escalation is denied.
- Owners may edit or delete their own unpublished contributions within the retention policy.
- Moderators may remove another person's contribution only through a recorded moderation action; they may not rewrite that person's words.
- Publishing authority is distinct from drafting authority.
- Stable private ownership identifiers do not need to appear in public documents or payloads.
- Destructive actions require contextual explanation and recovery where practical. Published material is unpublished before deletion; threaded replies retain a tombstone when removing a parent would destroy context.

## Authoring and publication lifecycle

Use explicit states rather than a single mutable document:

`Draft -> Published -> Published with draft changes -> Unpublished -> Archived`

- Opening a published title is read-only; editing is a separate explicit action.
- Autosave is a recoverability aid, not a release action. Create immutable checkpoints on explicit save and before publishing.
- Preserve the working draft when preview, validation, source publication or deployment fails.
- Preview must use the same renderer, sanitization and content-boundary rules as publication.
- Publish opens a final review; the first click does not release.
- Convert structured editor data deterministically into the public format, validate it, create one idempotent release and return a durable release identifier plus live URL.
- Record publish, unpublish, rollback and destructive actions. A rollback creates a new release from a known revision rather than rewriting history.
- Test stale writes and concurrent edits; never silently overwrite a newer server version.

## Comments and durable discussions

- Start with the smallest context-appropriate surface: article comments for an article; topic discussions only after navigation and moderation needs justify them.
- Bound thread depth, query size, pagination and write rates before launch.
- Keep public text separate from private ownership and moderation records.
- Show pinned or authoritative context without fabricating ranking or popularity.
- Likes or reactions are one-per-eligible-member mutations with a reversible state.
- Deletion preserves reply context when required and records moderator actions.
- Treat reporting, rate limits, notification volume, retention, export and provider exit as launch gates, not later polish.

## UI/UX state contract

Every authenticated card, editor, composer and release action must make these states unambiguous where applicable:

- loading or checking;
- signed out / not connected;
- ready / connected;
- active or selected;
- saved / published / completed;
- denied or unavailable;
- needs attention;
- stale or conflicting;
- partial success;
- recoverable failure with the next action.

Use real controls only for available actions. Disable or replace unavailable actions with concise reasons. Keep keyboard focus, error summaries, responsive overflow and touch targets usable. Do not rely on color alone to communicate role, state or comparison results.

## User-funded AI connector seam

Keep providers behind a small connector contract for authentication, capabilities, status, bounded generation and disconnect. Permit several connected providers only when the product explains the choice; keep exactly zero or one active for downstream actions unless the user explicitly starts a comparison.

- Prefer OAuth Authorization Code with S256 PKCE for public browser clients; never embed a client secret.
- Request the smallest provider scope and offer manual-token fallback only when its storage and revocation boundary are clear.
- Read opaque provider scope identifiers from the provider's authoritative metadata or API; do not infer them from dashboard labels. Treat mocked scope assertions as request-shape tests, not proof that a live provider accepts the scopes.
- Probe the actual data-plane endpoint with the real method and non-safelisted headers before declaring `browser-direct`. An OAuth authorization or token endpoint allowing browser origins does not prove that generation, status, revocation or model APIs do.
- Declare each connector's supported transports explicitly and select the path from that capability, not from whether a local credential happens to exist. A relay-only connector must never fall through to its browser implementation, including during callback verification.
- Model provider-account authorization, gateway-level authentication and route/model policy as separate controls. Isolate one bounded provider request when a full-stack failure cannot distinguish them.
- Keep useful upstream status and bounded, sanitised error detail in server-only diagnostics without credentials, prompts or generated results; keep client 5xx responses generic.
- During a session-only MVP, keep credentials in same-tab session storage or memory; never put them in durable content, analytics, logs or public artifacts.
- Bound prompts and output, disclose that the user's provider account pays, isolate partial failures and never silently fall back to a site-funded provider.
- Generated output remains a proposal. It cannot publish, post, moderate, delete, change roles or overwrite content without explicit human review.

### Connection persistence ladder

Choose persistence as an explicit security, privacy and support decision:

1. **Same-tab session (safe MVP default):** keep the credential in memory or session storage; clear it on disconnect, sign-out and tab close. The user reconnects later.
2. **Device-local persistence:** generally avoid durable browser storage for provider credentials. It remains device-specific, expands exposure to client-side compromise and cannot provide account-level revocation or cross-device continuity by itself.
3. **Encrypted account vault (recommended persistent profile):** exchange and refresh tokens through a privileged backend; encrypt provider credentials at rest; bind them to the authenticated application account; return only connection status or narrowly scoped proxy results to the browser.

Persistent connection means **until the provider expires or revokes access, the user disconnects, required scopes change, or the application security policy forces reauthorization**. Never promise permanent or one-time-only consent.

Before enabling the vault:

- verify whether each provider actually issues a refresh token for the selected OAuth client and scopes; provider metadata support alone is not proof that a particular authorization response contains one;
- define encryption-key ownership and rotation, credential retention, revocation, account deletion/export, incident response and support ownership;
- keep provider access and refresh tokens out of Firestore-readable client documents, logs, analytics, error payloads, browser storage and generated artifacts;
- make disconnect revoke provider access when supported and delete vault ciphertext plus connection metadata;
- test access-token expiry, refresh success, refresh failure, revoked consent, changed scope, account deletion and cross-device sign-in;
- show `Connected`, `Reconnect required`, `Revoked` and `Disconnect` states without exposing token material.

## OAuth callback and internal handoff contract

Model these as separate values:

1. **Registered redirect URI:** the exact URI sent to the provider and repeated during token exchange.
2. **Provider callback:** the authorization code, state or provider error returned to that URI.
3. **Internal processing route:** an optional same-origin route that receives the callback parameters after a deliberate application handoff.

If the callback is forwarded internally before token exchange:

- preserve the authorization code, provider error and state unchanged;
- keep the PKCE verifier and issued state in the initiating browser-tab boundary;
- require the returned state to match, the flow to be within a short maximum age and the processing origin to equal the registered redirect origin;
- allow only an explicit, normalized path allowlist for the registered callback route and the one internal processing route; never accept an arbitrary same-origin path;
- send the original registered redirect URI, not the internal processing route, in the token request;
- remove code, state and provider-error parameters from visible history after processing;
- reject cross-origin, unknown-path, mismatched-state, missing-code and expired callbacks before token exchange.

### Recurring failure: successful authorization rejected after page handoff

**Symptom:** the provider authorizes successfully, but the application shows that the connection expired or could not be verified without making the token request.

**Cause:** the provider returned to the registered callback route, an application page forwarded the query to a different same-origin route, and the connector compared the current path only with the registered redirect URI.

**Safe fix:** distinguish token-exchange redirect identity from the allowlisted same-origin processing path. Accept the known internal handoff route while retaining exact origin, state, PKCE, age and code checks. Do not remove callback-location validation entirely.

**Regression proof:** drive the connector through the real registered-route-to-processing-route handoff and assert successful exchange. Also assert rejection for mismatched state, expired state, another origin and an unlisted path.

## Acceptance matrix

- Authentication, authorization and profile completion fail independently and display the correct recovery.
- Every protected action has a server-side deny test for an ineligible role.
- A draft survives refresh, sign-out timing, failed validation and failed publication without becoming public.
- A published version remains stable while unpublished changes continue.
- Ownership and moderation tests prove that elevated roles can remove but cannot rewrite another member's words.
- Comment and discussion queries are bounded and responsive at the narrowest supported viewport.
- OAuth tests cover direct callback, internal handoff, state mismatch, expiry, wrong origin, wrong path, provider denial and token-exchange failure.
- Connector tests prove that relay-only providers make zero browser data-plane calls and browser-direct providers retain their intended path. One bounded authorised live probe is required before calling a provider contract verified.
- Provider diagnostics distinguish account authorization, gateway authentication, route/model validation and transport/CORS failures without logging credentials or user content.
- Credential, prompt and generated-result scans prove that temporary AI data does not enter durable application stores, logs, analytics or generated public output.
- Browser tests verify focus, keyboard actions, error recovery, session clearing and no unexpected horizontal overflow.

## Reuse boundary

The reusable core is the lifecycle, trust-boundary, ownership, state and verification method. Provider names, role labels, routes, schemas, retention periods, content models, brand copy, cloud identifiers, legal decisions and production evidence stay in the consuming project.
