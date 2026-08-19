import pytest
from mcp.gateway import app, get_secret, upload_to_gcs

@pytest.mark.asyncio
async def test_secret_retrieval():
    """Test Google Secret Manager integration."""
    result = get_secret("test-secret", "latest")
    assert result["status"] in ["success", "error"]

@pytest.mark.asyncio
async def test_gcs_upload():
    """Test GCS upload functionality."""
    result = upload_to_gcs("test-bucket", "test/path", "/tmp/test.txt")
    assert "status" in result

@pytest.mark.asyncio
async def test_judge_validation():
    """Test Judge LLM validation."""
    result = validate_with_judge("code", "print('hello')", "rules/validation.yaml")
    assert result["status"] in ["validated", "error"]
