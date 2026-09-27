#!/usr/bin/env python3
"""Fetch one Linear issue through the governed TrueFoundry MCP connection."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ISSUE_RE = re.compile(r"(?:^|/)(AI-\d+)(?:-|$)", re.IGNORECASE)
DEFAULT_MCP_URL = "https://gateway.truefoundry.ai/aispanda/mcp/linear/server"
MCP_VERSION = "2025-11-25"


class FetchError(RuntimeError):
    pass


def issue_key(issue: str | None, branch: str | None) -> str:
    if issue:
        return issue.upper()
    match = ISSUE_RE.search(branch or "")
    if not match:
        raise FetchError("An issue key or issue-linked branch is required.")
    return match.group(1).upper()


def normalize(raw: dict, expected: str) -> dict:
    if isinstance(raw.get("result"), dict):
        raw = raw["result"]
    identifier = str(raw.get("identifier") or raw.get("id") or "").upper()
    if identifier != expected:
        raise FetchError(f"TrueFoundry returned {identifier or 'UNKNOWN'}, expected {expected}.")
    state = raw.get("state")
    status = state.get("name") if isinstance(state, dict) else raw.get("status")
    branch = raw.get("branchName") or raw.get("gitBranchName") or raw.get("branch_name")
    description = raw.get("description")
    if not status or not branch or not description:
        raise FetchError("TrueFoundry issue evidence is incomplete.")
    return {
        "identifier": identifier,
        "status": str(status),
        "branchName": str(branch),
        "description": str(description),
        "url": str(raw.get("url") or ""),
        "stateHistory": raw.get("stateHistory") or raw.get("state_history") or [],
    }


def decode_response(body: bytes, content_type: str, request_id: int | None) -> dict:
    if not body:
        return {}
    text = body.decode("utf-8")
    messages: list[dict] = []
    if "text/event-stream" in content_type:
        data_lines: list[str] = []
        for line in (*text.splitlines(), ""):
            if line.startswith("data:"):
                data_lines.append(line[5:].lstrip())
            elif not line and data_lines:
                try:
                    message = json.loads("\n".join(data_lines))
                except json.JSONDecodeError:
                    message = None
                if isinstance(message, dict):
                    messages.append(message)
                data_lines = []
    else:
        message = json.loads(text)
        if isinstance(message, dict):
            messages.append(message)
    for message in reversed(messages):
        if request_id is None or message.get("id") == request_id:
            return message
    raise FetchError("TrueFoundry MCP returned no matching response.")


class McpClient:
    def __init__(self, url: str, token: str) -> None:
        self.url = url
        self.token = token
        self.session_id = ""

    def post(self, method: str, params: dict, request_id: int | None) -> dict:
        payload: dict[str, Any] = {"jsonrpc": "2.0", "method": method, "params": params}
        if request_id is not None:
            payload["id"] = request_id
        headers = {
            "Accept": "application/json, text/event-stream",
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "MCP-Protocol-Version": MCP_VERSION,
            "Mcp-Method": method,
        }
        if self.session_id:
            headers["Mcp-Session-Id"] = self.session_id
        if method == "tools/call":
            headers["Mcp-Name"] = str(params.get("name") or "")
        request = urllib.request.Request(
            self.url,
            data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                self.session_id = response.headers.get("Mcp-Session-Id", self.session_id)
                result = decode_response(
                    response.read(), response.headers.get("Content-Type", ""), request_id
                )
        except urllib.error.HTTPError as exc:
            raise FetchError(f"TrueFoundry MCP request failed with HTTP {exc.code}.") from None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            raise FetchError("TrueFoundry MCP request failed without usable evidence.") from None
        if result.get("error"):
            raise FetchError("TrueFoundry MCP rejected the request.")
        return result

    def initialize(self) -> None:
        self.post(
            "initialize",
            {
                "protocolVersion": MCP_VERSION,
                "capabilities": {},
                "clientInfo": {"name": "ai-spanda-governance", "version": "1.0"},
            },
            1,
        )
        self.post("notifications/initialized", {}, None)

    def list_tools(self) -> list[dict]:
        response = self.post("tools/list", {}, 2)
        tools = response.get("result", {}).get("tools")
        if not isinstance(tools, list):
            raise FetchError("TrueFoundry MCP returned no tool catalog.")
        return tools

    def call_tool(self, name: str, arguments: dict) -> dict:
        response = self.post("tools/call", {"name": name, "arguments": arguments}, 3)
        result = response.get("result")
        if not isinstance(result, dict) or result.get("isError") or result.get("is_error"):
            raise FetchError("TrueFoundry Linear tool call failed.")
        return result


def result_mapping(result: dict) -> dict:
    for key in ("structuredContent", "structured_content", "data"):
        candidate = result.get(key)
        if isinstance(candidate, dict):
            return candidate
    for block in result.get("content") or []:
        if not isinstance(block, dict) or not isinstance(block.get("text"), str):
            continue
        try:
            candidate = json.loads(block["text"])
        except json.JSONDecodeError:
            continue
        if isinstance(candidate, dict):
            return candidate
    raise FetchError("TrueFoundry returned no structured Linear issue evidence.")


def fetch(expected: str, url: str, token: str) -> dict:
    client = McpClient(url, token)
    client.initialize()
    tools = client.list_tools()
    matches = [tool for tool in tools if str(tool.get("name") or "").casefold() == "get_issue"]
    if not matches:
        matches = [
            tool for tool in tools
            if str(tool.get("name") or "").casefold().endswith("_get_issue")
        ]
    if len(matches) != 1:
        raise FetchError("TrueFoundry Linear MCP must expose exactly one get_issue tool.")
    tool = matches[0]
    properties = (tool.get("inputSchema") or {}).get("properties", {})
    arguments: dict[str, Any] = {"id": expected}
    if "includeRelations" in properties:
        arguments["includeRelations"] = True
    return normalize(result_mapping(client.call_tool(str(tool["name"]), arguments)), expected)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--issue")
    parser.add_argument("--branch")
    parser.add_argument("--output", required=True)
    parser.add_argument("--input-json")
    parser.add_argument("--mcp-url", default=os.environ.get("LINEAR_MCP_URL", DEFAULT_MCP_URL))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        expected = issue_key(args.issue, args.branch)
        if args.input_json:
            if os.environ.get("GOVERNANCE_TEST_MODE") != "1":
                raise FetchError("Input fixtures are allowed only in deterministic test mode.")
            issue = normalize(json.loads(Path(args.input_json).read_text(encoding="utf-8")), expected)
        else:
            token = os.environ.get("TFY_API_KEY", "").strip()
            if not token:
                raise FetchError("Protected TrueFoundry Virtual Account token is unavailable.")
            issue = fetch(expected, args.mcp_url, token)
        Path(args.output).write_text(json.dumps(issue, sort_keys=True), encoding="utf-8")
    except (FetchError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 1
    print(f"PASS TrueFoundry Linear {expected}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
