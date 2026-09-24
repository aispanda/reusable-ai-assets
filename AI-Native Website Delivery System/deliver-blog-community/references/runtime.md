# Install and verify the local candidate

Requires Node 24+, pnpm 11.22.0, Java 21 for Firebase emulators, and registry access
or a populated verified package cache. No Firebase credentials are needed for the
demo-project emulator tests. A live service requires a separately authorized
Firebase project/Auth provider/Firestore/Storage and server identity; none is created.

On Windows, choose a short installation root. Deeply nested roots can exceed
native executable path limits after pnpm adds its dependency folders: a build
may report `spawn ... esbuild.exe ENOENT` even when the binary exists. Verify the
resolved executable path and retry the same hash-pinned package in a short root;
do not disable dependency checks or change application code to hide this failure.

## Package/install

Run `node scripts/package.mjs pack SOURCE OUTPUT` only on the explicit source
allowlist. The result is a versioned `.blog.json.gz` archive with per-file hashes;
stdout supplies its SHA-256. This is a standard-library installer format, not npm
registry publication. Transfer the package helper with the hash-pinned archive.

`node scripts/package.mjs install ARCHIVE SHA256 INSTALL_ROOT` creates a new
`releases/VERSION-HASHPREFIX` directory. It never overwrites a site, existing core
changes, config, credentials or content. Repeat install verifies identical bytes.
Incomplete installs are left for inspection, not deleted recursively.

The installer retries final-directory rename on `EPERM`/`EBUSY` at most six times
(3.1 seconds total scheduled backoff), rechecks destination absence each time and
verifies the committed files against the pinned archive before reporting success.
It never falls back to copying over a final directory. Failures include structured
`installation` diagnostics with phase, code, attempts (for commit), retained path
and intended release. An existing `.install-lock` blocks a cooperating concurrent
installer; interrupted-run locks require ownership/process inspection before any
separately authorized cleanup. Retry failures retain extraction files and never
change `current.json`. Persistent permission/locking failures need consumer-host
diagnosis; retries are not evidence that the underlying host issue was repaired.
If lock cleanup also fails, diagnostics preserve the original failure and append
`lockCleanup`. If all files verified before cleanup failed, `completed:true` and
the verified result are returned in the error diagnostics; no automatic activation
or lock removal follows.

Keep the original archive/hash for upgrades and rollback. Run
`node scripts/package.mjs activate INSTALL_ROOT RELEASE ARCHIVE SHA256`, or use
`rollback` with the previous release/archive/hash. These atomically change only
`INSTALL_ROOT/current.json`; they do not restart services, deploy or roll back data.
Your consumer launcher must explicitly use the selected release. Never interpret a
pointer change as a production deployment receipt.

## Configure and build

Consumer-owned `site.json` has exactly `siteName`, `description`, `siteOrigin`.
Set `BLOG_SITE_PROFILE` to its absolute path for `pnpm build`; do not edit installed
runtime code. The fictional bundled profile is only a test default.

From the installed `runtime/` directory run:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm build
pnpm test:rules
pnpm test:integration
pnpm test:collections
pnpm test:media
pnpm test:scenarios
```

Keep dependency supply-chain/signature checks enabled. `test` also builds two
fictional profiles in isolated temporary outputs. Rules/integration commands use
only `demo-blog-community` and loopback emulators. If the CLI's global config is
unavailable, supply a new consumer-owned `XDG_CONFIG_HOME`; do not extract existing
browser sessions or credentials. Configure `BLOG_SCENARIO_REPORT` to a private JSON
result path to save exact installed-version/hash and per-suite logs. Direct driver
`node tests/scenarios.test.mjs --require-complete` fails until all required coverage
is proven; a normal zero exit means no executed layer failed, not all36 passed.

`test:media` and the EDIT-04 scenario require the pinned Playwright Chromium build
(`pnpm exec playwright install chromium` if browser installation is authorized),
or an explicitly approved `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. They launch fresh local
test contexts, mock all external provider traffic, and never use existing browser
sessions. Missing browser access is a test-environment failure, not a passing test.

`runtime/.env.example` lists runtime inputs. `PUBLIC_SITE_ORIGIN` must match the
build profile. Runtime Firebase configuration is injected before client scripts;
there is no source-project fallback. Do not put service-account keys in this file.
Use a managed service identity/approved credentials adapter for live deployment.
An existing Admin must authorize bootstrap identities separately; the package
cannot choose an administrator or grant access through coordination messages.

Local startup requires explicit `BLOG_EMULATOR_MODE=true`, staging environment,
demo-project identity and loopback emulator endpoints. Without an isolated Storage
emulator, uploads return a clear unavailable result; they never fall back to cloud
storage. Real Google popup/redirect, deployed browser checks, images and OAuth
authorized domains remain separate gates.

## Source and schema compatibility

The rc.7 [collection-artwork adapter](collection-artwork.md) is optional and starts
with no site-specific catalog. Set `BLOG_COLLECTION_PROFILE` only for an explicitly
owned migration profile. Its API and upload-state helper do not replace the
consumer's collection page, media library or article workflow.

Drafts use canonical Tiptap JSON; publication snapshots keep exact rendered bytes
and schema versions. Legacy migration is explicit and fail-closed. Do not rewrite
an existing user's data merely to install. Future package upgrades need backward
reader compatibility and a consumer-owned backup/migration plan before cloud use.
rc.6 reads existing `ai-91-v1` documents unchanged; only documents using YouTube or
image credit opt into `blog-community-media-v2`. Original legacy-migration reports
retain their v1 provenance. Both original and new publication version tuples are
supported without rerendering frozen HTML. Every new rc.6 publication uses the new
v2 publication tuple, even when its draft has no media. Earlier rc.5 cannot read
new v2 drafts or releases: after any rc.6 publication or media-v2 draft write,
rollback must use a compatible reader or a separately approved,
verified data-restoration plan. Never activate an incompatible older runtime on
the live dataset merely because pointer rollback passes local installer checks.
Current queries require only default single-field Firestore indexes. The bundled
rules must be evaluated and separately deployed to the chosen target; local
installation never changes that project's policies.

Media now includes editable plaintext image credits and strict YouTube URL-to-ID
normalization, a click-to-load no-autoplay privacy-enhanced player, and a permanent
fallback link. Preview uses an opaque sandbox and a CSP hash allowing only the fixed
player script. Unit/HTTP tests and fresh browser fixtures cover these mechanisms;
real provider playback, full upload/Storage/editor interaction, full Google sign-in,
general narrow-view accessibility and network recovery remain unproven. The comments
policy currently permits a valid comment beneath a non-live/missing publication;
Admin access updates and request-resolution records are not transactionally coupled
by rules. Consumers must resolve these policy constraints before production.

## Licences and packaging

The runtime is private/UNLICENSED pending owner public-distribution review. Direct
dependencies and their licence names are listed in `references/dependencies.json`;
full transitive versions are locked in `runtime/pnpm-lock.yaml`. Dependency packages
remain obtained from their registries with their original notices. No downloaded
dependencies, credentials, source-site branding, user data or test logs belong in
the transfer archive. Public release requires separate licence/provenance approval.
