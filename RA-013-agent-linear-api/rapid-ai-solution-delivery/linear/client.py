"""
Phase 3: Linear API Integration Client

This module implements the Linear API client for Spark with:
- Creating issues with CI/CD validation results
- Updating issue status based on CI pipeline state
- Posting detailed validation comments
- Idempotency checks (prevent duplicate issues for same commit hash)
- Multi-workspace issue queries

Used by: Gemini Spark (AI-63), RA-013 Agent Linear API Integration
Dependencies: requests, json, hashlib, time
"""

import requests
import json
import hashlib
import time
import logging
from typing import Dict, Optional, List, Any
from datetime import datetime


logger = logging.getLogger(__name__)


class LinearAPIClient:
    """
    Client for interacting with Linear API.

    Endpoints:
    - createIssue: Create new issue
    - updateIssue: Update issue state/fields
    - addComment: Post comment on issue
    - getIssue: Retrieve issue details
    - listIssues: Query issues with filters
    """

    BASE_URL = "https://api.linear.app/graphql"

    def __init__(self, api_key: str, audit_logger=None):
        """
        Initialize Linear API client.

        Args:
            api_key: Linear API key (from Secret Manager)
            audit_logger: Optional audit logger for tracking operations
        """
        self.api_key = api_key
        self.audit_logger = audit_logger
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def _execute_mutation(self, query: str, variables: Optional[Dict] = None) -> Dict[str, Any]:
        """Execute GraphQL mutation with error handling."""
        payload = {
            "query": query,
            "variables": variables or {}
        }

        try:
            response = requests.post(
                self.BASE_URL,
                json=payload,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()

            result = response.json()

            # Check for GraphQL errors
            if "errors" in result:
                error_msg = result["errors"][0].get("message", "Unknown error")
                raise Exception(f"Linear API error: {error_msg}")

            return result.get("data", {})

        except requests.exceptions.Timeout:
            raise Exception("Linear API request timed out")
        except requests.exceptions.ConnectionError:
            raise Exception("Failed to connect to Linear API")
        except Exception as e:
            raise Exception(f"Linear API request failed: {str(e)}")

    def _compute_idempotency_key(self, commit_hash: str) -> str:
        """Compute idempotency key from commit hash."""
        return hashlib.sha256(commit_hash.encode()).hexdigest()[:16]

    def get_issue(self, issue_id: str) -> Optional[Dict]:
        """
        Retrieve issue details.

        Args:
            issue_id: Linear issue ID (e.g., "AI-63")

        Returns:
            Issue data or None if not found
        """
        query = """
        query GetIssue($id: String!) {
            issue(id: $id) {
                id
                title
                description
                state {
                    name
                    type
                }
                project {
                    id
                    name
                }
                createdAt
                updatedAt
            }
        }
        """

        try:
            result = self._execute_mutation(query, {"id": issue_id})
            return result.get("issue")
        except Exception as e:
            logger.error(f"Failed to get issue {issue_id}: {str(e)}")
            return None

    def query_issues_by_commit(
        self,
        commit_hash: str,
        project_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Query existing issues by commit hash (for idempotency).

        Args:
            commit_hash: Full commit hash (40 chars)
            project_id: Optional project ID to filter

        Returns:
            List of matching issues
        """
        commit_short = commit_hash[:8]
        search_query = f'title ~ "{commit_short}"'

        if project_id:
            search_query += f' AND project.id = "{project_id}"'

        query = """
        query SearchIssues($filter: String!) {
            issues(filter: $filter, first: 10) {
                nodes {
                    id
                    title
                    description
                    createdAt
                }
            }
        }
        """

        try:
            result = self._execute_mutation(query, {"filter": search_query})
            return result.get("issues", {}).get("nodes", [])
        except Exception as e:
            logger.error(f"Failed to query issues for commit {commit_short}: {str(e)}")
            return []

    def create_issue(
        self,
        title: str,
        description: str,
        project_id: str,
        commit_hash: Optional[str] = None,
        assignee_id: Optional[str] = None,
        priority: int = 2
    ) -> Optional[str]:
        """
        Create a new Linear issue.

        Args:
            title: Issue title (e.g., "Code Review: Add OAuth auth flow (abc123de)")
            description: Markdown description with CI/CD results
            project_id: Linear project ID (e.g., "PID-abc123")
            commit_hash: Full commit hash for idempotency
            assignee_id: Optional assignee ID
            priority: Priority level (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)

        Returns:
            Issue ID if successful, None otherwise
        """
        # Check idempotency: existing issue for this commit?
        if commit_hash:
            existing = self.query_issues_by_commit(commit_hash, project_id)
            if existing:
                logger.info(f"Issue already exists for commit {commit_hash[:8]}: {existing[0]['id']}")
                return existing[0]["id"]

        query = """
        mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
                issue {
                    id
                    title
                    createdAt
                }
                success
            }
        }
        """

        variables = {
            "input": {
                "title": title,
                "description": description,
                "projectId": project_id,
                "priority": priority
            }
        }

        if assignee_id:
            variables["input"]["assigneeId"] = assignee_id

        try:
            result = self._execute_mutation(query, variables)
            issue = result.get("issueCreate", {}).get("issue")

            if issue:
                logger.info(f"Issue created: {issue['id']}")
                return issue["id"]
            else:
                logger.error("Issue creation returned no result")
                return None

        except Exception as e:
            logger.error(f"Failed to create issue: {str(e)}")
            return None

    def update_issue_state(
        self,
        issue_id: str,
        state_name: str
    ) -> bool:
        """
        Update issue state based on CI results.

        Args:
            issue_id: Linear issue ID
            state_name: Target state (e.g., "Ready for Merge", "Blocked", "In Progress")

        Returns:
            True if successful, False otherwise
        """
        query = """
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
                issue {
                    id
                    state {
                        name
                    }
                }
                success
            }
        }
        """

        variables = {
            "id": issue_id,
            "input": {
                "stateId": state_name  # Linear accepts state name or ID
            }
        }

        try:
            result = self._execute_mutation(query, variables)
            success = result.get("issueUpdate", {}).get("success", False)

            if success:
                logger.info(f"Issue {issue_id} updated to state: {state_name}")
            else:
                logger.error(f"Issue update returned success=false")

            return success

        except Exception as e:
            logger.error(f"Failed to update issue {issue_id}: {str(e)}")
            return False

    def add_comment(
        self,
        issue_id: str,
        body: str
    ) -> Optional[str]:
        """
        Post a comment on an issue.

        Args:
            issue_id: Linear issue ID
            body: Comment text (Markdown supported)

        Returns:
            Comment ID if successful, None otherwise
        """
        query = """
        mutation AddComment($input: CommentCreateInput!) {
            commentCreate(input: $input) {
                comment {
                    id
                    createdAt
                }
                success
            }
        }
        """

        variables = {
            "input": {
                "issueId": issue_id,
                "body": body
            }
        }

        try:
            result = self._execute_mutation(query, variables)
            comment = result.get("commentCreate", {}).get("comment")

            if comment:
                logger.info(f"Comment posted to {issue_id}")
                return comment["id"]
            else:
                logger.error("Comment creation returned no result")
                return None

        except Exception as e:
            logger.error(f"Failed to post comment on {issue_id}: {str(e)}")
            return None

    def format_ci_results_comment(self, ci_results: Dict) -> str:
        """
        Format CI/CD results as a markdown comment.

        Args:
            ci_results: Dict with check results

        Returns:
            Formatted markdown string
        """
        checks = ci_results.get("checks", [])

        # Build results table
        rows = []
        for check in checks:
            status = check.get("status", "unknown")
            status_emoji = "✅" if status == "passed" else "⚠️" if status == "warning" else "❌"
            name = check.get("name", "unknown")
            details = check.get("details", "")

            rows.append(f"| {name} | {status_emoji} {status.capitalize()} | {details} |")

        table = "| Check | Status | Details |\n| -- | -- | -- |\n" + "\n".join(rows)

        # Overall status
        overall_status = ci_results.get("status", "unknown")
        status_text = "✅ All checks passed" if overall_status == "success" else "❌ Some checks failed"

        comment = f"""## {status_text}

{table}

**Next Steps:**
- Review code changes in the PR
- Approve or request changes
- Merge when ready

---
*Generated by Gemini Spark SDLC Automation at {datetime.utcnow().isoformat()}Z*
"""
        return comment


# Error handling with exponential backoff
def call_with_backoff(
    fn,
    max_retries: int = 3,
    initial_wait_sec: float = 2.0,
    max_wait_sec: float = 30.0
) -> Any:
    """
    Execute function with exponential backoff for rate limiting.

    Args:
        fn: Callable to execute
        max_retries: Maximum number of retries
        initial_wait_sec: Initial wait time in seconds
        max_wait_sec: Maximum wait time in seconds

    Returns:
        Result of fn()

    Raises:
        Exception: If all retries fail
    """
    last_error = None

    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            last_error = e
            error_str = str(e).lower()

            # Check if rate limited
            if "rate" in error_str or "429" in error_str or "too many requests" in error_str:
                wait_time = min(initial_wait_sec ** attempt, max_wait_sec)
                logger.warning(
                    f"Rate limited. Retry {attempt + 1}/{max_retries} in {wait_time}s"
                )
                time.sleep(wait_time)
            else:
                # Non-retryable error
                raise

    # All retries exhausted
    raise last_error
