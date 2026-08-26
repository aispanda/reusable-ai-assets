# Indic Translation and Summarization Engine walkthrough

This asset separates four concerns: provider-neutral LLM routing, specialist Indic NMT (Bhashini), transcript summarization, and independent evaluation with bounded retries.

## Use

1. Install the documented Python dependencies in an isolated environment.
2. Supply credentials through environment variables, an ignored project-local `.env`, or an approved secret manager. Never store keys in the asset. Never hard-code a personal keys directory into reusable core.
3. **Run preflight before any bake-off** (RA-004 skill + this package):

```powershell
$env:PYTHONUNBUFFERED="1"
$env:PYTHONIOENCODING="utf-8"
python -u scripts/preflight_indic.py --profile mt_bakeoff --env-file .env --out-json preflight.json
```

Hard-stop if exit code ≠ 0. Fix DNS/VPN/keys, then re-run preflight only.

4. Prefer **slice MT → English downstream** over full-transcript MT for long media.
5. For GU→EN specialist MT after a green preflight:

```powershell
python -u scripts/bhashini_client.py
```

6. For Dual-LLM summary evaluation:

```powershell
python scripts/evaluator_loop.py "transcript.txt" --generator-model "provider/model" --judge-model "other-provider/model"
```

## Bhashini ops notes (learned)

- Config host success ≠ compute host readiness. Always preflight the `callbackUrl` host.
- Under some VPNs, system DNS fails for `dhruva-api.bhashini.gov.in` while DoH still resolves it. The client tries system DNS, then DoH, then optional `BHASHINI_COMPUTE_IP`.
- Use short timeouts and unbuffered logs so failures surface in seconds, not as silent hangs.
- Do not hard-code the Dhruva hostname as a silent fallback that bypasses config discovery.

## Routing sketch

| Task | Prefer | Fallback |
|---|---|---|
| GU→EN caption/evidence slices | Bhashini NMT | Sarvam or multilingual DeepSeek on GU |
| EN tags/summaries after MT | Cheap/local EN model | Stronger EN model |
| MT bake-off judge | Independent model family (e.g. DeepSeek) | Human bilingual review |

The evaluator can detect some omissions or inconsistencies but does not prove correctness. Human review remains required for sensitive, legal, medical, safety-critical or culturally nuanced material.
