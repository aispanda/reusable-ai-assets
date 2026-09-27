import pytest
from mcp.gcs_sync import GCSSyncManager

def test_sync_manager_init():
    """Test GCS Sync Manager initialization."""
    manager = GCSSyncManager("test-bucket")
    assert manager.bucket_name == "test-bucket"
    assert manager.client is not None

def test_compute_file_hash():
    """Test file hash computation."""
    manager = GCSSyncManager("test-bucket")
    pass
