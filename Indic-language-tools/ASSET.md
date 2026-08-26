# RA-007 - Indic Translation & Summarization Engine

| Metadata | Value |
|---|---|
| Category | AI workflow / Natural Language Processing |
| Select when | Translation, Summarization, Indic, Gujarati, Bhashini, Sarvam, Routing, Evaluation, LLM-as-a-judge |
| Entry point | `scripts/preflight_indic.py` (gate) · `scripts/bhashini_mt_deepseek_qa_loop.py` (one-video MT+QA) · `scripts/bhashini_client.py` |
| Status | Reusable v1.3 |

## Outcome

Determine the cheapest and highest-quality LLM/MT routing path for translating and summarizing Indic language text. **Preflight providers before long runs.** Execute specialist NMT (Bhashini) or LLM MT, summarization, and Dual-LLM evaluation.

## Reuse boundary

- **Reusable core**: Preflight gate (`preflight_indic.py`), safe env loader, model routing (`model_router.py`), Bhashini client (`bhashini_client.py`), summarization executor (`summarize_indic.py`), Dual-LLM evaluation loop (`evaluator_loop.py`).
- **Project-specific profile**: Ignored project-local `.env` / secret manager values (`BHASHINI_*`, `SARVAM_API_KEY`, `DEEPSEEK_API_KEY`, …), target transcripts, domain prompts, bake-off rubrics. Method ownership for routing decisions: RA-004.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `scripts/preflight_indic.py` | Mandatory preflight gate (env + live smokes) | Reusable core |
| `scripts/env_loader.py` | Safe KEY=value loader (no personal paths) | Reusable core |
| `scripts/model_router.py` | litellm routing + bake-off helper | Reusable core |
| `scripts/bhashini_client.py` | ULCA/Udyat config + compute MT with DNS/DoH preflight | Reusable core |
| `scripts/summarize_indic.py` | Direct translation/summarization executor | Reusable core |
| `scripts/evaluator_loop.py` | Dual-LLM judge orchestrator | Reusable core |
| `scripts/term_glossary.py` | Inventory load + prompt block + free EN audit | Reusable core |
| `scripts/bhashini_mt_deepseek_qa_loop.py` | One-video Bhashini MT → DeepSeek QA brief | Reusable core |
| `references/BHASHINI_MT_DEEPSEEK_QA_LOOP.md` | Stage 1 MT (Bhashini+DeepSeek) + handoff to Stage 2 EN pack | Reusable core |
| `scripts/deroll_youtube_captions.py` | De-roll YouTube rolling captions before MT | Reusable core |
| `references/TERM_PRESERVATION_METHOD.md` | Locked-term rules | Reusable core |
| Consumer-owned `profiles/*.glossary.yaml` | Domain terminology profiles | Project profile (excluded) |
| `WALKTHROUGH.md` | Construction and ops notes | Evidence |
| `ISSUES_AND_RESOLUTIONS.md` | Feedback loop | Reusable core |

## Inputs and outputs

- **Inputs**: Indic text or transcript; env credentials; optional `BHASHINI_COMPUTE_IP` when DNS is broken.
- **Outputs**: English translation/summary; structured judge verdicts for evaluation loops.

## Use / transfer

Copy `scripts/` into the consumer (or add to `PYTHONPATH`). Supply credentials through environment variables, an ignored project-local `.env`, or an approved secret manager. **Never** hard-code a personal keys path into this package (AR-006).

**Always preflight before bake-offs** (pairs with RA-004 skill):

```powershell
$env:PYTHONUNBUFFERED="1"
python -u scripts/preflight_indic.py --profile mt_bakeoff --env-file .env --out-json preflight.json
python scripts/bhashini_client.py
```

## Dependencies, cost and licensing

- **Dependencies**: `litellm`, `python-dotenv`, `requests`.
- **Cost**: Bhashini Udyat quotas (often free-tier); Sarvam/DeepSeek/Gemini per provider pricing; Ollama free locally.
- **Ops constraint**: Bhashini compute host may require a reachable India network path **and** working DNS; client falls back to DoH when system DNS fails.

## Verification

Asset structure verified via `validate_asset.py`. Bhashini path smoke-tested with DoH pin (2026-08-09).

## Boundaries and limitations

Does not include web scraping or YouTube transcript downloading. Relies on `litellm` for LLM providers. Evaluator loop may retry if the generator cannot satisfy the judge. Specialist MT availability is an operational gate, not a quality score.
