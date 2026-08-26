# Preflight gate (before bake-offs and long multi-provider runs)

**Why:** Silent hangs and missing keys burn agent tokens and wall-clock time. Fail in seconds with a machine-readable report.

## Rules

1. **Preflight before the loop** — never discover DNS/key failure on segment 7 of 12.
2. **Unbuffered logs** — `python -u`, `PYTHONUNBUFFERED=1`, `print(..., flush=True)`.
3. **Heartbeat artifacts** — create output dir + `progress.json` / `preflight.json` before network I/O.
4. **Short timeouts** — connect ~5s, read ~25s for specialist APIs; no infinite urllib3 retry theater.
5. **Auth host ≠ compute host** — config success does not prove inference reachability.
6. **DNS resilience** — system DNS → DoH → optional explicit IP env; keep SNI/Host correct.
7. **No secrets in logs** — print `set` / `missing`, never key material.
8. **No personal key paths in reusable core** — project passes `--env-file` or injects env (AR-006).

## Checklist (generic)

| Check | Pass means |
|---|---|
| Runtime | UTF-8 stdio; unbuffered |
| Credentials | Required env vars present for the profile |
| Specialist API | Config + one sample inference OK |
| LLM providers | One-token smoke per required provider |
| Output path | Writable; progress file created |

## Indic profile (RA-007)

```powershell
python -u scripts/preflight_indic.py --profile mt_bakeoff --env-file .env --out-json out/preflight.json
```

Profiles: `env` | `bhashini` | `llm_only` | `mt_bakeoff`.

Exit `0` only when all **required** checks pass. Agents must treat non-zero as a hard stop.

## Auto-fixes allowed in-process

- Set `PYTHONUNBUFFERED=1` and `PYTHONIOENCODING=utf-8` for the current process
- Load project-local `.env` via safe KEY=value parser

## Auto-fixes not allowed

- Writing credentials into the reusable package
- Hard-coding personal machine paths
- Silently swapping the system under test

## When preflight fails

Record: check id, detail, suggested fix. Fix ops first. Re-run preflight only. Then start the bake-off.
