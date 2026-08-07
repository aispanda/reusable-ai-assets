# RA-007 - Indic Translation & Summarization Engine

| Metadata | Value |
|---|---|
| Category | AI workflow / Natural Language Processing |
| Select when | Translation, Summarization, Indic, Gujarati, Routing, Evaluation, LLM-as-a-judge |
| Entry point | `scripts/evaluator_loop.py` |
| Status | Reusable v1.0 |

## Outcome

Determine the cheapest and highest-quality LLM routing path for translating and summarizing Indic language text. Execute single-step translation/summarization using frontier APIs or free local models, and self-correct the outputs using a Dual-LLM (Judge) architecture to prevent hallucinations and blind spots.

## Reuse boundary

- **Reusable core**: The model routing logic (`model_router.py`), summarization executor (`summarize_indic.py`), and the Dual-LLM evaluation loop (`evaluator_loop.py`).
- **Project-specific profile**: The `.env` file containing API keys (e.g. `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`), the specific target transcripts, and the custom domain prompts.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `scripts/model_router.py` | Decision engine and API wrapper via litellm (with bake-off feature) | Reusable core |
| `scripts/summarize_indic.py` | Executor for direct translation and summarization | Reusable core |
| `scripts/evaluator_loop.py` | Dual-LLM judge orchestrator for self-correction | Reusable core |
| `WALKTHROUGH.md` | Record of how and why the asset was constructed | Evidence |
| `ISSUES_AND_RESOLUTIONS.md` | Feedback loop log to continually strengthen the asset | Reusable core |

## Inputs and outputs

- **Inputs**: Indic language transcript (e.g. `.txt`), `generator` and `judge` litellm-compatible model strings.
- **Outputs**: Verified English summary printed to stdout or saved to an output file.

## Use / transfer

Copy the `scripts/` directory into your project. Supply provider credentials through environment variables, an ignored project-local `.env`, or an approved secret manager. Run `python scripts/evaluator_loop.py path/to/transcript.txt` to execute.

## Dependencies, cost and licensing

- **Dependencies**: `litellm`, `python-dotenv`.
- **Cost**: Highly variable based on the routed models. Free if routing to local models via Ollama. Very cheap if routing to `deepseek/deepseek-chat` or `gemini/gemini-3.5-flash`.

## Verification

Asset structure verified via `validate_asset.py`.

## Boundaries and limitations

Does not include web scraping or YouTube transcript downloading. Relies on `litellm` for unifying the API provider boundaries. Evaluator loop may get stuck in a retry loop if the generator model is fundamentally incapable of satisfying the judge's prompt.
