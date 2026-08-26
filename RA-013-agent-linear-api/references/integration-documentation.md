# Phase 5: Documentation References

## Credential Management Pattern (GSM)

**Location:** `references/credential-storage-gsm-pattern.md`

### Overview
Spark uses Google Secret Manager (GSM) to store and retrieve the Linear API key securely.

### Pattern
```
GCP Project (`<gcp-project-id>`)
  └─ Secret Manager
      └─ Secret: "linear-api-key"
          └─ Version: "latest" (auto-managed)
              └─ Value: <Linear API key>
```

### Credential Rotation
- **Frequency:** Quarterly (recommended)
- **Method:** Create new secret version in GSM
- **Detection:** Automatic via cache TTL (5 minutes default)
- **Steps:**
  1. Generate new Linear API key in Linear workspace
  2. Create new secret version: `gcloud secrets versions add linear-api-key --data-file=key.txt`
  3. Spark picks up new key on next credential check
  4. Old version remains in GSM history for audit

### Error Handling
- Missing secret: Escalate to DevOps
- Invalid/expired key: Escalate to DevOps
- GSM API unavailable: Retry with exponential backoff
- No credential leakage in logs or errors (always masked)

---

## GCP Logging Audit Trail

**Location:** `references/gcp-logging-audit-pattern.md`

### Log Structure
```json
{
  "timestamp": "2026-08-19T18:00:00Z",
  "actor": "gemini-spark",
  "action": "create_issue|update_issue|post_comment|escalate",
  "resource_type": "linear_issue",
  "resource_id": "AI-63",
  "status": "success|error|escalation",
  "duration_ms": 1234,
  "metadata": {
    "commit_hash": "abc123de",
    "project": "AI Integration"
  },
  "error": "RateLimitError: Too many requests"
}
```

### Retention Policy
- **Duration:** 90 days minimum
- **Storage:** GCP Cloud Logging in the configured consumer project
- **Access:** Accessible via Cloud Logging console with actor filter
- **Compliance:** Supports audit trail requirements for regulated deployment profiles

### Query Examples
- All Spark activity: `jsonPayload.actor="gemini-spark"`
- Failed operations: `jsonPayload.status="error"`
- Escalations: `jsonPayload.action="escalate"`
- Performance by action: `| stats avg(duration_ms) by action`

---

## Scope Boundaries

### Spark's Linear Access
- **Allowed:** Create issues, update status, post comments
- **Project:** AI Integration (PID-abc123)
- **Fields:** title, description, state, comments
- **Related:** Can query related issues via project relationships
- **Forbidden:** Delete issues, modify project settings, access credentials

### Credential Scope
- **Storage:** Google Secret Manager (GSM)
- **Project:** `<gcp-project-id>`
- **Secret:** linear-api-key (Linear API personal access token)
- **Permissions:** Spark service account has read-only access to latest version
- **Rotation:** Quarterly via secret versioning

### Audit Scope
- **Destination:** GCP Cloud Logging
- **Project:** `<gcp-project-id>`
- **Log:** gemini-spark-linear-api
- **Retention:** 90 days
- **Query:** All metadata searchable except credential details

---

## Escalation Rules

| Condition | Action | Team | Notification |
|-----------|--------|------|--------------|
| Credentials unavailable | Stop; do not retry | DevOps | Slack: #spark-alerts |
| Issue creation fails (not rate limit) | Log error; escalate | Engineering Lead | Slack: #engineering |
| Linear API rate-limited 3+ times | Stop after max retries | DevOps + Linear Admin | Slack: #spark-alerts |
| CI results malformed | Stop; request caller fix | CI/CD Engineer | Slack: #ci-cd-support |
| Idempotency finds 2+ issues for same commit | Stop; alert human | Engineering Lead | Slack: #engineering + issue thread |

---

## Integration Points

### Incoming: CI/CD Pipeline
- **Source:** GitHub Actions or Notion CI/CD process
- **Input:** CI pipeline completion event with test results
- **Payload:** JSON with commit hash, branch, test results, status

### Outgoing: Linear Workspace
- **Destination:** Consumer-configured Linear workspace
- **Output:** Issues created/updated with validation results
- **Notifications:** Team members notified via Linear

### Outgoing: Escalation Alerts
- **Destination:** Consumer-configured alert channels
- **Channels:** Defined by the consuming project's escalation policy
- **Format:** Structured alert with reason, action required, timestamp

---

## Testing & Validation

### Unit Tests
- Credential retrieval from GSM (success & failure)
- Error masking in log messages
- Idempotency key computation
- Cache validity checks

### Integration Tests
- Spark creates issue → reads issue → validates fields
- Spark updates issue status (Todo → In Progress → Ready for Merge → Blocked)
- Spark posts comment → verify comment queryable in Linear
- Idempotency: duplicate triggers produce no duplicate issue

### Error Scenarios
- Masked error when secret not found
- Masked error when credentials invalid
- No credential leaks under high load
- Credential rotation during active operations

### Performance
- Create issue: <2s target
- Update status: <1s target
- Post comment: <1.5s target
- Rate limit recovery: exponential backoff with max 30s

---

## Related Assets

- **RA-005:** AI-Native Rapid Solution Delivery Kit (project governance)
- **RA-008:** Multi-Agent Orchestration Knowledge Base (bounded delivery patterns)
- **RA-010:** Cross-Agent Handover Protocol (credential delegation)
- **AI-62:** Google Secret Manager (parent story, credential infrastructure)
- **AI-63:** Gemini Spark Linear API Integration (this story)
- **Consumer:** Project-owned integration tracked outside the reusable package
