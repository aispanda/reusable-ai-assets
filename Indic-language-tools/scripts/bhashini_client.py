"""
Bhashini (ULCA / Udyat) translation client — reusable core.

Auth config host and compute callbackUrl are discovered at runtime.
Never hard-code a compute hostname into the library.

Some VPNs break system DNS for the inference host while DoH still resolves it.
This client: short timeouts, DNS preflight, then Cloudflare/Google DoH fallback,
and pins the resolved IP for HTTPS (SNI/Host preserved via getaddrinfo override).

Credentials: environment only (BHASHINI_UDYAT_KEY, BHASHINI_USER_ID,
optional BHASHINI_INFERENCE_API_KEY). No personal machine paths.
"""
from __future__ import annotations

import os
import socket
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Iterator
from urllib.parse import urlparse

import requests

CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
DEFAULT_PIPELINE_ID = "64392f96daac500b55c543cd"
# Fail fast: long urllib3 retries on broken DNS look like a hung job.
DEFAULT_CONNECT_TIMEOUT = 5
DEFAULT_READ_TIMEOUT = 25
DOH_ENDPOINTS = (
    "https://1.1.1.1/dns-query",
    "https://cloudflare-dns.com/dns-query",
    "https://dns.google/resolve",
)


@dataclass
class BhashiniPipeline:
    callback_url: str
    auth_header_name: str
    auth_value: str
    service_id: str
    source_language: str = "gu"
    target_language: str = "en"
    resolved_ip: str | None = None
    resolve_source: str = ""


@dataclass
class TranslateResult:
    text: str | None
    latency_sec: float
    error: str | None
    ok: bool


def _timeout(connect: float | None = None, read: float | None = None) -> tuple[float, float]:
    return (
        connect if connect is not None else DEFAULT_CONNECT_TIMEOUT,
        read if read is not None else DEFAULT_READ_TIMEOUT,
    )


def load_keys_from_environ() -> dict[str, str]:
    return {
        "user_id": os.environ.get("BHASHINI_USER_ID", "").strip(),
        "udyat": os.environ.get("BHASHINI_UDYAT_KEY", "").strip(),
        "inference": os.environ.get("BHASHINI_INFERENCE_API_KEY", "").strip(),
    }


def resolve_hostname_system(hostname: str, timeout_sec: float = 3.0) -> tuple[bool, str]:
    if not hostname:
        return False, "empty hostname"
    try:
        socket.setdefaulttimeout(timeout_sec)
        infos = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
        if not infos:
            return False, f"no addresses for {hostname}"
        return True, infos[0][4][0]
    except OSError as e:
        return False, f"DNS failed for {hostname}: {e}"
    finally:
        socket.setdefaulttimeout(None)


def resolve_hostname_doh(hostname: str, timeout_sec: float = 8.0) -> tuple[bool, str]:
    """Resolve A record via DNS-over-HTTPS when system DNS is broken (common under VPN)."""
    last = "DoH failed"
    for endpoint in DOH_ENDPOINTS:
        try:
            r = requests.get(
                endpoint,
                params={"name": hostname, "type": "A"},
                headers={"accept": "application/dns-json"},
                timeout=(3, timeout_sec),
            )
            if r.status_code >= 400:
                last = f"DoH HTTP {r.status_code} from {endpoint}"
                continue
            data = r.json()
            for ans in data.get("Answer") or []:
                if ans.get("type") == 1 and ans.get("data"):
                    return True, str(ans["data"]).strip()
            last = f"DoH no A record from {endpoint}: {str(data)[:160]}"
        except (requests.RequestException, ValueError, KeyError) as e:
            last = f"DoH error {endpoint}: {e}"
    return False, last


def resolve_hostname(hostname: str, timeout_sec: float = 3.0) -> tuple[bool, str, str]:
    """
    Returns (ok, ip_or_error, source) where source is system|doh|env|error.
    Optional override: BHASHINI_COMPUTE_IP=<ipv4>
    """
    override = os.environ.get("BHASHINI_COMPUTE_IP", "").strip()
    if override:
        return True, override, "env"
    ok, detail = resolve_hostname_system(hostname, timeout_sec=timeout_sec)
    if ok:
        return True, detail, "system"
    ok2, detail2 = resolve_hostname_doh(hostname)
    if ok2:
        return True, detail2, "doh"
    return False, f"{detail}; {detail2}", "error"


@contextmanager
def pinned_hostname(hostname: str, ip: str) -> Iterator[None]:
    """Force socket lookups for hostname to ip so requests keep SNI/Host intact."""
    original = socket.getaddrinfo

    def _patched(host, port, family=0, type=0, proto=0, flags=0):  # noqa: A002
        if host == hostname:
            return original(ip, port, family, type, proto, flags)
        return original(host, port, family, type, proto, flags)

    socket.getaddrinfo = _patched  # type: ignore[assignment]
    try:
        yield
    finally:
        socket.getaddrinfo = original  # type: ignore[assignment]


def preflight_callback(callback_url: str, dns_timeout_sec: float = 3.0) -> tuple[bool, str, str | None, str]:
    host = urlparse(callback_url).hostname or ""
    ok, detail, source = resolve_hostname(host, timeout_sec=dns_timeout_sec)
    if ok:
        return True, f"{host} -> {detail} ({source})", detail, source
    return False, detail, None, source


