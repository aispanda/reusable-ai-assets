# Agentic SDLC Core Specification

## Overview
FastMCP-based gateway for autonomous artifact generation, validation, and deployment.

## Architecture Components

### 1. Bounded MCP placeholder (`mcp/gateway.py`)
- Loopback-only development entry point
- Non-sensitive locked-state manifest only
- No credential-return, arbitrary file-transfer or Judge LLM tools
- Domain actions belong to authenticated consumer services after allowlist and
  independent security review

### 2. GCS Sync Manager (`mcp/gcs_sync.py`)
- Bidirectional sync (local ↔ GCS)
- File integrity via SHA256 hashing
- Metadata preservation (timestamps, custom tags)
- Incremental backup support

### 3. Judge LLM (`scripts/judge_review.py`)
- Claude-powered autonomous validation
- Rule-based compliance checking
- Security and correctness review
- Pass/Fail verdict with recommendations

### 4. GitHub Actions Workflows
- `validate-artifacts.yaml`: Syntax & test validation
- `sync-gcs.yaml`: Automated artifact backup
- `judge-review.yaml`: LLM-based code review

## Deployment

### Local Development
```bash
pip install -r requirements.txt
python mcp/gateway.py
```

### Production

Not authorized by this reusable scaffold. A consuming service must define its
own authenticated transport, allowlisted domain actions, secret broker,
deployment target and evidence gates on an issue-linked release branch.
