# Repository, publication, and maintenance

Read when choosing an asset's home, preparing a repository, distributing it, or applying project feedback.

## Choose one authoritative home

Improve an existing owner when it covers the outcome. External packages can remain maintained upstream. Keep a library-hosted asset in that library unless there is a concrete reason to move it. A standalone repository is useful for independent installation, releases, or maintainers; it is not mandatory for every skill.

For a standalone or external asset, the library holds a small `ASSET.md` pointer record with stable ID, source URL, entry point, verification status, and adoption instructions. Its transfer manifest links to authoritative files rather than copying them. Link the inventory to this local record so existing library validation still works. Validate the external package separately; the library validator does not inspect remote content.

Installed copies, plugins, and hosted registrations should identify the source version. Change the source first, verify it, then update the adapter. Preserve unrelated adapter settings; do not silently change a consumer's version or invocation policy.

## Separate repository files from runtime instructions

A useful starting shape for an asset needing a public repository is:

```text
repository/
  README.md
  LICENSE
  AGENTS.md
  .gitignore
  skills/
    skill-name/
      SKILL.md
      references/       # Only if needed.
      assets/           # Only if copied into outputs.
  evals/
    skill-name/
      cases.md
```

This is an example, not a mandatory scaffold. Preserve a sound existing layout and create only files the approved task needs.

- README explains outcome, installation, invocation, supported environment, limits, and honest maturity status.
- A license records an owner decision; do not select or replace one silently or infer reuse rights from public visibility.
- AGENTS records concise repository-specific authoring and verification rules; it does not replace `SKILL.md` or carry a private operating manual.
- Ignore rules reduce accidental staging; private sources and evidence should stay outside the public repository, not merely in an ignored folder.
- Add `.gitattributes` or `.editorconfig` for a demonstrated cross-platform text or formatting need.
- Add contribution guidance, templates, and SECURITY when they provide a real workflow and, for security reporting, a working channel. Reuse applicable organization defaults before copying them.
- Add CI, dependency automation, schemas, validators, ADRs, and release tooling only for demonstrated needs or existing repository requirements.

Keep development cases and results outside the installed skill unless evaluation is its runtime job. Use public or synthetic fixtures; retain private pilot evidence separately. Include required license notices in distributed artifacts.

## Establish the publication boundary early

When the owner requests a public repository, agree its destination and content boundary before development and prepare public-safe material from the start. Create it at the authorized stage; do not impose public-from-start on private projects or unfinished planning.

Before a public commit or push:

1. Inspect repository instructions, current changes, destination visibility, and branch/review controls. Isolate unrelated work; stage explicit paths and inspect the exact diff.
2. Confirm existing authorization for that destination and action, the authenticated Git principal's access, privacy-safe commit identity, and license decision. Complete local preparation before asking for a missing decision. Updating an existing repository does not authorize relicensing it, creating other repositories, or changing visibility.
3. Stage intended transferable content only. Review file names, count, size, provenance, rights, and private-data boundaries. Keep client terms and private patterns in an external policy.
4. Run `validate_asset.py <staged-library> --strict-clean --policy <external-policy.json>` for library-shaped staging. For standalone packages, use a temporary library fixture containing the actual package and a minimal inventory/record, or equivalent separate package checks; scanning a pointer alone does not scan its target.
5. Run applicable functional checks and `git diff --cached --check`. The scanner does not inspect every binary format or establish rights; review those separately. A clean result applies only to the checked scope.
6. Use the approved branch/PR path. Report actual state: local, branch uploaded, PR open, merged, or released. Do not call a branch a release or bypass pending review/deployment gates.

For migration, verify the destination and one clean consumer adoption before repointing routers. Retire old implementations only when authorized; preserve a pointer and migration status instead of two editable owners.

## Improve from evidence

| Failure cause | Appropriate response |
|---|---|
| Incorrect or incomplete source/input | Correct the consumer's source or state the gap. |
| Missing reusable decision or confusing guidance | Change the owning instruction and test another applicable case. |
| Unclear catalog meaning or boundaries | Correct that option without inventing a compatibility matrix. |
| Tool, dependency, permissions, or environment | Fix the adapter/environment; add portable recovery guidance only if broadly useful. |
| One-off output or aesthetic preference | Correct the output; do not make the preference universal. |

For a shared weakness, capture observation, root cause, smallest correction, and prevention. Verify the asset and an affected consumer, update the regression case, then update record and inventory together. Keep Draft or Pilot status when broader use is untested. Record unavailable checks instead of claiming planned work has passed.

Review external guidance when a dependency changes, a consumer fails, or the owner requests a refresh. Prefer removing stale or duplicated instructions over accumulating rules. Retire an asset with a replacement pointer when another owner covers its outcome.

## Organization-wide facilities are optional

A public `.github` repository can provide supported default community-health files; licenses remain project-specific. A template repository can distribute a useful starting structure. Establish either only with a shared need and owner authorization; neither is a prerequisite for an individual asset.

Primary references checked 2026-09-28:

- [GitHub default community-health files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file).
- [GitHub template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository).
