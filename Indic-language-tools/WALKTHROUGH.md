# Indic Translation and Summarization Engine walkthrough

This asset separates three concerns: provider-neutral model routing, transcript summarization, and independent evaluation with bounded retries.

## Use

1. Install the documented Python dependencies in an isolated environment.
2. Supply credentials through environment variables, an ignored project-local `.env`, or an approved secret manager. Never store keys in the asset.
3. Run the evaluator with a fictional or explicitly approved transcript:

```powershell
python scripts/evaluator_loop.py "transcript.txt" --generator-model "provider/model" --judge-model "other-provider/model"
```

The evaluator can detect some omissions or inconsistencies but does not prove correctness. Human review remains required for sensitive, legal, medical, safety-critical or culturally nuanced material.
