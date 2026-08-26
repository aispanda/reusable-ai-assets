# Multi-Agent Orchestration Knowledge Base (RA-008)

## 0. The Fork: Choose Your Profile

Before building a multi-agent system, the human architect must make a decision. Multi-agent design forces a trade-off between **Token Efficiency/Speed** and **Enterprise Reliability**.

Choose your path:

- **[ ] Profile A: Lean Execution (Highest Quality at Lowest Cost)**
  - *Goal:* Maximum token efficiency, scrappy local execution, fast results.
  - *Scope:* Single Evaluator-Optimizer loops running on local data.
  - *Read Section 1 only.*

- **[ ] Profile B: Enterprise Scale (Production Grade)**
  - *Goal:* Zero-trust security, durable state, team-based agent topologies.
  - *Scope:* Cloud deployments, API integrations, complex workflows.
  - *Read Section 2 only.*

---

## SECTION 1: Profile A (Lean Execution)
*Read this section if you chose Profile A. It provides the exact JSON contracts needed for an Evaluator-Optimizer loop without the bloat.*

### The Bulletproof CoT Judge Architecture
To prevent the Judge from anchoring onto the Generator's output, implement **Chain-of-Thought (CoT) Evaluation**:
- **Fact Extraction First**: Force the Judge to read *only* the source truth first and list critical facts.
- **Cross-Examination**: Force the Judge to explicitly check if those facts exist in the generated artifact.
- **Final Verdict**: Only render PASS/FAIL at the absolute end.

### The Dual-LLM Output Schema (Markdown Contract)
Instead of forcing strict JSON out of generative LLMs, enforce a highly structured 4-part Markdown output schema for the Generator, combined with CoT evaluation from the Judge.

**Generator Schema:**
```markdown
## Tags
[Comma-separated list of tags]
## Quotes
[Critical quotes translated]
## Comprehensive Summary
[Full narrative]
## Short Summary
[~150 words TL;DR]
```

**Judge Schema:**
The Judge MUST follow CoT and output a final verdict on the last line.
```markdown
STEP 1: FORMAT CHECK
...
STEP 2: OMISSION HUNTING
...
STEP 3: CROSS-REFERENCE
...
VERDICT: PASS / FAIL [with actionable feedback]
```

### Loop Control & Guardrails
- **Max Retry Limit:** Hard cap of 3 iteration cycles.
- **State Retention:** Retain all `(candidate, score)` pairs across iterations.
- **Fallback:** If Attempt 3 fails, output the candidate with the highest numerical score.

### Optimizer Feedback Prompt
> **System Constraint:** You are revising a previous draft based on a failed quality audit.
> **Specific Defects Identified:** [List items from `actionable_feedback`]
> **Instructions:** Correct ONLY the listed defects. Do not introduce new features.

### Common Pitfalls & Resolutions
- **Unicode Decode Errors in Subprocesses**: When orchestrating LLM python scripts via `subprocess.run` on Windows with `capture_output=True` and `text=True`, LLMs may output non-ASCII characters (e.g., em-dashes, smart quotes, Indic languages). This can crash the orchestrator with `UnicodeDecodeError` if it tries to decode using default CP1252 or strict UTF-8.
  - *Resolution*: Always use `errors='replace'` (or `'ignore'`) when capturing output: `subprocess.run(..., text=True, encoding='utf-8', errors='replace')`.
- **Unicode Encode Errors in Child Scripts (Windows)**: Even if the parent process handles decoding correctly, a Python child process running on Windows will default to `cp1252` encoding for standard output (`sys.stdout`) when its output is piped. This means if the child script executes `print(summary)` and the summary contains Unicode characters, the child script will abruptly crash with a `UnicodeEncodeError`.
  - *Resolution*: Always force the child process to use UTF-8 by setting the `PYTHONIOENCODING` environment variable before invoking it:
    ```python
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    subprocess.run(..., env=env)
    ```

---

## SECTION 2: Profile B (Enterprise Scale)
*Read this section if you chose Profile B. It covers full orchestration, security, and interoperability standards.*

### Topologies
1. **Supervisor-Worker (Delegation):** Router dispatches to Tool-Specific Agents.
2. **Parallel Fan-out / Join:** Executing high-throughput independent tasks.
3. **Stateful Handoffs:** Conversational, multi-turn collaboration across domains.

### Production Engineering & State
- **Durable Execution (Checkpoints):** Use LangGraph to save graph state at every node transition for resume/replay.
- **Idempotency:** Ensure tool calls do not corrupt data if executed twice.
- **Observability:** Instrument loops with tracing (Opik, LangSmith) to track token costs and tool failures.

