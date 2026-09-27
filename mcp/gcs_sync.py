"""
GCS Sync Module: Automated artifact synchronization with Google Cloud Storage.

Provides:
- Bidirectional sync between local and GCS
- Incremental backup of reusable assets
- Artifact versioning and metadata tracking
"""

import os
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from google.cloud import storage
import logging

logger = logging.getLogger(__name__)


class GCSSyncManager:
    """Manages bidirectional sync between local filesystem and GCS."""

    def __init__(self, bucket_name: str, project_id: Optional[str] = None):
        """
        Initialize GCS Sync Manager.

        Args:
            bucket_name: Name of the GCS bucket
            project_id: GCP project ID (defaults to env var or default credentials)
        """
        self.bucket_name = bucket_name
        self.client = storage.Client(project=project_id)
        self.bucket = self.client.bucket(bucket_name)

    def _compute_file_hash(self, file_path: str) -> str:
        """Compute SHA256 hash of a file."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def upload_artifact(self, local_path: str, remote_path: str,
                       metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Upload a single artifact to GCS with metadata.

        Args:
            local_path: Path to local file
            remote_path: Destination path in GCS
            metadata: Custom metadata

        Returns:
            Upload result dictionary
        """
        try:
            blob = self.bucket.blob(remote_path)

            # Compute file hash for integrity verification
            file_hash = self._compute_file_hash(local_path)

            # Set metadata
            blob.metadata = metadata or {}
            blob.metadata.update({
                "uploaded_at": datetime.utcnow().isoformat(),
                "file_hash": file_hash,
                "local_size_bytes": os.path.getsize(local_path)
            })

            blob.upload_from_filename(local_path)

            logger.info(f"Uploaded {local_path} to gs://{self.bucket_name}/{remote_path}")
            return {
                "status": "success",
                "local_path": local_path,
                "remote_path": remote_path,
                "gcs_url": f"gs://{self.bucket_name}/{remote_path}",
                "file_hash": file_hash,
                "size_bytes": blob.size
            }
        except Exception as e:
            logger.error(f"Upload failed: {str(e)}")
            return {
                "status": "error",
                "local_path": local_path,
                "remote_path": remote_path,
                "error": str(e)
            }

    def download_artifact(self, remote_path: str, local_path: str) -> Dict[str, Any]:
        """
        Download an artifact from GCS.

        Args:
            remote_path: Path in GCS
            local_path: Destination local path

        Returns:
            Download result dictionary
        """
        try:
            blob = self.bucket.blob(remote_path)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            blob.download_to_filename(local_path)

            logger.info(f"Downloaded gs://{self.bucket_name}/{remote_path} to {local_path}")
            return {
                "status": "success",
                "remote_path": remote_path,
                "local_path": local_path,
                "size_bytes": blob.size,
                "metadata": dict(blob.metadata or {})
            }
        except Exception as e:
            logger.error(f"Download failed: {str(e)}")
            return {
                "status": "error",
                "remote_path": remote_path,
                "local_path": local_path,
                "error": str(e)
            }

    def sync_directory(self, local_dir: str, remote_prefix: str,
                       direction: str = "up") -> Dict[str, Any]:
        """
        Sync entire directory to/from GCS.

        Args:
            local_dir: Local directory path
            remote_prefix: Remote prefix in GCS
            direction: "up" (upload) or "down" (download)

        Returns:
            Sync result with file counts
        """
        results = {
            "status": "success",
            "direction": direction,
            "files_processed": 0,
            "files_skipped": 0,
            "errors": []
        }

        try:
            if direction == "up":
                # Upload from local to GCS
                for root, dirs, files in os.walk(local_dir):
                    for file in files:
                        local_path = os.path.join(root, file)
                        relative_path = os.path.relpath(local_path, local_dir)
                        remote_path = f"{remote_prefix}/{relative_path}".replace("\\", "/")

                        result = self.upload_artifact(local_path, remote_path)
                        if result["status"] == "success":
                            results["files_processed"] += 1
                        else:
                            results["errors"].append(result["error"])

            elif direction == "down":
                # Download from GCS to local
                os.makedirs(local_dir, exist_ok=True)
                blobs = self.bucket.list_blobs(prefix=remote_prefix)

                for blob in blobs:
                    relative_path = blob.name.replace(remote_prefix, "").lstrip("/")
                    local_path = os.path.join(local_dir, relative_path)

                    result = self.download_artifact(blob.name, local_path)
                    if result["status"] == "success":
                        results["files_processed"] += 1
                    else:
                        results["errors"].append(result["error"])

            logger.info(f"Sync complete: {results['files_processed']} files processed")
            return results

        except Exception as e:
            logger.error(f"Sync failed: {str(e)}")
            return {
                "status": "error",
                "direction": direction,
                "error": str(e)
            }

    def list_artifacts(self, prefix: str = "") -> List[Dict[str, Any]]:
        """List all artifacts in GCS with given prefix."""
        artifacts = []
        try:
            blobs = self.bucket.list_blobs(prefix=prefix)
            for blob in blobs:
                artifacts.append({
                    "name": blob.name,
                    "size_bytes": blob.size,
                    "created": blob.time_created.isoformat() if blob.time_created else None,
                    "updated": blob.updated.isoformat() if blob.updated else None,
                    "metadata": dict(blob.metadata or {})
                })
            return artifacts
        except Exception as e:
            logger.error(f"Failed to list artifacts: {str(e)}")
            return []
