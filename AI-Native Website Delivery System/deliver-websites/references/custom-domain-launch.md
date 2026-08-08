# Custom domain launch readiness

Prepares a project to attach a human-owned hostname to a verified Cloud Run origin. Does not change DNS or cloud state.

## When

After the site is verified on `*.run.app`. Custom domain is a separate gate from first deploy.

## Policy handoff

Execution lives in **RA-002** `CUSTOM_DOMAIN.md`:

- **Allowed:** Cloud Run domain mapping (zero fixed cost) + registrar DNS from GCP-emitted records.
- **Forbidden for this outcome:** ALB / NEG / forwarding rules; Firebase Hosting proxy.

## Project-owned facts (never in this asset)

apex/`www` hosts, registrar, GCP project/region/service, approvers. Keep in project profile (`site.base_url`) and `custom-domain.config`.

## Registrar options

Any registrar that can publish GCP’s records. Examples only: Spaceship, Cloudflare, Namecheap, Porkbun, Route 53, Google/Squarespace. Prefer API-capable registrars when automating (Spaceship adapter in RA-002).

## Defaults (hand to RA-002)

| Decision | Default | Scenario |
|---|---|---|
| Canonical | **`www`** | Share cards and sitemap use `https://www.example.com`. |
| Map hosts | **apex + `www`** | Typing either address must not 404. |
| DNS apply | **UI paste** from exported plan | Safer until registrar API + IP allowlist proven; then API optional. |

## Checklist

1. Platform origin verified.
2. Canonical `base_url` and host list decided.
3. Cloud + DNS + cutover approvers named.
4. Hand off to RA-002 `domain_map.sh` / `apply_dns.py`.

## Approvals (separate)

1. Cloud mapping (`DOMAIN`)
2. DNS publish
3. Cutover verify (`DEPLOY_DOMAIN` + `--verify`)

## Deferred enhancements

Do not invent a new domain asset from this skill. Deferred split/opt-in paths live in **RA-002** `CUSTOM_DOMAIN.md` backlog (**CD-B1…B5**), with exact triggers (e.g. split DNS adapters only when a non–Cloud Run consumer appears).