### Security & Interoperability
- **OWASP Agentic Top 10:** Protect against prompt injection by separating instructions from untrusted data inputs.
- **Least Privilege:** Sandboxing is mandatory for code-execution agents.
- **MCP (Model Context Protocol):** Standardize tool usage to decouple agents from specific tool integrations.
- **A2A Specification:** Standardize peer-to-peer agent communication.

### Risk-Tiered Judge Policy
Do not use a universal `0.85` threshold. Calibrate to risk:
- **Low-Risk:** Threshold = 0.70. Automated pass.
- **High-Risk (DBs, Financials):** Threshold = 0.95. **Mandatory Human-in-the-Loop (HITL) approval** regardless of score.

### ⚠️ THE DEPLOYMENT READINESS GAP: Code Complete ≠ Production Ready

**Critical Pattern (from real-world multi-agent builds):**

"Tests pass" creates a false sense of completion. Code-complete artifacts mask missing integration, deployment, and operational work. A story can be marked "Done" while the system is entirely non-functional in practice.

**What "Code Complete + Tests Pass" Actually Means:**
- ✅ Unit tests: Local functions work in isolation
- ✅ Core logic: Business logic is implemented
- ❌ Integration: Components don't communicate end-to-end
- ❌ Deployment: Service isn't running anywhere accessible
- ❌ Discovery: System doesn't know how to reach the service
- ❌ Operations: No runbook, no monitoring, no failure handling

**The Gap Between "Done" and "Actually Works":**

| Phase | Deliverable | Team Blind Spot | Cost to Fix |
|-------|-------------|-----------------|-------------|
| Code | Unit tests pass | "Tests pass, ship it" | ~5% effort |
| Integration | E2E tests fail | "Must be environment setup" | ~40% effort |
| Deployment | Service won't start | "Dependencies, versions, configs" | ~30% effort |
| Discovery | Tools not accessible | "How do we register this?" | ~15% effort |
| Operations | No monitoring/runbook | "We'll document later" | ~10% effort |

**Real Example: AI-73 Inter-Agent Bridge**
- Code: 400+ LOC for inter-agent communication ✅
- Unit tests: 18 passing ✅
- FastMCP gateway: Code written but **never started** ❌
- MCP tool registration: No mechanism to discover tools ❌
- E2E test: No validation that Claude → Spark actually works ❌
- Deployment docs: Missing (how to run the gateway?) ❌
- Result: $0 value despite 100% code completion. Blocking AI-75, AI-76, AI-77.

**Deployment Readiness Checklist (Profile B Only):**

Before marking a multi-agent build "Done", verify ALL of these:

1. **Service Deployment**
   - [ ] Executable/service starts without errors (outside unit test env)
   - [ ] All dependencies listed and installable
   - [ ] Configuration mechanism (env vars, .env, config files) documented
   - [ ] Startup logs show healthy initialization (no silent failures)

2. **Service Discovery**
   - [ ] If MCP server: registered in system's MCP tool list
   - [ ] If HTTP API: endpoint URL discoverable (env var, config, or registry)
   - [ ] Health check endpoint exists and returns live status
   - [ ] Agent-to-agent communication: established and tested

3. **Integration Testing (Not Unit Tests)**
   - [ ] E2E test: Agent A calls Agent B's tools through the bridge, gets result
   - [ ] Credential flow: GSM/vault integration verified (not mocked)
   - [ ] Error path: Simulated failures handled gracefully (not crashing service)
   - [ ] Performance: Actual latency measured (not estimated from code)

4. **Operational Readiness**
   - [ ] Deployment runbook: Step-by-step for new environment (GCP, Docker, local)
   - [ ] Monitoring: Logs, traces, and failure alerts configured
   - [ ] Fallback plan: What happens if the service goes down
   - [ ] Incident response: How to debug/restart in production

5. **Blocking Dependency Resolution**
   - [ ] Identify all downstream stories that depend on this (AI-75 depends on AI-73)
   - [ ] Verify they won't be blocked at merge (gateway must run, not just code)
   - [ ] E2E test includes the dependent workflow (not just the bridge in isolation)

**When to Reopen a "Done" Story:**
- Tests pass but service won't start → Reopen for deployment fixes
- Service runs locally but not discoverable by other agents → Reopen for registration
- Dependent stories blocked waiting for actual service → Reopen to unblock them
- E2E tests reveal integration gaps unit tests missed → Reopen for integration fixes

**Prevention Pattern:**
In story acceptance criteria, split into two sections:
1. **Code & Unit Testing** (typically 20-30% of work)
2. **Deployment & Integration** (typically 70-80% of work, often overlooked)

Mark "Done" only when BOTH sections pass. Merge only the code; mark story complete only when service is live.
