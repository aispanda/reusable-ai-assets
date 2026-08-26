# Workflow: Bhashini MT → DeepSeek QA → human term growth → Cursor EN pack

**Asset:** RA-007 · **Name:** `BHASHINI_MT_DEEPSEEK_QA_LOOP`
**Goal:** Highest useful accuracy at low token cost using free Bhashini + selective DeepSeek for **Stage 1 (MT)**; Cursor/Grok for **Stage 2 (English evidence pack)**.

## Two stages (do not blur)

| Stage | Job | Default owner |
|-------|-----|---------------|
| **1 — Indic MT** | De-roll GU → Bhashini GU→EN → glossary audit → DeepSeek polish/QA → human terms | Bhashini + DeepSeek + human |
| **2 — EN evidence pack** | Tags + timestamped quotes + detailed summary + ≤150-word summary | **Cursor / Grok** (not DeepSeek) |

DeepSeek is **not** the primary summarizer/tagger. Once EN is clean, Stage 2 is an English reasoning job.

**Full mandatory checklist (terminology/context gates, when to update vs use, human review order, anti-skip):**
The consumer-owned evidence workflow is authoritative for domain terminology and human review.

## Roles (Stage 1)

| Agent | Job | Uses terminology/context card? |
|-------|-----|--------------------------------|
| **De-roll (Python)** | Collapse YouTube rolling-caption doubles **before** MT | No |
| **Bhashini** | Straight GU→EN MT only | **No** (NMT API — no prompt) |
| **Python audit** | Free glossary check on EN vs GU | Yes (inventory YAML/MD) |
| **DeepSeek** | Token-efficient QA brief + EN glossary polish + proposed term additions | Yes (card + inventory) |
| **Human** | Approve/edit/drop new terms; accept QA notes | Yes |

## Roles (Stage 2)

| Agent | Job | Uses terminology/context card? |
|-------|-----|--------------------------------|
| **Cursor / Grok** | Material-complete detailed summary, ≤150-word summary, taxonomy tags, YouTube-timestamped quotes | Yes |
| **Gemini batch script** | Corpus Excel fill **only after** Cursor-proven template | Yes (light) |
| **Local EN models** | Offline/privacy drafts after clean EN | Yes (light) |

Prompt: use the consumer-owned Stage 2 evidence-pack prompt.

## Stage 1 — one-video bootstrap loop

1. Pick **one** video.
2. **De-roll** transcript (crystal-clear rolling repetition) — never send doubled GU to Bhashini.
3. Segment captions (overlap-aware join).
4. **Bhashini** translates all segments. Persist `mt_bhashini.json`.
5. **Python** `audit_locked_terms` → free hit list.
6. **DeepSeek** (token budget): context card + locked-term table + audit hits + sample GU/EN → JSON `violations`, `unclear_terms[]`, `human_summary`; optional polish pass.
7. Write `HUMAN_QA_BRIEF.md` — **do not auto-merge** inventory.
8. Human validates → merge into inventory / context card.
9. Hand off to **Stage 2** with polished EN + derolled timestamps.

## Stage 2 — English evidence pack (per video)

1. Inputs: derolled GU timestamps + polished EN + taxonomy + context card.
2. Cursor/Grok produces: Tags → quotes (`&t=`) → detailed summary → ≤150-word summary.
3. Pass **material-complete checklist** (omit nothing material; no trivial filler).
4. Human review; then optional Excel `Summary_EN` / `Tags`.

## Metrics (per video)

- `segments_ok / segments_total`
- `glossary_violation_count` (Python)
- `new_term_candidates` (DeepSeek, pending human)
- `deepseek_prompt_chars` (token proxy)
- Stage 2: `coverage_checklist` pass/fail; quote count; summary word counts

## Stop condition (Stage 1 term growth)

When 2–3 consecutive videos add **≈0** approved new terms and violation rate is stable/low → batch remaining videos with same fixed inventory + Python audit + optional spot DeepSeek → then Stage 2 at scale.

## Non-goals

- Teaching Bhashini the glossary at runtime
- Full DeepSeek re-translation of every slice every run
- Auto-writing inventory without human OK
- Using DeepSeek as default Stage 2 summarizer/tagger
- Sending raw/doubled GU into Stage 2

## Runner (Stage 1)

```text
python -u scripts/bhashini_mt_deepseek_qa_loop.py \
  --transcript PATH \
  --video-id ID \
  --glossary profiles/….yaml \
  --context-card PATH.md \
  --out-dir OUT \
  --env-file .env
```

De-roll first: `python -u scripts/deroll_youtube_captions.py TRANSCRIPT --out DEROLLED.txt`
