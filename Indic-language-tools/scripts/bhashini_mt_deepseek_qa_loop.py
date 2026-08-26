"""
One-video loop: Bhashini MT → Python glossary audit → token-efficient DeepSeek QA brief.
See references/BHASHINI_MT_DEEPSEEK_QA_LOOP.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

INDIC = Path(__file__).resolve().parent
sys.path.insert(0, str(INDIC))

from env_loader import ensure_utf8_stdio, load_env_file  # noqa: E402
from bhashini_client import get_translation_pipeline, translate as bhashini_translate  # noqa: E402
from model_router import route_request  # noqa: E402
from term_glossary import (  # noqa: E402
    audit_locked_terms,
    compact_inventory_table,
    context_card_body,
    load_glossary,
)

TS_RE = re.compile(r"^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$")
DEEPSEEK = "deepseek/deepseek-chat"


def log(msg: str) -> None:
    print(msg, flush=True)


def write_json(path: Path, obj: object) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def build_segments(path: Path, n: int = 16) -> list[dict]:
    """Lightweight sampler: opening + keyword hits + evenly spaced fills."""
    parsed = []
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = TS_RE.match(raw.strip())
        if m and m.group(2).strip():
            parsed.append({"t": m.group(1), "gu": m.group(2).strip(), "line": raw.strip()})
    if len(parsed) < 10:
        raise SystemExit("transcript too short")

    keys = [
        "અંગીકાર", "કોટડી", "કોઠો", "દૂતી", "દલાલ", "પોલીસ", "ફરિયાદ", "બ્લેક",
        "સેક્સ", "હત્યા", "નિકુંજ", "હવેલી", "ગોસ્વામી",
    ]
    picks: list[dict] = []

    def add_pair(i: int, bucket: str) -> None:
        if i < 0 or i >= len(parsed):
            return
        rows = parsed[i : i + 2]
        gu = " ".join(r["gu"] for r in rows)
        # skip near-duplicate caption roll
        parts = rows[0]["gu"], rows[-1]["gu"]
        if parts[0] == parts[1]:
            gu = parts[0]
        picks.append(
            {
                "bucket": bucket,
                "t_start": rows[0]["t"],
                "t_end": rows[-1]["t"],
                "gu": gu,
            }
        )

    add_pair(0, "opening")
    add_pair(2, "opening")
    for i, p in enumerate(parsed):
        if sum(1 for x in picks if x["bucket"] == "hot") >= 6:
            break
        if any(k in p["gu"] for k in keys):
            add_pair(i, "hot")

    step = max(1, len(parsed) // max(n, 1))
    i = step
    while len(picks) < n and i < len(parsed):
        add_pair(i, "body")
        i += step

    # dedupe by t_start
    seen: set[str] = set()
    out = []
    for seg in picks:
        if seg["t_start"] in seen:
            continue
        seen.add(seg["t_start"])
        out.append(seg)
        if len(out) >= n:
            break
    for idx, seg in enumerate(out, 1):
        seg["id"] = f"S{idx:02d}"
    return out


def ensure_bhashini(segments: list[dict], store: dict, pipe, out_path: Path) -> dict:
    for seg in segments:
        sid = seg["id"]
        if (store.get(sid) or {}).get("en"):
            continue
        t0 = time.time()
        try:
            res = bhashini_translate(seg["gu"], pipe)
            en = res.text if res.ok else None
            err = None if en else (res.error or "empty")
            lat = round(res.latency_sec or (time.time() - t0), 2)
        except Exception as e:
            en, err, lat = None, str(e), round(time.time() - t0, 2)
        store[sid] = {"en": en, "error": err, "latency_sec": lat, "model": "bhashini"}
        write_json(out_path, store)
        log(f"Bhashini {sid}: {'OK' if en else 'FAIL'} {lat}s")
    return store


def deepseek_qa(
    glossary_table: str,
    card: str,
    samples: list[dict],
    audit_hits: list[dict],
) -> dict:
    prompt = f"""You are QA for Gujarati→English testimony translation in a high-risk domain with a human-approved glossary.
Bhashini produced the English. You do NOT retranslate the whole video.

Tasks:
1) Check locked-term handling using the inventory.
2) Propose NEW terms that need fixed definitions (unclear / softened / domain-loaded).
3) Write a short human brief.

CONTEXT CARD:
{card}

LOCKED INVENTORY:
{glossary_table}

PYTHON AUDIT HITS (may be incomplete):
{json.dumps(audit_hits, ensure_ascii=False)[:3000]}

SAMPLE SLICES (GU + Bhashini EN):
{json.dumps(samples, ensure_ascii=False)[:12000]}

