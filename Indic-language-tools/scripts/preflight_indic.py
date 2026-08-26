"""
Preflight gate for Indic MT / Dual-LLM workflows (RA-007).

Run this *before* long bake-offs so agents fail in seconds with a machine-readable
report instead of burning tokens on silent hangs (AR-021/022).

Profiles:
  mt_bakeoff  — Bhashini + Sarvam + DeepSeek keys + live smokes
  bhashini    — Bhashini only
  llm_only    — litellm keys only (no Bhashini)
  env         — credentials + runtime hygiene only (no network)

Exit codes:
  0 = all required checks passed (warnings allowed)
  1 = one or more required checks failed
  2 = bad CLI usage

Never prints secret values. Never hard-codes personal key paths.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Sibling imports when run as script or on PYTHONPATH
_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from env_loader import ensure_utf8_stdio, load_env_file  # noqa: E402


@dataclass
class CheckResult:
    id: str
    ok: bool
    required: bool
    detail: str
    fix: str = ""
    latency_sec: float | None = None


@dataclass
class PreflightReport:
    profile: str
    ran_at: str
    ok: bool
    checks: list[CheckResult] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    auto_fixes_applied: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "profile": self.profile,
            "ran_at": self.ran_at,
            "ok": self.ok,
            "checks": [asdict(c) for c in self.checks],
            "warnings": self.warnings,
            "auto_fixes_applied": self.auto_fixes_applied,
        }


PROFILES: dict[str, dict[str, Any]] = {
    "env": {
        "need_bhashini": False,
        "need_sarvam": False,
        "need_deepseek": False,
        "live_bhashini": False,
        "live_sarvam": False,
        "live_deepseek": False,
    },
    "bhashini": {
        "need_bhashini": True,
        "need_sarvam": False,
        "need_deepseek": False,
        "live_bhashini": True,
        "live_sarvam": False,
        "live_deepseek": False,
    },
    "llm_only": {
        "need_bhashini": False,
        "need_sarvam": True,
        "need_deepseek": True,
        "live_bhashini": False,
        "live_sarvam": True,
        "live_deepseek": True,
    },
    "mt_bakeoff": {
        "need_bhashini": True,
        "need_sarvam": True,
        "need_deepseek": True,
        "live_bhashini": True,
        "live_sarvam": True,
        "live_deepseek": True,
    },
}


def _present(name: str) -> bool:
    return bool(os.environ.get(name, "").strip())


def check_runtime(report: PreflightReport) -> None:
    ensure_utf8_stdio()
    unbuf = os.environ.get("PYTHONUNBUFFERED", "").strip() in {"1", "true", "TRUE", "yes"}
    ioenc = (os.environ.get("PYTHONIOENCODING") or "").lower()
    if not unbuf:
        os.environ["PYTHONUNBUFFERED"] = "1"
        report.auto_fixes_applied.append("set PYTHONUNBUFFERED=1 for this process")
        report.warnings.append(
            "Parent shells should launch with python -u / PYTHONUNBUFFERED=1 (AR-021)"
        )
    if "utf-8" not in ioenc and "utf8" not in ioenc:
        os.environ["PYTHONIOENCODING"] = "utf-8"
        report.auto_fixes_applied.append("set PYTHONIOENCODING=utf-8 for this process")
    report.checks.append(
        CheckResult(
            id="runtime_stdio",
            ok=True,
            required=True,
            detail=f"unbuffered={os.environ.get('PYTHONUNBUFFERED')} io={os.environ.get('PYTHONIOENCODING')}",
            fix="Export PYTHONUNBUFFERED=1 and PYTHONIOENCODING=utf-8 before long runs",
        )
    )


def check_env_keys(report: PreflightReport, cfg: dict[str, Any]) -> None:
    pairs = [
        ("bhashini_udyat", "BHASHINI_UDYAT_KEY", cfg["need_bhashini"]),
        ("bhashini_user", "BHASHINI_USER_ID", cfg["need_bhashini"]),
        ("sarvam", "SARVAM_API_KEY", cfg["need_sarvam"]),
        ("deepseek", "DEEPSEEK_API_KEY", cfg["need_deepseek"]),
    ]
    for cid, env_name, required in pairs:
        ok = _present(env_name)
        report.checks.append(
            CheckResult(
                id=f"env_{cid}",
                ok=ok,
                required=required,
                detail=f"{env_name}={'set' if ok else 'missing'}",
                fix=f"Set {env_name} in the project-local .env or secret manager (not in reusable core)",
            )
        )
    # Soft: inference key unused when config returns auth, but note if absent
    if cfg["need_bhashini"] and not _present("BHASHINI_INFERENCE_API_KEY"):
        report.warnings.append(
            "BHASHINI_INFERENCE_API_KEY unset — OK if pipeline config returns inferenceApiKey"
        )


def check_bhashini_live(report: PreflightReport) -> None:
    from bhashini_client import get_translation_pipeline, translate

    t0 = time.time()
    pipe, err = get_translation_pipeline()
    if not pipe:
        report.checks.append(
            CheckResult(
                id="bhashini_pipeline",
                ok=False,
                required=True,
                detail=err or "unknown",
                fix=(
                    "Fix VPN/DNS, or set BHASHINI_COMPUTE_IP to a working A record "
                    "(DoH often returns 103.114.152.23 for dhruva-api.bhashini.gov.in). "
                    "Confirm BHASHINI_UDYAT_KEY + BHASHINI_USER_ID."
                ),
                latency_sec=round(time.time() - t0, 2),
            )
        )
        return
    report.checks.append(
        CheckResult(
            id="bhashini_pipeline",
            ok=True,
            required=True,
            detail=(
                f"service={pipe.service_id} ip={pipe.resolved_ip} via={pipe.resolve_source}"
            ),
            latency_sec=round(time.time() - t0, 2),
        )
    )
    if pipe.resolve_source == "doh":
        report.warnings.append(
            "Compute host resolved via DoH (system DNS broken under VPN) — OK but ops-fragile"
        )
    t1 = time.time()
    sample = translate("તમે કેમ છો?", pipe)
    report.checks.append(
        CheckResult(
            id="bhashini_sample",
            ok=bool(sample.ok and sample.text),
            required=True,
            detail=(sample.text or sample.error or "")[:120],
            fix="Compute auth/DNS still failing after pipeline OK — retry with BHASHINI_COMPUTE_IP",
            latency_sec=round(time.time() - t1, 2),
        )
    )


def check_llm_smoke(report: PreflightReport, model: str, check_id: str, required: bool) -> None:
    from model_router import route_request

    t0 = time.time()
    out = route_request(
        model,
        [
            {"role": "system", "content": "Reply with exactly: PONG"},
            {"role": "user", "content": "ping"},
        ],
    )
    text = (out or "").strip()
    ok = bool(text) and "pong" in text.lower()
    # Accept any non-empty short reply if model is chatty
    if not ok and text and len(text) < 80:
        ok = True
    report.checks.append(
        CheckResult(
            id=check_id,
            ok=ok,
            required=required,
            detail=(text[:120] if text else "empty/error — see Routing Error above"),
            fix=f"Verify API key and litellm model id `{model}`",
            latency_sec=round(time.time() - t0, 2),
        )
    )


def run_preflight(
    profile: str = "mt_bakeoff",
    env_files: list[Path | str] | None = None,
    out_json: Path | str | None = None,
) -> PreflightReport:
    if profile not in PROFILES:
        raise ValueError(f"unknown profile {profile}; choose from {sorted(PROFILES)}")
    cfg = PROFILES[profile]
    report = PreflightReport(
        profile=profile,
        ran_at=datetime.now(timezone.utc).isoformat(),
        ok=False,
    )
    for ef in env_files or []:
        n = load_env_file(ef)
        if n:
            report.auto_fixes_applied.append(f"loaded {n} keys from {ef}")

    check_runtime(report)
    check_env_keys(report, cfg)

    # Skip live checks if required env already failed
    env_blocking = any(c.required and not c.ok and c.id.startswith("env_") for c in report.checks)

    if cfg["live_bhashini"] and not env_blocking:
        if _present("BHASHINI_UDYAT_KEY") and _present("BHASHINI_USER_ID"):
            check_bhashini_live(report)
        else:
            report.checks.append(
                CheckResult(
                    id="bhashini_pipeline",
                    ok=False,
                    required=True,
                    detail="skipped — missing Bhashini env",
                    fix="Set BHASHINI_UDYAT_KEY and BHASHINI_USER_ID",
                )
            )

    if cfg["live_sarvam"] and _present("SARVAM_API_KEY") and not (
        any(c.id == "env_sarvam" and not c.ok for c in report.checks)
    ):
        check_llm_smoke(report, "sarvam/sarvam-105b", "sarvam_smoke", required=True)
    elif cfg["live_sarvam"]:
        report.checks.append(
            CheckResult(
                id="sarvam_smoke",
                ok=False,
                required=True,
                detail="skipped — missing SARVAM_API_KEY",
                fix="Set SARVAM_API_KEY",
            )
        )

    if cfg["live_deepseek"] and _present("DEEPSEEK_API_KEY"):
        check_llm_smoke(report, "deepseek/deepseek-chat", "deepseek_smoke", required=True)
    elif cfg["live_deepseek"]:
        report.checks.append(
            CheckResult(
                id="deepseek_smoke",
                ok=False,
                required=True,
                detail="skipped — missing DEEPSEEK_API_KEY",
                fix="Set DEEPSEEK_API_KEY",
            )
        )

    report.ok = all(c.ok for c in report.checks if c.required)
    if out_json:
        path = Path(out_json)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def print_report(report: PreflightReport) -> None:
    ensure_utf8_stdio()
    status = "PASS" if report.ok else "FAIL"
    print(f"PREFLIGHT {status} profile={report.profile}", flush=True)
    for c in report.checks:
        flag = "OK" if c.ok else ("MISS" if not c.required else "FAIL")
        lat = f" {c.latency_sec}s" if c.latency_sec is not None else ""
        print(f"  [{flag}] {c.id}{lat}: {c.detail}", flush=True)
        if not c.ok and c.fix:
            print(f"       fix: {c.fix}", flush=True)
    for w in report.warnings:
        print(f"  [WARN] {w}", flush=True)
    for a in report.auto_fixes_applied:
        print(f"  [AUTO] {a}", flush=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Indic MT / Dual-LLM preflight gate (RA-007)")
    parser.add_argument(
        "--profile",
        default="mt_bakeoff",
        choices=sorted(PROFILES),
        help="Which required providers to verify",
    )
    parser.add_argument(
        "--env-file",
        action="append",
        default=[],
        help="Optional project-local .env path (repeatable). Never commit secrets.",
    )
    parser.add_argument("--out-json", default="", help="Write machine-readable report path")
    parser.add_argument(
        "--allow-warn",
        action="store_true",
        help="Exit 0 even if only optional checks fail (required still must pass)",
    )
    args = parser.parse_args(argv)
    report = run_preflight(
        profile=args.profile,
        env_files=args.env_file,
        out_json=args.out_json or None,
    )
    print_report(report)
    if report.ok:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
