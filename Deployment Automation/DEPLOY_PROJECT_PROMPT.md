# Reusable Project Deployment Prompt

Use the reusable deployment toolkit for this release.

## Release inputs

- Project root: `[PROJECT_ROOT]`
- Toolkit script: `[TOOLKIT_PATH]`
- Deployment configuration: `[DEPLOY_CONFIG]`
- Release description: `[RELEASE_DESCRIPTION]`
- Route to verify: `[ROUTE_TO_VERIFY]`
- Content checks: `[CONTENT_CHECKS]`
- Special notes: `[SPECIAL_NOTES]`

## Instructions

Run the toolkit from the project repository with `--deploy`. Use `[ROUTE_TO_VERIFY]` with `--route` and translate `[CONTENT_CHECKS]` only into the toolkit's documented content-check flags. If the content-check field is blank, pass no content-check flags and report `CONTENT VERIFY: NOT REQUESTED`.

Use Windows or Git Bash path syntax appropriate to the active shell. Quote every path containing spaces, including `[TOOLKIT_PATH]` and `[DEPLOY_CONFIG]`. The intended Git Bash form is:

```bash
cd "[PROJECT_ROOT]"
DEPLOY_CONFIG="[DEPLOY_CONFIG]" bash "[TOOLKIT_PATH]" --deploy --route "[ROUTE_TO_VERIFY]" [CONTENT_CHECKS]
```

Do not manually reconstruct the Cloud Build or deployment commands. Do not narrate routine steps. Allow the toolkit's mandatory built-in preflight to run and stop only at the typed `DEPLOY` production gate or when a mandatory check fails.

Use one deployment process and one approval channel. Never start the gate in a detached or hidden OS console.

When this request runs in an active Codex task, present the production-gate summary in that task and accept an exact user message of `DEPLOY` there as the approval. Relay that already-approved token to the toolkit through LF-only POSIX stdin inside the same Git Bash process. Do not make the user find another terminal, paste a command, use the clipboard, or repeat `DEPLOY` in a second place. Do not use a PowerShell `echo` pipeline.

If the user explicitly prefers terminal approval, use one visible foreground Git Bash TTY and accept `DEPLOY` directly at its gate. If neither approval channel is available, stop without submitting.

Before opening the gate—and before every retry—query Cloud Build for the exact full SHA. Stop if a matching build is queued or working. If it already succeeded, run `--verify` instead of submitting the same SHA again. Terminating a local process does not cancel a remote build.

At the gate, show only:

- approved full SHA;
- Google Cloud project, Cloud Run service, and region;
- preflight result;
- requested content checks, or `NOT REQUESTED`;
- exact Cloud Build command.

Continue only after I type exactly `DEPLOY` in the active Codex task or at the attached terminal gate. Any other input must decline the gate without submitting a build. Never infer approval from “go ahead,” “publish,” or similar wording.

After approval, let the toolkit complete Cloud Build, infrastructure verification, optional content verification, and handover generation. Report only:

- final build ID;
- approved image SHA/tag and immutable digest;
- Cloud Run revision;
- traffic allocation;
- `DEPLOY`, `INFRA VERIFY`, and `CONTENT VERIFY` verdicts;
- warnings;
- complete handover block.

Do not state that deployment started until `submitting Cloud Build` appears and a Build ID is captured. Distinguish preflight failure, gate/transport decline, Cloud Build failure, and post-deploy verification failure. For a verification failure after a successful deployment, diagnose the live route/content check and do not redeploy unless the remedy changes the image.

Stop on any failed mandatory check. Never repair Git automatically, alter IAM, change infrastructure configuration, execute rollback, force-push, bypass the typed gate, or continue through a failed safety check.
