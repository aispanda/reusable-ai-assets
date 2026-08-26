"""Security contract for the reusable MCP gateway scaffold."""

import ast
from pathlib import Path


SOURCE_PATH = Path(__file__).parents[1] / "mcp" / "gateway.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)


def _registered_tools() -> set[str]:
    registered = set()
    for node in TREE.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for decorator in node.decorator_list:
            if (
                isinstance(decorator, ast.Call)
                and isinstance(decorator.func, ast.Attribute)
                and decorator.func.attr == "tool"
            ):
                registered.add(node.name)
    return registered


def test_only_non_sensitive_status_tool_is_registered():
    assert _registered_tools() == {"gateway_status"}


def test_secret_and_file_transfer_sdks_are_not_imported():
    assert "secretmanager" not in SOURCE
    assert "google.cloud.storage" not in SOURCE
    assert "access_secret_version" not in SOURCE
    assert "upload_from_filename" not in SOURCE
    assert "download_to_filename" not in SOURCE


def test_public_bind_and_arbitrary_path_parameters_are_absent():
    assert 'host="0.0.0.0"' not in SOURCE
    assert "local_file_path" not in SOURCE
    assert "local_dir" not in SOURCE
    assert "bucket_name" not in SOURCE
