# RA-008.2 - Indic & Multi-Agent Orchestration Blueprint (Gujarati & Cheaper-than-Gemini LLMs)

| Metadata | Value |
|---|---|
| Asset ID | `RA-008_V2_GUJARATI_INDIC_BENCHMARK` |
| Category | Multi-Agent Architecture / Indic NLP / Gujarati OCR & Translation |
| Trigger Scenarios | Indic OCR, Gujarati Translation, Transcript Summarization, DeepSeek vs Sarvam vs Qwen Routing, Evaluator-Optimizer Loops |
| Status | Production Release v2.0 |
| Scope Boundaries | Architectural execution, cost/performance routing, token efficiency, deterministic prompt contracts |

---

## 1. Executive Strategy & Model Hierarchy (Cheaper & Better than Gemini)

When processing **Gujarati** (transcripts, OCR cleanup, translation), standard frontier models (Gemini 2.5 Pro / GPT-5) suffer from **high token fertility** (4–8 tokens per Gujarati word), making them unnecessarily expensive and prone to regional idiom hallucination.

### The Gujarati & Indic Effectiveness Ranking

1. **Sarvam AI (and similar Indic-native models)**: Built with specialized tokenizers for Indian languages. This drastically reduces token fertility (approaching ~1 token per word), resulting in massive cost savings and inherently deeper cultural and idiomatic understanding of languages like Gujarati.
2. **DeepSeek (e.g. deepseek-chat)**: Excellent cost-to-performance ratio for generating and translating. Often punches above its weight in multilingual tasks without the premium pricing of US-based frontier models.
3. **Qwen**: Exceptional open-weight models that have robust multilingual corpora, providing highly capable translation and reasoning at a fraction of the cost.

### Routing Strategy for the "Highest Quality at Cheapest Cost" (Profile A)
- **Generator Role (Heavy Lifting)**: Route bulk translation, summarization, and OCR cleanup to **DeepSeek** or **Sarvam**. They will perform the expensive generation phase with low token fertility and high accuracy.
- **Judge / Evaluator Role**: Route evaluation to **Gemini Flash** or another high-speed, cheap reasoning model. The Judge's role is to verify the output against the source context using a prompt contract (Chain-of-Thought Evaluation).

This dual-LLM architecture guarantees high quality while avoiding the "Enterprise Grade" premium pricing of standard frontier models.
