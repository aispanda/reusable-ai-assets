# Custom domain mapping (Cloud Run) — zero-cost policy

Attach project-owned hostnames to a verified Cloud Run service at **$0 fixed baseline**. Separate from `deploy.sh --deploy`.

Official reference: [Mapping custom domains](https://docs.cloud.google.com/run/docs/mapping-custom-domains).

## Policy (library law)

| Allowed | Forbidden |
|---|---|
| Native **Cloud Run domain mapping** + Google-managed TLS | GCP **Application Load Balancer**, serverless NEG, global forwarding rules for domain attach |
| Any registrar that can publish GCP-emitted DNS (Spaceship, Cloudflare, …) | Inventing DNS records; baking real hostnames into this package |
| Automation via scripts in `scripts/custom_domain/` | Firebase Hosting proxy (excluded after repeated project friction) |

Preview/region limits of domain mapping are accepted in exchange for zero fixed LB cost. Re-check Google’s availability table before a new region.

## Preconditions

- Service healthy on `*.run.app`; deploy verification passed once.
- Domain owned at a registrar; Spaceship is one option, not the only.
- Approvals: (A) cloud mapping `DOMAIN`, (B) DNS publish, (C) cutover verify.
- Every `gcloud` call passes `--project` from config.

## Defaults (zero-cost production)

Use these unless the project records a different choice:

| Decision | Default | Why (scenario) |
|---|---|---|
| Canonical host | **`www`** | Visitor bookmarks and share URLs stay stable; `www` is usually a simple **CNAME** to Google. Example: canonical `https://www.example.com`, not the bare apex. |
| Hosts to map | **`www` + apex** | People type both. Example: map `www.example.com` and `example.com` so neither is a dead link. |
| DNS publish | **UI paste first** | Export the plan, paste into the registrar UI. Use **API** only when registrar API keys exist **and** the caller IP is already allowed. |

Redirect policy after both resolve: apex → `www` (or reverse) is a project choice; canonical metadata must match the chosen host.


## Automation

```bash
# 0) Ownership preflight (stops with paste instructions if needed)
CUSTOM_DOMAIN_CONFIG=/path/to/custom-domain.config \
  bash scripts/custom_domain/preflight_ownership.sh

# 1) Create/update mappings (requires typed DOMAIN)
CUSTOM_DOMAIN_CONFIG=/path/to/custom-domain.config \
  bash scripts/custom_domain/domain_map.sh --map --dry-run
CUSTOM_DOMAIN_CONFIG=/path/to/custom-domain.config \
  bash scripts/custom_domain/domain_map.sh --map

# 2) Export DNS plan Google requires (no mutation)
CUSTOM_DOMAIN_CONFIG=/path/to/custom-domain.config \
  bash scripts/custom_domain/domain_map.sh --export-dns > dns-plan.json

# 3) Apply DNS at registrar (Spaceship API or printed manual steps)
python scripts/custom_domain/apply_dns.py --plan dns-plan.json --provider spaceship --dry-run
python scripts/custom_domain/apply_dns.py --plan dns-plan.json --provider spaceship

# 4) After cert active: set DEPLOY_DOMAIN to canonical HTTPS origin; run deploy.sh --verify
```

Spaceship credentials: `SPACESHIP_API_KEY`, `SPACESHIP_API_SECRET` (scopes `dnsrecords:read`, `dnsrecords:write`). **Spaceship API often requires IP allowlisting** in API Manager — if the agent/runner IP is not listed, calls fail; fall back to `--provider manual` (UI paste). Other registrars: `--provider manual` prints records for UI paste.


## Operator sequence

1. **Ownership (one-time per apex):** `gcloud domains verify <apex>` → publish Google’s TXT (or HTML) challenge at the registrar → confirm in Search Console. Mapping fails without this (DA-012).
2. `--map` for each configured hostname (apex and/or `www`).
3. `--export-dns` → exact CNAME/A/AAAA from mapping describe.
4. Apply plan at registrar after DNS approval (default: UI paste).
5. Wait for managed certificate (minutes–hours).
6. Probe canonical HTTPS; update `DEPLOY_DOMAIN`; `--verify`.

## Approval tokens

- Cloud: exact `DOMAIN` (not `DEPLOY`).
- DNS: observed apply evidence (API 204 or registrar UI).
- Cutover: `--verify` on custom origin.

## Safety

- Do not fold into `--deploy`.
- Do not provision ALB/NEG/forwarding rules for this outcome.
- Do not delete DNS/mappings without explicit rollback approval.
- No real client domains in this reusable package.

## Backlog (do not build until trigger fires)

| ID | Enhancement | Build when (exact trigger) | Notes |
|---|---|---|---|
| CD-B1 | Split registrar DNS adapters into a new inventory asset (e.g. RA-009) | A **non–Cloud Run** consumer needs the same DNS apply/export kit, **or** a second hosting target (not Cloud Run domain mapping) reuses Spaceship/Cloudflare adapters | Until then, keep adapters under `scripts/custom_domain/` here |
| CD-B2 | ALB / Certificate Manager path as an **opt-in paid** profile | Stakeholder **explicitly accepts** fixed LB monthly cost and needs CDN/WAF/multi-backend routing | Remains forbidden under default zero-cost policy |
| CD-B3 | Firebase Hosting proxy path | Only if Firebase is already mandated for that project **and** Cloud Run domain mapping is unavailable in-region | Default excluded (past friction) |
| CD-B4 | Fully unattended DNS (no human DNS token) | Org policy allows storing registrar API secrets in an approved secret store, **caller IP is allowlisted** where required (e.g. Spaceship), **and** two successful API cutovers are recorded | Keep human DNS approval / UI paste until then |
| CD-B5 | Apex ALIAS/ANAME automation per registrar quirks | First apex cutover fails because registrar lacks flat A/AAAA for GCP’s emitted records | Document per-registrar quirk in ISSUES; then automate |

Future agents: prefer enriching this file + `ISSUES_AND_RESOLUTIONS.md` over inventing a parallel domain playbook. Propose a new RA only when CD-B1’s trigger is met; ask the owner before scaffolding.
