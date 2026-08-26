# Issues and Resolutions Log

This document tracks known issues, edge cases, and failures for the Indic Translation & Summarization Engine, with resolutions that strengthen the reusable core.

## Template for Logging Issues

### [Date] - [Issue Title]
- **Description**: What went wrong?
- **Source Language / Model**: (e.g., Gujarati / Bhashini / Sarvam)
- **Resolution**: How was it fixed?
- **Status**: Open / Resolved / Integrated into Asset

---

## Active Logs

### 2026-08-09 - Mandatory preflight before bake-offs (token efficiency)
- **Description**: Re-diagnosing DNS/key failures across sessions burned agent tokens; hung runs looked like model failures.
- **Source Language / Model**: Ops / all providers
- **Resolution**: RA-004 `model-routing-bakeoff` skill + RA-007 `preflight_indic.py`; consumers hard-stop on non-zero before long loops (AR-024).
- **Status**: Integrated into Asset

### 2026-08-09 - Bhashini hung with no stdout / no output dir
- **Description**: Project MT bake-off sat for 15+ minutes with empty console and no artifacts. Looked like a dead process.
- **Source Language / Model**: Gujarati / Bhashini compute
- **Resolution**: (1) Create output dir + `progress.json` before network calls. (2) Use `python -u` / `flush=True`. (3) Short connect/read timeouts (5s/25s) so DNS retries cannot masquerade as a hang.
- **Status**: Integrated — `bhashini_client.py` timeouts; project runners unbuffered

### 2026-08-09 - Config auth OK but compute host DNS fails (esp. under VPN)
- **Description**: `meity-auth.ulcacontrib.org` returned pipeline config + `callbackUrl` for `dhruva-api.bhashini.gov.in`, but system `getaddrinfo` failed (`Errno 11001`). Hard-coding that host does not help. India VPN alone did not fix system DNS; Cloudflare DoH still returned `103.114.152.23`, and HTTPS with pinned IP worked.
- **Source Language / Model**: Gujarati / Bhashini Dhruva
- **Resolution**: Discover callback from config only; resolve via system DNS then DoH; pin IP for requests while keeping SNI/Host; optional `BHASHINI_COMPUTE_IP` override. Never treat auth-host success as compute readiness.
- **Status**: Integrated — `scripts/bhashini_client.py`

### 2026-08-09 - Dirty `.env` label lines break dotenv parsers
- **Description**: Key stores sometimes contain non-`KEY=value` label lines; strict dotenv warns or mis-parses.
- **Source Language / Model**: n/a (config)
- **Resolution**: Project loaders skip lines without a safe identifier key. Reusable core still uses `load_dotenv()` on project-local `.env` only — never a personal absolute path (AR-006).
- **Status**: Resolved in consuming runners; keep out of reusable hard-coded paths

### 2026-08-09 - Sarvam-as-MT intermittent empty / echo GU
- **Description**: On identical GU segments, Sarvam sometimes returned empty content or echoed Gujarati instead of English, while Bhashini completed all segments (~1s each).
- **Source Language / Model**: Gujarati / `sarvam/sarvam-105b`
- **Resolution**: Treat specialist NMT (Bhashini) as default GU→EN when reachable; Sarvam as fallback/LLM-MT with completeness gates; score missing outputs as critical errors in bake-offs.
- **Status**: Observed — routing guidance updated in ASSET/WALKTHROUGH
