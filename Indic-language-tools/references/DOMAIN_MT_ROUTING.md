# Domain MT routing — cultural / spiritual Indic packs

Companion to `TERM_PRESERVATION_METHOD.md` and RA-004 bake-off method.
Stage 2 EN pack details remain in the consumer-owned prompt pack; the reusable loop is `BHASHINI_MT_DEEPSEEK_QA_LOOP.md`.

## Default lane (post 2026-08 bake-offs + human eye)

| Priority | System | Role |
|----------|--------|------|
| 1 | **Bhashini** | Primary GU→EN specialist MT |
| 2 | **DeepSeek** (`deepseek-chat`) | Secondary MT / glossary polish; **Stage 1 QA** |
| 3 | **Gemini 2.5 Flash** | Fallback MT when 1–2 fail or timeout |

Local open-weight (e.g. Qwen) = offline / privacy lane, not default quality.

## Why this split

- Bake-off ops: Bhashini ~1 s, complete; DeepSeek ~1.5 s; Gemini ~7 s.
- Human eye: Bhashini often best word choice **until** locked terms appear — then unconstrained MT dilutes meaning (Angikar → “acceptance”).
- Bhashini cannot LLM-QA; DeepSeek can enforce glossary + faithfulness.
- Role separation: when DeepSeek is boxer, use a different family as judge (or glossary audit + human).
- **Summaries/tags are English-side:** after clean EN, use Cursor/Grok — not DeepSeek as primary Stage 2.

## Orchestration sketch

```
Raw GU captions
  → de-roll YouTube rolling doubles (mandatory)
  → preflight (RA-007)
  → Bhashini MT
      fail? → DeepSeek MT
      fail? → Gemini MT
  → DeepSeek polish (inject glossary; fix locked terms; light fluency)
  → term_glossary.audit_locked_terms
  → DeepSeek QA (rubric + glossary checklist)  [Stage 1]
  → human term OK / inventory update
  → Stage 2 EN evidence pack (Cursor/Grok default):
        Tags + timestamped quotes + detailed summary + ≤150-word summary
  → optional: Gemini batch Excel fill (only after Cursor template locked)
  → optional: local EN models (offline drafts)
```

## Policy flags

- `GLOSSARY_REQUIRED=1` — refuse Stage 2 summary without glossary path / polished EN.
- Fail open on specialist MT with logged route; never silent empty EN.
- Never send rolling-duplicated GU to Bhashini or Stage 2.
- DeepSeek is **not** the default Stage 2 summarizer/tagger.
