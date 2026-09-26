# Blog/community capability — RA-006 extension

Status: **0.2.0-rc.8 — installable local integration candidate.**
Extracted runtime, dependencies, rules, editorial/community UI and executable tests
are included. This is not a production-certified or publicly licensed release.
Complete scenario and deployed-browser evidence remain prerequisites for promotion.

## What is included

| Component | Classification | Use |
| --- | --- | --- |
| SKILL.md and references | Reusable core | Bounded adoption, test and upgrade workflow |
| agents/openai.yaml | Optional client metadata | Skill discovery; not a subagent |
| references/adoption-prompts.md | Reusable core | Trigger prompts and exact-URL handoff contract |
| assets/codex-agents/*.toml | Optional client adapters | Verifier and defect-fixer roles |
| assets/scenarios.json | Reusable test specification | 36 parameterized role/lifecycle scenarios |
| runtime/tests/staging-*.mjs | Reusable hosted verification | Isolated-session preflight; upload/save/reload/preview/publish and anonymous mobile reading |
| assets/profile.example.json | Fictional replaceable profile | Consumer inputs; never deployment authority |
| scripts/validate_contract.py | Reusable utility | Read-only specification/profile checks |
| scripts/test_contract.py | Utility regression tests | Proves validation behavior, not blog behavior |
| runtime/ | Reusable code | Astro/Node/Firebase service, UI, rules, locked dependencies and tests |
| scripts/package.mjs | Reusable utility | Hash-pinned install, repeat install and local code-pointer rollback |
| assets/package-files.json | Transfer allowlist | Exact source files; rejects unclassified files |
| assets/integrations/ | Optional adapters | Native Node mount, React navigation and Flask redirect |
| scripts/adopt.mjs | Reusable utility | Deterministic pinned installation, verification, ownership and guarded upgrades |
| scripts/coordination.mjs | Reusable utility | Atomic protocol, deterministic watcher and deduplication; no LLM wake API |
| references/collection-artwork.md | Optional adapter contract | Administrator collection artwork upload, registry concurrency, generation-safe cleanup and consumer UI state |

RA-006 owns website capability selection. Reuse RA-003 for packaging and RA-002 for
deployment when they are available in the adopter's environment. RA-008 may guide
orchestration selection; it is not a runtime dependency. Do not duplicate owners.

## Use from another thread or IDE

A capable agent can read this SKILL.md at its supplied path without copying the
conversation. For clients supporting Agent Skills, install this entire directory
as `.agents/skills/deliver-blog-community` using that client's supported installer.
Preserve relative references. Do not overwrite an existing installation silently.

For Codex, optionally copy the two TOML adapters into the consumer's
`.codex/agents/` after inspecting conflicts. They refer to the installed skill path.
No global config, model override, MCP server, credentials or auto-run daemon is
installed. Portable role briefs work elsewhere; native adapter support for other
IDEs is **unverified**, not implicitly guaranteed.

Models inherit the operator's configured choice. Escalate only when a concrete
task or review result warrants it; do not hardcode model names as permanent policy.
The website itself must not need these development agents to handle ordinary users.

## Runtime boundary

The rc.8 runtime adds site-wide editorial roles, administrator-only collection/user
management, role applications and invitations, explicit review submission/return,
author unpublication, administrator-only trash after unpublication, three article
presentations, and generic public collection/article indexes. Publishers cannot
edit another author's draft; adaptations remain separately attributed articles.
These are packaged capabilities, not a claim that every consumer has passed acceptance.

This prerelease keeps v1 readers and original stored bytes, and adds opt-in v2
drafts for image credit and normalized, consent-loaded YouTube nodes. Publication
snapshots use a new version tuple while old snapshots remain readable. It includes
structured JSON authoring, server sanitization, immutable publication snapshots,
recoverable trash and role-enforced comments. Every new rc.6 publication uses the
v2 snapshot tuple, including plain articles. Do not downgrade to a v1-only runtime
after a v2 draft write or any rc.6 publication; local pointer rollback does not
migrate or restore data.
Keep branding, domains, initial Admin identity, cloud facts, credentials, user data
and test receipts outside the package. The supported runtime is Astro/Node/Firebase;
React/Vite + Flask integrates via a separately hosted service, not a Flask rewrite.
See [runtime](references/runtime.md), [coverage](references/coverage.md), and
[integration adapters](references/integration-react-flask.md).

Use versioned dependency/renderer boundaries. Prefer a small configuration adapter
over consumer-specific changes to core. A valid profile is never a release receipt.
Installer idempotency and upgrade/rollback safety require actual consumer testing.

## Quality and release

Current utilities require Python 3.11+ standard library.
Run `python scripts/test_contract.py` and the skill validator from the owning
asset toolchain. Validate a clean copied package without cache/dependency output.
Public distribution requires licence/provenance review and explicit authority.

Do not label this capability Reusable until:
1. Its source site's required tests and deployment evidence pass.
2. A clean unrelated site with separate branding/domain/data installs without
   changing core, then passes the same executable role/lifecycle tests.
3. Repeat installation, upgrade, rollback and missing-authority failure are proven.
4. Skill evaluations cover clean adoption, safe upgrade and blocked prerequisites.
5. The final package passes owner validators and private-data/credential scans.

Until then, `--require-runtime` proves only file/test presence, not readiness.
The installer never publishes, deploys, migrates data, initializes privileged users,
installs dependencies, or restarts a service. Code rollback needs a hash-pinned
previous archive and leaves configuration, cloud data and publication snapshots intact.

## Sources

- [Agent Skills](https://agentskills.io/specification): portable skill convention.
- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Playwright authentication](https://playwright.dev/docs/auth)
- [Firebase rules testing](https://firebase.google.com/docs/rules/unit-tests)
- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

Client-specific behavior and real Google sign-in require consumer verification.
Source-project evidence belongs with the consumer, never in this public package.
