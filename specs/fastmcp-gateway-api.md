# Bounded MCP Gateway Contract

## Publication status

The earlier gateway scaffold is **withdrawn**. It returned raw Secret Manager
values, accepted arbitrary local file paths and buckets, wrote untrusted blob
names to local paths, and bound an unauthenticated service to all interfaces.
Those are not reusable capabilities and must not be restored.

## Published tool

### `gateway_status()`

Returns a non-sensitive locked-state manifest:

- `status`: `locked`
- `capabilities`: empty list
- `credential_values_exposed`: `false`
- `file_transfer_enabled`: `false`
- `next_step`: consumer implementation guidance

The development entry point accepts loopback binding only.

## Consumer extension boundary

A consuming service may add a domain-specific action only when all of these are
proved on its own issue-linked branch:

1. The transport authenticates the caller and maps it to a trusted principal;
   the caller cannot self-assert identity or choose a secret name.
2. The action and credential alias are registry allowlisted. Credential values
   remain in-process and never appear in MCP responses, logs, errors, or audit
   evidence.
3. File access, when genuinely required, is constrained to validated roots and
   allowlisted destinations. Every resolved path proves containment; blob names
   cannot traverse or overwrite arbitrary locations.
4. Focused denial, containment, masking, and authentication tests pass, followed
   by independent security review.
5. Network exposure and production deployment require a separate governed
   release decision.
