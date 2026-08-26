# Term preservation for cultural / spiritual / religious Indic MT & summary

**Asset:** RA-007 · **Audience:** builders wiring GU→EN (or other Indic→EN) for domains where theology, lineage titles, ritual names, and place-names carry fixed meanings.

## Why this exists

Generic MT and LLMs freely paraphrase sacred or sectarian vocabulary (“Angikar” → “acceptance”, “Haveli” → “mansion”). In investigative, historical, or community reporting that **weaponizes or depends on those terms**, paraphrase destroys evidence value. Meanings must be **predetermined in a glossary**, not reinvented per call.

Human bake-off note (2026-08-09): a fluent literal translation of a culturally specific term was contextually wrong; the human-reviewed transliteration had to be locked in the consumer glossary.

## Rules (non-negotiable)

1. **Preserve** listed surface forms in the target language (usually a fixed Romanization). Do not substitute a near-synonym.
2. **Glossary owns meaning.** Optional short gloss may appear once in summaries: `Angikar (locked term; see glossary)`. Do not invent new glosses mid-run.
3. **Dual register when needed.** Some domains need both (a) traditional theological sense and (b) alleged operational / distorted use. The **token stays**; the narrative may explain both — never collapse the token into the gloss alone.
4. **Apply to MT, summary, tags, and judges.** Judges must fail outputs that drop or paraphrase locked terms present in the source.
5. **Specialist NMT is not glossary-aware.** Bhashini/IndicTrans will still paraphrase. Treat glossary as: (a) LLM prompt constraint, (b) DeepSeek polish/QA pass, (c) automated audit after MT.
6. **Profiles are project-owned.** Reusable core ships the method + loader; each domain keeps its YAML glossary profile outside the reusable package.

## Workflow (recommended multi-agent)

| Role | System | Job |
|------|--------|-----|
| Primary MT | **Bhashini** | Fast GU→EN slices when healthy |
| Secondary MT + polish | **DeepSeek** | Fill gaps; **re-apply glossary**; readable English without inventing facts |
| QA / judge | **DeepSeek** (or other family ≠ boxer under test) | Score + **term-audit** against glossary |
| Fallback MT | **Gemini Flash** | When Bhashini unreachable or DeepSeek unavailable |

Do **not** ask Bhashini to “judge” — it is NMT only.

## Loader API

```python
from term_glossary import load_glossary, prompt_block, audit_ Locked_terms

g = load_glossary("profiles/domain.glossary.yaml")
sys_prompt = base_prompt + "\n\n" + prompt_block(g)
hits = audit_locked_terms(source_gu, english, g)
```

## Caption hygiene (related)

Rolling YouTube captions often duplicate overlapping lines. Dedupe before MT so models do not amplify repetition — separate from glossary, but same evidence pipeline.

## Non-goals

- Not a full theological encyclopedia.
- Not permission to soften allegations; locked terms often appear **inside** allegation narratives precisely because the report documents distorted use.
- Not a substitute for human bilingual review on high-stakes slices.
