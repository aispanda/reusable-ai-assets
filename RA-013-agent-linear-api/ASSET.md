# RA-013 — Agent Linear API Integration

**ID:** RA-013
**Title:** Agent Linear API Integration
**Category:** AI workflow / SDLC automation
**Status:** Pilot v0.1 (implementation complete; bounded live validation pending)
**Verified:** 2026-08-19 (build checkpoint)

---

## Use When

- Agent (e.g., Gemini Spark) needs to autonomously manage Linear workflow: create issues, update status, post comments
- SDLC requires agent-driven CI/CD orchestration with Linear as single source of truth
- Multi-agent delivery needs bounded, auditable Linear API access via Google Secret Manager
- Team wants credential rotation, error handling, and escalation rules for autonomous agent workflows

---

## Outcome

1. **Credential Management** — Linear API key stored in Google Secret Manager with automatic quarterly rotation
2. **Audit & Logging** — All agent Linear API calls logged to GCP Logging with searchable metadata (actor, action, resource, status)
3. **Linear Integration** — Agent creates issues, updates status, posts validation comments with idempotency checks
4. **Error Handling** — Exponential backoff for rate limiting, graceful failures, escalation to humans
5. **Bounded Execution** — Follows RA-008 (Multi-Agent-Orchestration) patterns: checkpoints, self-validation, bounded repair
6. **Testing** — Autonomous agent testing (via Gemini Spark); unit + integration + error scenarios + rotation tests

---

## Transfer manifest

| Component | Purpose | Location |
| -- | -- | -- |
| `get_linear_credentials()` tool | Retrieve Linear API key from GSM | Consumer-owned gateway adapter |
| System Architecture | Design, component flow, code templates | references/SYSTEM_ARCHITECTURE.md |
| Agent Runbook | Setup, configuration, troubleshooting | references/AGENT_RUNBOOK.md |
| QA & Testing | Test scenarios and validation approach | references/QA_TESTING.md |
| Agent Handover Doctrine | Autonomous execution patterns (repo-based) | Links to ai-agent-handover.md |
| Audit Log Format | GCP Logging schema | templates/AUDIT_LOG.template.json |
| Credential Rotation Procedure | Quarterly rotation via GSM versioning | references/CREDENTIAL_ROTATION.md |

---

## Boundaries

**Included:**
- Linear API access scoped by the consuming project's configuration
- Credential storage and rotation (GSM)
- Audit logging (GCP Logging)
- Error handling and escalation rules
- Autonomous agent execution patterns (bounded, checkpointed)

**Excluded:**
- Linear account/workspace management
- Custom Linear API wrappers (use Linear SDK directly)
- Application-specific Linear workflows (only the infrastructure)
- Credentials, customer data, API keys, personal machine paths (never in reusable core)

---

## Decision Matrix

| Decision | Choice | Rationale |
| -- | -- | -- |
| Credential storage | Google Secret Manager | Versioned, rotatable, access-logged, no code secrets |
| Audit destination | GCP Logging | Searchable, immutable, retention policy, no duplication |
| Error handling | Exponential backoff + escalation | Standard SDLC pattern, human-in-loop for failures |
| Agent pattern | RA-008 bounded delivery | Multi-agent orchestration, checkpoints, self-validation, bounded repair |
| Handover location | Repo (not Linear docs) | Versioned, reviewable, reusable across projects |
| Testing approach | Autonomous Gemini Spark | Faster iteration, continuous feedback, eliminates manual overhead |

---

## Verification

**Build Status:**
- [x] Phase 1: Credential Management implementation
- [x] Phase 2: Audit & Logging implementation
- [x] Phase 3: Linear Integration implementation
- [x] Phase 4: Error Handling & Resilience implementation
- [x] Phase 5: Documentation package
- [x] Phase 6: Autonomous test harness
- [ ] Bounded live credential, API and rotation validation

**Verification Plan:**
- Story Retro document (accuracy, token efficiency, effectiveness)
- Build Components manifest (all files created/updated/deleted)
- Autonomous test coverage via Gemini Spark
- RA-008 bounded delivery pattern compliance

---

## References

- **RA-005:** AI-Native Rapid Solution Delivery Kit (SDLC governance)
- **RA-008:** Multi-Agent-Orchestration (bounded execution patterns)
- **AI-63 (Linear):** Gemini Spark Linear API Integration (parent story)
- **AI-62 (Linear):** Google Secret Manager (credential infrastructure, parent)

---

## Project Profile Boundary

Keep the consuming repository path, workflow system, Linear workspace, cloud
project and service-account identity in a consumer-owned private profile. The
reusable package accepts only explicit aliases or configuration parameters and
must never contain those live values.

---

## Changelog

**2026-08-19 (v0.1 - Initial Build)**
- Created RA-013 folder structure
- Phases 1-6 implementation package completed
- Story Retro + Build Components tracking active
- RA-008 bounded patterns applied to Spark execution