Return STRICT JSON only:
{{
  "violations": [{{"segment_id":"S01","term":"Angikar","problem":"...","bhashini_span":"..."}}],
  "unclear_terms": [{{"gu":"...","transliteration":"...","draft_gloss":"...","why":"...","priority":"high|med|low"}}],
  "human_summary": "8-12 lines for the product owner: what broke, what to add to inventory, whether ready to batch",
  "metric_guess": {{"glossary_risk":"low|med|high","new_terms_worth_adding":0}}
}}
Max 12 unclear_terms. Prefer abuse/ritual/title/legal lexicon over everyday words.
"""
    t0 = time.time()
    raw = route_request(
        DEEPSEEK,
        [
            {"role": "system", "content": "Return JSON only. Be token-efficient."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )
    elapsed = round(time.time() - t0, 2)
    data: dict
    if not raw:
        data = {"error": "empty", "human_summary": "DeepSeek returned empty"}
    else:
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            m = re.search(r"\{[\s\S]*\}", text)
            data = json.loads(m.group(0)) if m else {"error": "parse", "raw": text[:2000]}
    data["_meta"] = {
        "elapsed_sec": elapsed,
        "prompt_chars": len(prompt),
        "model": DEEPSEEK,
    }
    return data


def write_brief(out_dir: Path, video_id: str, meta: dict, qa: dict, audit: list) -> None:
    unclear = qa.get("unclear_terms") or []
    viol = qa.get("violations") or []
    lines = [
        f"# Human QA brief — `{video_id}`",
        "",
        f"**Ran:** {meta.get('ran_at')}",
        f"**Pipeline:** Bhashini MT → Python glossary audit → DeepSeek QA (token-efficient)",
        f"**Segments:** {meta.get('segments_ok')}/{meta.get('segments_total')} · "
        f"Python violations: {len(audit)} · DeepSeek prompt chars: {meta.get('deepseek_prompt_chars')}",
        "",
        "## DeepSeek summary (validate — do not auto-trust)",
        "",
        qa.get("human_summary") or qa.get("error") or "(none)",
        "",
        "## Proposed inventory additions (PENDING your OK/Edit/Drop)",
        "",
        "| GU | Transliteration | Draft gloss | Why | Priority | Mark |",
        "|----|-----------------|-------------|-----|----------|------|",
    ]
    for row in unclear:
        lines.append(
            "| {gu} | {tr} | {gl} | {why} | {pr} | |".format(
                gu=str(row.get("gu") or "").replace("|", "/"),
                tr=str(row.get("transliteration") or "").replace("|", "/"),
                gl=str(row.get("draft_gloss") or "").replace("|", "/"),
                why=str(row.get("why") or "").replace("|", "/")[:100],
                pr=str(row.get("priority") or ""),
            )
        )
    lines += [
        "",
        "## Reported violations",
        "",
        "| Segment | Term | Problem |",
        "|---------|------|---------|",
    ]
    for v in viol:
        lines.append(
            f"| {v.get('segment_id')} | {v.get('term')} | {str(v.get('problem') or '').replace('|', '/')[:120]} |"
        )
    lines += [
        "",
        "## Next",
        "1. Mark proposed terms OK/Edit/Drop in chat.",
        "2. We merge approved terms into the consumer-owned terminology inventory / glossary YAML.",
        "3. Repeat on next video until new terms ≈ 0, then batch.",
        "",
        f"Artifacts: `{out_dir}`",
    ]
    (out_dir / "HUMAN_QA_BRIEF.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--video-id", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--glossary", required=True)
    ap.add_argument("--context-card", required=True)
    ap.add_argument("--env-file", action="append", default=[])
    ap.add_argument("--n-segments", type=int, default=16)
    args = ap.parse_args()

    ensure_utf8_stdio()
    for ef in args.env_file:
        load_env_file(ef)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    gloss = load_glossary(args.glossary)
    card = context_card_body(args.context_card)
    table = compact_inventory_table(gloss)

    segments = build_segments(Path(args.transcript), n=args.n_segments)
    write_json(out_dir / "segments.json", segments)
    log(f"segments={len(segments)}")

    pipe, err = get_translation_pipeline()
    if not pipe:
        raise SystemExit(f"bhashini pipeline failed: {err}")

    mt_path = out_dir / "mt_bhashini.json"
    store = {}
    if mt_path.is_file():
        store = json.loads(mt_path.read_text(encoding="utf-8"))
    store = ensure_bhashini(segments, store, pipe, mt_path)
    write_json(mt_path, store)

    audit_all = []
    samples = []
    for seg in segments:
        sid = seg["id"]
        cell = store.get(sid) or {}
        en = cell.get("en")
        hits = audit_locked_terms(seg["gu"], en or "", gloss) if en else []
        for h in hits:
            h["segment_id"] = sid
            audit_all.append(h)
        samples.append(
            {
                "id": sid,
                "t": f"{seg['t_start']}-{seg['t_end']}",
                "bucket": seg.get("bucket"),
                "gu": seg["gu"],
                "bhashini_en": en,
                "audit_hits": hits,
            }
        )

    # Token-efficient sample: all hit slices first, then fill
    hit_ids = {h["segment_id"] for h in audit_all}
    ordered = [s for s in samples if s["id"] in hit_ids] + [s for s in samples if s["id"] not in hit_ids]
    ordered = ordered[:12]

    qa = deepseek_qa(table, card, ordered, audit_all[:40])
    write_json(out_dir / "qa_deepseek.json", qa)

    meta = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "video_id": args.video_id,
        "segments_total": len(segments),
        "segments_ok": sum(1 for v in store.values() if v.get("en")),
        "python_audit_hits": len(audit_all),
        "deepseek_prompt_chars": (qa.get("_meta") or {}).get("prompt_chars"),
        "deepseek_sec": (qa.get("_meta") or {}).get("elapsed_sec"),
        "workflow": "BHASHINI_MT_DEEPSEEK_QA_LOOP",
    }
    write_json(out_dir / "meta.json", meta)
    write_brief(out_dir, args.video_id, meta, qa, audit_all)
    log(json.dumps(meta, indent=2))
    log(f"brief: {out_dir / 'HUMAN_QA_BRIEF.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
