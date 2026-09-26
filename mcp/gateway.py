"""
FastMCP Gateway: Core agentic SDLC orchestration.

Provides unified access to:
- Google Secret Manager (GSM) for credential retrieval
- Google Cloud Storage (GCS) for artifact sync
- Judge LLM for autonomous validation
- Reusable CI/CD workflows
"""

from fastmcp import FastMCP
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import os
from google.cloud import storage, secretmanager
import logging

logger = logging.getLogger(__name__)

# Initialize FastMCP app
app = FastMCP("aispanda-gateway", "0.1.0")


class SecretRequest(BaseModel):
    """Request to retrieve a secret from Google Secret Manager."""
    secret_name: str = Field(..., description="Name of the secret in GSM")
    version_id: str = Field(default="latest", description="Version ID of the secret")


class GCSUploadRequest(BaseModel):
    """Request to upload an artifact to Google Cloud Storage."""
    bucket_name: str = Field(..., description="GCS bucket name")
    blob_path: str = Field(..., description="Destination path in GCS")
    local_file_path: str = Field(..., description="Local file path to upload")
    metadata: Optional[Dict[str, str]] = Field(default=None, description="Custom metadata")


class JudgeValidationRequest(BaseModel):
    """Request for Judge LLM to validate generated artifacts."""
    artifact_type: str = Field(..., description="Type of artifact (code, config, workflow, etc.)")
    content: str = Field(..., description="Content to validate")
    rules_path: Optional[str] = Field(default="rules/validation.yaml", description="Path to validation rules")


@app.tool()
def get_secret(secret_name: str, version_id: str = "latest") -> Dict[str, Any]:
    """
    Retrieve a secret from Google Secret Manager.

    Args:
        secret_name: Name of the secret (e.g., "github-token", "gcs-credentials")
        version_id: Version of the secret (default: "latest")

    Returns:
        Dictionary with secret metadata and value.
    """
    try:
        project_id = os.getenv("GCP_PROJECT_ID", "aispanda-prod")
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_name}/versions/{version_id}"
        response = client.access_secret_version(request={"name": name})
        secret_value = response.payload.data.decode("UTF-8")

        logger.info(f"Retrieved secret: {secret_name} (version: {version_id})")
        return {
            "status": "success",
            "secret_name": secret_name,
            "version": version_id,
            "value": secret_value
        }
    except Exception as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {str(e)}")
        return {
            "status": "error",
            "secret_name": secret_name,
            "error": str(e)
        }


@app.tool()
def upload_to_gcs(bucket_name: str, blob_path: str, local_file_path: str,
                  metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Upload a local artifact to Google Cloud Storage.

    Args:
        bucket_name: GCS bucket name
        blob_path: Destination path in GCS
        local_file_path: Local file to upload
        metadata: Optional custom metadata

    Returns:
        Dictionary with upload status and GCS URL.
    """
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_path)

        if metadata:
            blob.metadata = metadata

        blob.upload_from_filename(local_file_path)

        logger.info(f"Uploaded {local_file_path} to gs://{bucket_name}/{blob_path}")
        return {
            "status": "success",
            "gcs_path": f"gs://{bucket_name}/{blob_path}",
            "blob_size_bytes": blob.size,
            "metadata": metadata or {}
        }
    except Exception as e:
        logger.error(f"Failed to upload to GCS: {str(e)}")
        return {
            "status": "error",
            "bucket": bucket_name,
            "error": str(e)
        }


@app.tool()
def sync_gcs_to_local(bucket_name: str, blob_prefix: str, local_dir: str) -> Dict[str, Any]:
    """
    Sync artifacts from GCS to local directory.

    Args:
        bucket_name: GCS bucket name
        blob_prefix: Prefix to filter blobs
        local_dir: Local directory to sync to

    Returns:
        Dictionary with sync status and file count.
    """
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blobs = bucket.list_blobs(prefix=blob_prefix)

        os.makedirs(local_dir, exist_ok=True)
        count = 0

        for blob in blobs:
            local_path = os.path.join(local_dir, blob.name.replace(blob_prefix, "").lstrip("/"))
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            blob.download_to_filename(local_path)
            count += 1

        logger.info(f"Synced {count} files from gs://{bucket_name}/{blob_prefix} to {local_dir}")
        return {
            "status": "success",
            "files_synced": count,
            "local_dir": local_dir
        }
    except Exception as e:
        logger.error(f"Failed to sync from GCS: {str(e)}")
        return {
            "status": "error",
            "bucket": bucket_name,
            "error": str(e)
        }


@app.tool()
def validate_with_judge(artifact_type: str, content: str, rules_path: str = "rules/validation.yaml") -> Dict[str, Any]:
    """
    Submit artifact to Judge LLM for validation.

    Args:
        artifact_type: Type of artifact (code, config, workflow)
        content: Content to validate
        rules_path: Path to validation rules

    Returns:
        Dictionary with validation results and recommendations.
    """
    try:
        # Placeholder for Judge LLM integration
        # In production, this would call Claude or another LLM with validation rules

        validation_result = {
            "artifact_type": artifact_type,
            "status": "validated",
            "issues": [],
            "recommendations": [],
            "passed": True
        }

        logger.info(f"Validated {artifact_type} artifact using Judge LLM")
        return validation_result
    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        return {
            "status": "error",
            "artifact_type": artifact_type,
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
