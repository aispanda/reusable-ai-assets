# Governance activation

The repository files provide the checks; GitHub and TrueFoundry settings make them enforceable. A structural audit does not prove these remote controls are active. The governance workflow cancels older runs for the same pull request and publishes success only when the live head, body hash, and update timestamp still match the revision it validated.

## Required activation

1. Create a TrueFoundry Virtual Account for GitHub governance. Grant only the Linear MCP server and its `get_issue` tool. Store its auto-rotated token in the repository Actions secret `TFY_API_KEY`.
2. Protect `main`: require a pull request, one independent approval, stale-approval dismissal, resolved conversations, current base, and required contexts `delivery-contract` and `repository-quality`. Block direct push, force-push, deletion, and bypass.
3. Protect the `production` environment: require a separate reviewer, prevent self-review, and allow deployment only from `main`.
4. Replace `governance/run_quality.sh` with the repository's deterministic build, lint, test and security commands before activating required checks.

## Verify

Record negative tests for invalid contract, failing quality, direct push, unreviewed merge and non-main release, plus one approved path that proves an independent approval on the final pull-request head commit.