def get_translation_pipeline(
    source_language: str = "gu",
    target_language: str = "en",
    pipeline_id: str = DEFAULT_PIPELINE_ID,
    connect_timeout: float | None = None,
    read_timeout: float | None = None,
) -> tuple[BhashiniPipeline | None, str]:
    """
    Call ULCA getModelsPipeline. Returns (pipeline, error_message).
    Does not fall back to a hard-coded compute URL hostname.
    """
    keys = load_keys_from_environ()
    if not keys["udyat"]:
        return None, "missing BHASHINI_UDYAT_KEY"

    headers: dict[str, str] = {
        "ulcaApiKey": keys["udyat"],
        "Content-Type": "application/json",
    }
    if keys["user_id"]:
        headers["userID"] = keys["user_id"]

    payloads = [
        {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_language,
                            "targetLanguage": target_language,
                        }
                    },
                }
            ],
            "pipelineRequestConfig": {"pipelineId": pipeline_id},
        },
        {
            "pipelineTasks": [{"taskType": "translation"}],
            "pipelineRequestConfig": {"pipelineId": pipeline_id},
        },
    ]

    last_err = "config failed"
    timeout = _timeout(connect_timeout, read_timeout)
    for payload in payloads:
        try:
            r = requests.post(CONFIG_URL, headers=headers, json=payload, timeout=timeout)
        except requests.RequestException as e:
            last_err = f"config request error: {e}"
            continue
        if r.status_code >= 400:
            last_err = f"config HTTP {r.status_code}: {r.text[:240]}"
            continue
        try:
            cfg: dict[str, Any] = r.json()
            ep = cfg["pipelineInferenceAPIEndPoint"]
            callback = ep["callbackUrl"]
            auth_name = ep["inferenceApiKey"]["name"]
            auth_val = ep["inferenceApiKey"]["value"]
            service_id = ""
            for block in cfg.get("pipelineResponseConfig", []) or []:
                if block.get("taskType") != "translation":
                    continue
                for c in block.get("config") or []:
                    langs = c.get("language") or {}
                    if (
                        langs.get("sourceLanguage") == source_language
                        and langs.get("targetLanguage") == target_language
                    ):
                        service_id = c.get("serviceId") or service_id
                        break
                    if not service_id:
                        service_id = c.get("serviceId") or ""
                break
            ok, detail, ip, source = preflight_callback(callback)
            if not ok:
                return None, (
                    f"config OK but compute host unreachable ({detail}). "
                    "Set BHASHINI_COMPUTE_IP if DoH also fails, or use another MT."
                )
            pipe = BhashiniPipeline(
                callback_url=callback,
                auth_header_name=auth_name,
                auth_value=auth_val,
                service_id=service_id,
                source_language=source_language,
                target_language=target_language,
                resolved_ip=ip,
                resolve_source=source,
            )
            return pipe, ""
        except (KeyError, TypeError, ValueError) as e:
            last_err = f"config parse error: {e}"
            continue
    return None, last_err


def translate(
    text: str,
    pipeline: BhashiniPipeline,
    connect_timeout: float | None = None,
    read_timeout: float | None = None,
) -> TranslateResult:
    import time

    compute = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": pipeline.source_language,
                        "targetLanguage": pipeline.target_language,
                    },
                    **({"serviceId": pipeline.service_id} if pipeline.service_id else {}),
                },
            }
        ],
        "inputData": {"input": [{"source": text}]},
    }
    host = urlparse(pipeline.callback_url).hostname or ""
    t0 = time.time()
    try:
        def _post() -> requests.Response:
            return requests.post(
                pipeline.callback_url,
                headers={
                    pipeline.auth_header_name: pipeline.auth_value,
                    "Content-Type": "application/json",
                },
                json=compute,
                timeout=_timeout(connect_timeout, read_timeout),
            )

        if pipeline.resolved_ip and host:
            with pinned_hostname(host, pipeline.resolved_ip):
                rr = _post()
        else:
            rr = _post()
        elapsed = round(time.time() - t0, 2)
        if rr.status_code >= 400:
            return TranslateResult(None, elapsed, f"HTTP {rr.status_code}: {rr.text[:200]}", False)
        data = rr.json()
        for pr in data.get("pipelineResponse", []) or []:
            for item in pr.get("output", []) or []:
                tgt = item.get("target")
                if tgt:
                    return TranslateResult(tgt, elapsed, None, True)
        return TranslateResult(None, elapsed, f"no target in response: {str(data)[:200]}", False)
    except requests.RequestException as e:
        return TranslateResult(None, round(time.time() - t0, 2), str(e), False)


if __name__ == "__main__":
    pipe, err = get_translation_pipeline()
    if err:
        print("PIPELINE_FAIL", err)
        raise SystemExit(1)
    print(
        "PIPELINE_OK",
        pipe.callback_url,
        pipe.service_id,
        pipe.resolved_ip,
        pipe.resolve_source,
    )
    sample = "તમે કેમ છો?"
    res = translate(sample, pipe)
    print("TRANSLATE", res)
