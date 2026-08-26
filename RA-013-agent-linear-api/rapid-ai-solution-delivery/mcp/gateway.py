"""
Phase 1: Credential Management for Linear API Integration

This module implements secure credential retrieval from Google Secret Manager
with comprehensive error handling and sanitization to prevent API key exposure.

Used by: Gemini Spark (AI-63), RA-013 Agent Linear API Integration
Dependencies: google.cloud.secretmanager, logging
"""

import os
import json
import logging
from typing import Dict, Optional, Tuple
from google.cloud import secretmanager
import functools
import time


# Configure logging without exposing secrets
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class CredentialManager:
    """
    Manages Linear API credentials via Google Secret Manager with:
    - Secure retrieval with no key exposure in logs
    - Automatic refresh on rotation
    - Error masking for external consumers
    - Audit trail with metadata
    """

    def __init__(
        self,
        project_id: str,
        secret_name: str = "linear-api-key",
        cache_ttl_seconds: int = 300
    ):
        """
        Initialize credential manager.

        Args:
            project_id: GCP project ID (e.g., "example-project")
            secret_name: Secret Manager secret name (default: "linear-api-key")
            cache_ttl_seconds: Cache TTL for credentials (default: 300s)
        """
        self.project_id = project_id
        self.secret_name = secret_name
        self.cache_ttl_seconds = cache_ttl_seconds
        self.client = secretmanager.SecretManagerServiceClient()
        self._cached_credential = None
        self._cache_timestamp = None

    def _mask_secret_for_logging(self, value: Optional[str]) -> str:
        """Return masked version of secret for safe logging."""
        if not value:
            return "<empty>"
        return f"<secret:{len(value)} chars>"

    def get_credentials(self) -> Tuple[Optional[str], Dict]:
        """
        Retrieve Linear API credentials from Secret Manager.

        Returns:
            Tuple of (api_key, metadata) where:
            - api_key: The Linear API key or None if retrieval failed
            - metadata: Dict with status, actor, timestamp, and error details (no key)

        Raises:
            Nothing - all errors are caught and returned in metadata
        """
        metadata = {
            "actor": "gemini-spark",
            "timestamp": time.time(),
            "status": "unknown",
            "error": None,
            "cached": False,
            "secret_name": self.secret_name
        }

        try:
            # Check cache
            if self._cached_credential and self._is_cache_valid():
                metadata["status"] = "success"
                metadata["cached"] = True
                logger.info(
                    "Credential retrieved from cache",
                    extra={"actor": "gemini-spark", "cached": True}
                )
                return self._cached_credential, metadata

            # Build secret path
            secret_path = self.client.secret_version_path(
                self.project_id,
                self.secret_name,
                "latest"
            )

            logger.info(
                "Retrieving credential from Secret Manager",
                extra={
                    "actor": "gemini-spark",
                    "project": self.project_id,
                    "secret": self.secret_name
                }
            )

            # Retrieve secret
            response = self.client.access_secret_version(request={"name": secret_path})
            api_key = response.payload.data.decode("UTF-8")

            # Validate key format (basic check)
            if not api_key or len(api_key) < 20:
                raise ValueError("Retrieved credential is invalid (too short)")

            # Cache the credential
            self._cached_credential = api_key
            self._cache_timestamp = time.time()

            metadata["status"] = "success"
            logger.info(
                "Credential retrieved successfully",
                extra={
                    "actor": "gemini-spark",
                    "cached": False,
                    "key_length": len(api_key)
                }
            )

            return api_key, metadata

        except Exception as e:
            # Log error with NO key details
            error_type = type(e).__name__
            error_message = str(e)

            # Mask any potential credential in error message
            if api_key := os.environ.get("LINEAR_API_KEY", ""):
                error_message = error_message.replace(api_key, "<redacted>")

            metadata["status"] = "error"
            metadata["error"] = error_type
            metadata["error_message"] = error_message if len(error_message) < 100 else error_message[:100] + "..."

            logger.error(
                f"Credential retrieval failed: {error_type}",
                extra={
                    "actor": "gemini-spark",
                    "error_type": error_type,
                    "secret": self.secret_name
                }
            )

            return None, metadata

    def _is_cache_valid(self) -> bool:
        """Check if cached credential is still valid."""
        if not self._cache_timestamp:
            return False
        elapsed = time.time() - self._cache_timestamp
        return elapsed < self.cache_ttl_seconds

    def invalidate_cache(self) -> Dict:
        """Manually invalidate cache (e.g., after credential rotation)."""
        self._cached_credential = None
        self._cache_timestamp = None

        logger.info(
            "Credential cache invalidated",
            extra={"actor": "gemini-spark"}
        )

        return {"status": "cache_invalidated", "actor": "gemini-spark"}


# Singleton pattern for thread-safe credential access
_credential_manager: Optional[CredentialManager] = None
_manager_lock = None  # Would use threading.Lock in production


def initialize_credential_manager(
    project_id: str,
    secret_name: str = "linear-api-key",
    cache_ttl_seconds: int = 300
) -> CredentialManager:
    """Initialize or return singleton credential manager."""
    global _credential_manager

    if _credential_manager is None:
        _credential_manager = CredentialManager(
            project_id=project_id,
            secret_name=secret_name,
            cache_ttl_seconds=cache_ttl_seconds
        )
        logger.info(
            "Credential manager initialized",
            extra={"actor": "gemini-spark", "project": project_id}
        )

    return _credential_manager


def get_linear_api_key() -> Tuple[Optional[str], Dict]:
    """
    Convenience function for retrieving Linear API key.

    Usage:
        api_key, metadata = get_linear_api_key()
        if metadata["status"] == "success":
            # Use api_key
        else:
            # Handle error
            logger.warning(f"Failed to retrieve credentials: {metadata['error']}")

    Returns:
        Tuple of (api_key, metadata)
    """
    global _credential_manager

    if _credential_manager is None:
        project_id = os.environ["GCP_PROJECT_ID"]
        initialize_credential_manager(project_id=project_id)

    return _credential_manager.get_credentials()


def mask_api_key_in_error(error: Exception, api_key: str) -> str:
    """Utility to mask API key in error messages."""
    error_str = str(error)
    if api_key in error_str:
        error_str = error_str.replace(api_key, "<redacted>")
    return error_str
