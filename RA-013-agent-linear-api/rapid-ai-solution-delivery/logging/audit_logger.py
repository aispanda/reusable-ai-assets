"""
Phase 2: Audit & Logging for Linear API Integration

This module implements comprehensive audit logging to GCP Logging with:
- Searchable metadata for all Linear API calls
- Actor identification (gemini-spark)
- Action tracking (create_issue, update_issue, post_comment)
- Structured logging for audit trail queries
- 90-day retention policy compliance

Used by: Gemini Spark (AI-63), RA-013 Agent Linear API Integration
Dependencies: google.cloud.logging, json, logging
"""

import json
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime
from google.cloud import logging as cloud_logging
from functools import wraps


class AuditLogger:
    """
    Centralized audit logging for Linear API operations.

    All Spark activities logged with:
    - Timestamp (ISO-8601)
    - Actor ("gemini-spark")
    - Action (create_issue, update_issue, post_comment)
    - Resource ID (issue_id)
    - Status (success/error)
    - Metadata (duration, result)
    """

    def __init__(self, project_id: str, log_name: str = "gemini-spark-linear-api"):
        """
        Initialize audit logger.

        Args:
            project_id: GCP project ID (e.g., "example-project")
            log_name: GCP Cloud Logging log name (default: "gemini-spark-linear-api")
        """
        self.project_id = project_id
        self.log_name = log_name
        self.client = cloud_logging.Client(project=project_id)
        self.logger = self.client.logger(log_name)

    def log_action(
        self,
        action: str,
        resource_id: Optional[str] = None,
        status: str = "started",
        duration_ms: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Log a Linear API action with structured metadata.

        Args:
            action: Action type (create_issue, update_issue, post_comment, etc.)
            resource_id: Linear issue ID (e.g., "AI-63")
            status: Action status (started, success, error, failed)
            duration_ms: Action duration in milliseconds
            metadata: Additional structured metadata (no credentials)
            error: Error message if action failed

        Returns:
            Dict with log entry details
        """
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Build audit entry
        log_entry = {
            "timestamp": timestamp,
            "actor": "gemini-spark",
            "action": action,
            "resource_type": "linear_issue",
            "resource_id": resource_id,
            "status": status,
            "duration_ms": duration_ms,
            "error": error
        }

        # Add custom metadata
        if metadata:
            log_entry["metadata"] = metadata

        # Send to GCP Cloud Logging
        try:
            self.logger.log_struct(
                log_entry,
                severity="INFO" if status == "success" else "WARNING" if status == "error" else "DEBUG"
            )
        except Exception as e:
            # Fallback to stderr if Cloud Logging fails
            logging.error(f"Failed to write to Cloud Logging: {str(e)}")

        return log_entry

    def log_credential_access(
        self,
        status: str = "success",
        cached: bool = False,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Log credential retrieval attempt.

        Args:
            status: Retrieval status (success, error)
            cached: Whether credential came from cache
            error: Error message if retrieval failed

        Returns:
            Dict with log entry details
        """
        return self.log_action(
            action="get_credentials",
            status=status,
            metadata={
                "source": "cache" if cached else "secret_manager",
                "secret_name": "linear-api-key"
            },
            error=error
        )

    def log_issue_created(
        self,
        issue_id: str,
        title: str,
        commit_hash: Optional[str] = None,
        duration_ms: Optional[float] = None
    ) -> Dict[str, Any]:
        """Log successful issue creation."""
        return self.log_action(
            action="create_issue",
            resource_id=issue_id,
            status="success",
            duration_ms=duration_ms,
            metadata={
                "title": title[:100],  # Truncate for readability
                "commit_hash": commit_hash[:8] if commit_hash else None,
                "project": "AI Integration"
            }
        )

    def log_issue_updated(
        self,
        issue_id: str,
        new_state: str,
        duration_ms: Optional[float] = None
    ) -> Dict[str, Any]:
        """Log successful issue state update."""
        return self.log_action(
            action="update_issue",
            resource_id=issue_id,
            status="success",
            duration_ms=duration_ms,
            metadata={
                "new_state": new_state,
                "project": "AI Integration"
            }
        )

    def log_comment_posted(
        self,
        issue_id: str,
        comment_length: int,
        duration_ms: Optional[float] = None
    ) -> Dict[str, Any]:
        """Log successful comment posting."""
        return self.log_action(
            action="post_comment",
            resource_id=issue_id,
            status="success",
            duration_ms=duration_ms,
            metadata={
                "comment_length": comment_length,
                "project": "AI Integration"
            }
        )

    def log_error(
        self,
        action: str,
        resource_id: Optional[str] = None,
        error_type: str = "unknown",
        error_message: str = "Unknown error",
        duration_ms: Optional[float] = None
    ) -> Dict[str, Any]:
        """Log API error with sanitization."""
        return self.log_action(
            action=action,
            resource_id=resource_id,
            status="error",
            duration_ms=duration_ms,
            error=f"{error_type}: {error_message[:200]}",  # Truncate for safety
            metadata={
                "error_type": error_type,
                "project": "AI Integration"
            }
        )

    def log_escalation(
        self,
        reason: str,
        target_team: str,
        issue_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Log escalation to human team."""
        return self.log_action(
            action="escalate",
            resource_id=issue_id,
            status="escalation",
            metadata={
                "reason": reason,
                "target_team": target_team,
                "notification_channel": "slack"
            }
        )


# Singleton audit logger
_audit_logger: Optional[AuditLogger] = None


def initialize_audit_logger(project_id: str) -> AuditLogger:
    """Initialize or return singleton audit logger."""
    global _audit_logger

    if _audit_logger is None:
        _audit_logger = AuditLogger(project_id=project_id)
        logging.info(f"Audit logger initialized for project {project_id}")

    return _audit_logger


def get_audit_logger() -> AuditLogger:
    """Get singleton audit logger (initialize if needed)."""
    global _audit_logger

    if _audit_logger is None:
        import os
        project_id = os.environ["GCP_PROJECT_ID"]
        initialize_audit_logger(project_id)

    return _audit_logger


def audit_action(action_name: str):
    """
    Decorator to automatically audit API actions.

    Usage:
        @audit_action("create_issue")
        def create_linear_issue(title, description):
            # Implementation
            return issue_id
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = get_audit_logger()
            start_time = time.time()

            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000

                # Log success
                logger.log_action(
                    action=action_name,
                    status="success",
                    duration_ms=duration_ms,
                    metadata={"function": func.__name__}
                )

                return result

            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000

                # Log error
                logger.log_error(
                    action=action_name,
                    error_type=type(e).__name__,
                    error_message=str(e)[:200],
                    duration_ms=duration_ms
                )

                raise

        return wrapper
    return decorator


# Example audit queries (for Cloud Logging console)
AUDIT_QUERY_EXAMPLES = {
    "all_spark_activity": """
resource.type="global"
jsonPayload.actor="gemini-spark"
jsonPayload.action=~"create_issue|update_issue|post_comment"
severity >= DEFAULT
    """,
    "failed_operations": """
resource.type="global"
jsonPayload.actor="gemini-spark"
jsonPayload.status="error"
severity >= WARNING
    """,
    "escalations": """
resource.type="global"
jsonPayload.actor="gemini-spark"
jsonPayload.action="escalate"
    """,
    "credential_issues": """
resource.type="global"
jsonPayload.actor="gemini-spark"
jsonPayload.action="get_credentials"
jsonPayload.status="error"
    """,
    "performance_metrics": """
resource.type="global"
jsonPayload.actor="gemini-spark"
jsonPayload.status="success"
| stats avg(jsonPayload.duration_ms) as avg_duration_ms, max(jsonPayload.duration_ms) as max_duration_ms by jsonPayload.action
    """
}
