"""Bounded MCP gateway placeholder for the AI-62 credential foundation.

The original scaffold exposed raw secrets and arbitrary file-transfer tools.
Those operations are intentionally unavailable here. A consumer may add a
domain action only after a trusted identity boundary maps the caller to an
allowlisted principal and the action consumes credentials entirely in-process.
"""

from __future__ import annotations

import os
from typing import Any

from fastmcp import FastMCP


app = FastMCP("bounded-agent-gateway", "0.2.0")
_LOOPBACK_HOSTS = frozenset({"127.0.0.1", "::1", "localhost"})


def validated_bind_host(candidate: str | None) -> str:
    """Return a loopback bind host or fail closed."""
    host = (candidate or "127.0.0.1").strip().lower()
    if host not in _LOOPBACK_HOSTS:
        raise ValueError("The reusable gateway may bind only to a loopback interface.")
    return host


@app.tool()
def gateway_status() -> dict[str, Any]:
    """Describe the deliberately locked reusable gateway surface."""
    return {
        "status": "locked",
        "capabilities": [],
        "credential_values_exposed": False,
        "file_transfer_enabled": False,
        "next_step": (
            "Implement an authenticated, domain-specific action in the consuming "
            "service; never expose credential retrieval or arbitrary file access."
        ),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=validated_bind_host(os.environ.get("MCP_BIND_HOST")), port=8000)
