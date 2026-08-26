# Agentic SDLC Core Specification

## Overview
FastMCP-based gateway for autonomous artifact generation, validation, and deployment.

## Architecture Components

### 1. FastMCP Gateway (`mcp/gateway.py`)
- RESTful interface for agent orchestration
- Google Secret Manager integration for credentials
- GCS artifact sync and versioning
- Judge LLM validation hooks

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
export GCP_PROJECT_ID=example-project
python mcp/gateway.py
```

### Production (GitHub Actions)
- Workflows trigger on PR/push events
- GCP SA credentials loaded from GitHub Secrets
- Artifacts synced to a consumer-owned Cloud Storage bucket.
- Judge reviews all new code
