# Governance activation

The repository files provide the checks; GitHub and TrueFoundry settings make them enforceable. A structural audit does not prove these remote controls are active. The governance workflow cancels older runs for the same pull request and publishes success only when the live head, body hash, and update timestamp still match the revision it validated.

## Required activation

1. Create a TrueFoundry Virtual Account for GitHub governance. Grant only the Linear MCP server and its `get_issue` tool. Store its auto-rotated token in the repository Actions secret `TFY_API_KEY`; never paste it into Git, Linear, or chat.
2. Protect `main`: require a pull request, one approval from someone other than the author, stale-approval dismissal, resolved conversations, current base, and required contexts `delivery-contract` and `repository-quality`. Block direct push, force-push, deletion, and bypass.
3. Protect the `production` environment: require a separate reviewer, prevent self-review, and allow deployment only from `main`.
4. Keep `governance.yml` and `release.yml` on trusted `main`. They publish the live contract status to the pull-request head and prove the merged SHA and GitHub approval before production authorization.

## Verification receipt

- An invalid or incomplete Linear/PR contract reports `delivery-contract` failure on the current PR head.
- A failing repository test reports `repository-quality` failure.
- A direct push to `main`, an unreviewed merge, and a non-main production attempt are rejected.
- The approved path records the reviewed merge SHA, an independent approval on the final pull-request head commit, production reviewer, workflow run, and post-release verification.
