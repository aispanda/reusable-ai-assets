# Collection artwork adapter

Available in 0.2.0-rc.7 as an optional backend and UI-state adapter. This is not a
complete collection dashboard, shared media library, or cross-site version service.
Consumer routes, visual components, collection metrics and article-assignment policy
remain consumer-owned. No cloud resources or privileged accounts are created.

## Contract

`GET /api/content/collections` returns the registry, revision, collection types and
approved static artwork paths. It is public: do not put private draft information
in collection metadata. Types are Text, Philosophy, Tradition, Practice and Theme.
New installations start with an empty registry. An active Administrator alone can
create, update, archive, restore or delete via `POST /api/content/collections`.
Current role is checked in the transaction. Other roles and foreign origins fail.

JSON requests contain `action`, `expectedRevision` and `collection` for create or
update; archive, restore and delete use `id`. Collection fields are `id`, `title`,
`subtitle`, `description`, `family`, `type`, `order`, `featured`, `image`, `imageAlt`.
The identifier is a stable lowercase URL slug; rename the title rather than the ID.
Conflicting registry revisions return 409; reload before retrying. Delete refuses
references in drafts, published content or retained releases. Retained release
history can intentionally prevent deletion even after an article is unpublished.

For new artwork, send multipart fields `file` and `collection` (the same JSON request).
PNG, JPEG and WebP are limited to 5 MB, checked by decoded content, with a required
image description. The server writes a new object with a generation precondition,
then commits the image record and registry change together. Only a confirmed
unreferenced upload is removed after failure; an uncertain transaction outcome
must not delete a possibly committed image. Generation-bound cleanup is essential.

`GET`/`HEAD /content-assets/collections/:id` serves only artwork still referenced by
the registry, using its exact stored generation. The server handles stream failures
without crashing; incomplete responses are aborted. These public collection assets
are distinct from authenticated private article assets. Current serving uses the
application proxy: measure its outbound traffic as well as storage billing.

## Consumer UI

Use `runtime/src/scripts/collection-artwork-input.mjs` with the consumer's existing
Firebase token provider. `select(file)` validates the local file and returns a blob
preview URL without uploading. `cancel()` releases it. `save(body)` is the explicit
mutation; it sends multipart when a file is selected, otherwise JSON. Disable
selection/cancellation during save. Failed saves retain the selection for recovery;
success releases it. Do not interpret an uncertain response as proof nothing saved.

Present Upload new alongside the consumer's existing-image selector. Label image
description, saving state and recoverable errors. This module does not implement an
asset browser, resize/crop UI, version promotion, cache invalidation or global reuse.

## Optional legacy seeds

Set `BLOG_COLLECTION_PROFILE` to a consumer-owned JSON file before starting the
server. Permitted keys are `topics`, `articleTopics`, `articlePresentation` and
`approvedImages`; omitted keys default empty. A topic requires a unique `id`, title,
explicit type and integer order. Optional `art` needs local `src`, optional local
`smallSrc` and nonempty `alt`. `articleTopics` maps legacy article slugs to seeded
collection IDs. `articlePresentation` maps slugs to objects with optional local
`cover`. `approvedImages` is an array of safe same-origin paths. Keep real catalogs,
artwork and migration assignments outside this package. Invalid profiles fail at
startup rather than silently importing another site's data.

`assertCollectionTags` is available for consumers requiring exactly one collection.
Wire it into their save/publish transactions if that policy is required; the generic
runtime does not silently impose it on existing drafts. Collection archive blocks
new assignments only where that helper is integrated. A consumer must verify these
boundaries together with its own editorial policy before production adoption.

## Verification

- `pnpm test` includes input state, profile validation, inherited-key and storage
  stream regressions. They prove those behaviors, not a complete author dashboard.
- `pnpm test:collections` runs real local Auth/Firestore with deterministic object
  storage: roles/origin checks, stale revisions, valid and invalid uploads, revocation,
  public reads, orphan cleanup and preservation after a lost commit response.
- Use a fresh demo project and isolated emulator ports. Tests refuse a pre-existing
  registry and clean their own fixture records. They do not use production accounts.
- A real provider upload and consumer browser save/reload/cancel remain separate
  evidence gates. Test accessibility in the consuming interface.
