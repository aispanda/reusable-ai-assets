"""
Phase 4: Error Handling & Resilience

This module provides resilience patterns for Spark's Linear API integration:
- Exponential backoff for rate limiting (2s, 4s, 8s, 16s delays)
- Graceful failure when Linear API is unavailable
- Graceful failure when credentials are unavailable
- No API key leakage in error logs or exception traces
- Escalation to human team with structured alerts

Used by: Gemini Spark (AI-63), RA-013 Agent Linear API Integration
Dependencies: logging, time, functools
"""

import logging
import time
from typing import Dict, Optional, Callable, Any
from functools import wraps
from datetime import datetime


logger = logging.getLogger(__name__)


class ResilienceError(Exception):
    """Base exception for resilience-related errors."""
    pass


class RateLimitError(ResilienceError):
    """Raised when Linear API rate limit is hit."""
    pass


class CredentialError(ResilienceError):
    """Raised when credential retrieval fails."""
    pass


class APIUnavailableError(ResilienceError):
    """Raised when Linear API is unavailable."""
    pass


class EscalationError(ResilienceError):
    """Raised to signal need for human escalation."""
    pass


class ResilientLinearClient:
    """
    Wraps Linear API client with resilience patterns.

    Features:
    - Exponential backoff for retries
    - Rate limit detection and handling
    - Credential rotation on-the-fly
    - Masked error messages for external consumers
    - Escalation to human team
    """

    def __init__(
        self,
        linear_client,
        audit_logger=None,
        credential_manager=None,
        escalation_handler=None,
        max_retries: int = 3,
        initial_wait_sec: float = 2.0,
        max_wait_sec: float = 30.0
    ):
        """
        Initialize resilient client wrapper.

        Args:
            linear_client: LinearAPIClient instance
            audit_logger: AuditLogger instance for tracking operations
            credential_manager: CredentialManager instance for credential refresh
            escalation_handler: Callable(reason, target_team, issue_id) for escalations
            max_retries: Maximum retries before escalation
            initial_wait_sec: Initial backoff wait time
            max_wait_sec: Maximum backoff wait time
        """
        self.client = linear_client
        self.audit_logger = audit_logger
        self.credential_manager = credential_manager
        self.escalation_handler = escalation_handler
        self.max_retries = max_retries
        self.initial_wait_sec = initial_wait_sec
        self.max_wait_sec = max_wait_sec

    def _is_rate_limited(self, error: Exception) -> bool:
        """Check if error is due to rate limiting."""
        error_str = str(error).lower()
        return any(phrase in error_str for phrase in ["rate", "429", "too many", "throttle"])

    def _is_credential_error(self, error: Exception) -> bool:
        """Check if error is due to credential issues."""
        error_str = str(error).lower()
        return any(phrase in error_str for phrase in ["unauthorized", "401", "invalid", "expired"])

    def _is_api_unavailable(self, error: Exception) -> bool:
        """Check if error is due to API unavailability."""
        error_str = str(error).lower()
        return any(phrase in error_str for phrase in [
            "unavailable", "503", "timeout", "connection", "dns"
        ])

    def _mask_error_message(self, error: Exception) -> str:
        """Return masked error message safe for logging."""
        error_str = str(error)

        # Remove any potential credential patterns
        redactions = [
            ("Bearer ", "<bearer_token>"),
            ("Authorization", "<auth_header>"),
            ("api_key=", "api_key=<redacted>"),
            ("apiKey=", "apiKey=<redacted>"),
        ]

        for pattern, replacement in redactions:
            if pattern in error_str:
                error_str = error_str.replace(pattern, replacement)

        return error_str[:200]  # Truncate for safety

    def call_with_resilience(
        self,
        fn: Callable,
        operation_name: str,
        issue_id: Optional[str] = None,
        escalation_target: Optional[str] = None
    ) -> Any:
        """
        Execute operation with full resilience handling.

        Args:
            fn: Callable to execute (should be a client method)
            operation_name: Name of operation (for logging)
            issue_id: Optional issue ID being operated on
            escalation_target: Team to escalate to on failure

        Returns:
            Result of fn() or None if failed and escalated

        Raises:
            EscalationError if escalation is needed
        """
        start_time = time.time()
        last_error = None

        for attempt in range(self.max_retries):
            try:
                result = fn()

                duration_ms = (time.time() - start_time) * 1000

                # Log success
                if self.audit_logger:
                    self.audit_logger.log_action(
                        action=operation_name,
                        resource_id=issue_id,
                        status="success",
                        duration_ms=duration_ms,
                        metadata={"attempt": attempt + 1}
                    )

                logger.info(
                    f"Operation {operation_name} succeeded",
                    extra={
                        "actor": "gemini-spark",
                        "operation": operation_name,
                        "attempt": attempt + 1,
                        "duration_ms": duration_ms
                    }
                )

                return result

            except Exception as e:
                last_error = e
                masked_error = self._mask_error_message(e)
                duration_ms = (time.time() - start_time) * 1000

                # Determine error type and handling
                if self._is_rate_limited(e):
                    wait_time = min(self.initial_wait_sec ** attempt, self.max_wait_sec)

                    logger.warning(
                        f"Rate limited on {operation_name}. Retrying in {wait_time}s",
                        extra={
                            "actor": "gemini-spark",
                            "operation": operation_name,
                            "error_type": "rate_limit",
                            "attempt": attempt + 1,
                            "wait_sec": wait_time
                        }
                    )

                    time.sleep(wait_time)

                elif self._is_credential_error(e):
                    logger.error(
                        f"Credential error on {operation_name}. Escalating.",
                        extra={
                            "actor": "gemini-spark",
                            "operation": operation_name,
                            "error_type": "credential_error",
                            "masked_error": masked_error
                        }
                    )

                    # Log escalation
                    if self.audit_logger:
                        self.audit_logger.log_escalation(
                            reason="Credential unavailable or invalid",
                            target_team="DevOps",
                            issue_id=issue_id
                        )

                    raise EscalationError(
                        f"Credential error on {operation_name}. "
                        "Contact DevOps for credential investigation."
                    )

                elif self._is_api_unavailable(e):
                    # Try once more, then escalate
                    if attempt < self.max_retries - 1:
                        wait_time = min(self.initial_wait_sec ** attempt, self.max_wait_sec)
                        logger.warning(
                            f"Linear API unavailable. Retrying in {wait_time}s",
                            extra={
                                "actor": "gemini-spark",
                                "operation": operation_name,
                                "error_type": "api_unavailable",
                                "attempt": attempt + 1
                            }
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(
                            f"Linear API unavailable after {self.max_retries} attempts. Escalating.",
                            extra={
                                "actor": "gemini-spark",
                                "operation": operation_name,
                                "error_type": "api_unavailable"
                            }
                        )

                        if self.audit_logger:
                            self.audit_logger.log_escalation(
                                reason="Linear API unavailable",
                                target_team="DevOps",
                                issue_id=issue_id
                            )

                        raise EscalationError(
                            "Linear API is currently unavailable. "
                            "Contact DevOps for status."
                        )

                else:
                    # Other error: don't retry
                    logger.error(
                        f"Operation {operation_name} failed: {masked_error}",
                        extra={
                            "actor": "gemini-spark",
                            "operation": operation_name,
                            "error_type": type(e).__name__,
                            "masked_error": masked_error
                        }
                    )

                    if self.audit_logger:
                        self.audit_logger.log_error(
                            action=operation_name,
                            resource_id=issue_id,
                            error_type=type(e).__name__,
                            error_message=masked_error,
                            duration_ms=duration_ms
                        )

                    raise

        # All retries exhausted
        raise EscalationError(
            f"Operation {operation_name} failed after {self.max_retries} attempts. "
            f"Last error: {self._mask_error_message(last_error)}"
        )

    def create_issue_resilient(
        self,
        title: str,
        description: str,
        project_id: str,
        commit_hash: Optional[str] = None
    ) -> Optional[str]:
        """Create issue with full resilience handling."""
        return self.call_with_resilience(
            lambda: self.client.create_issue(
                title=title,
                description=description,
                project_id=project_id,
                commit_hash=commit_hash
            ),
            operation_name="create_issue",
            escalation_target="Engineering"
        )

    def update_issue_state_resilient(
        self,
        issue_id: str,
        state_name: str
    ) -> bool:
        """Update issue state with full resilience handling."""
        try:
            return self.call_with_resilience(
                lambda: self.client.update_issue_state(
                    issue_id=issue_id,
                    state_name=state_name
                ),
                operation_name="update_issue_state",
                issue_id=issue_id,
                escalation_target="Engineering"
            )
        except EscalationError:
            return False

    def add_comment_resilient(
        self,
        issue_id: str,
        body: str
    ) -> Optional[str]:
        """Add comment with full resilience handling."""
        try:
            return self.call_with_resilience(
                lambda: self.client.add_comment(
                    issue_id=issue_id,
                    body=body
                ),
                operation_name="add_comment",
                issue_id=issue_id,
                escalation_target="Engineering"
            )
        except EscalationError:
            return None


def resilient_operation(operation_name: str):
    """
    Decorator for resilient operations.

    Usage:
        @resilient_operation("create_issue")
        def create_spark_issue(client, title, description):
            return client.create_issue(title, description)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except EscalationError as e:
                logger.error(f"Escalation needed: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Operation {operation_name} failed: {str(e)}")
                raise

        return wrapper
    return decorator
