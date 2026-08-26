# Story Creation Template (Multi-Phase RA Build)

Based on RA-013 build learnings. Use this checklist when creating a Linear story for a complex, multi-phase asset build.

---

## Pre-Build Checklist

### Document Strategy
- [ ] **Create in Linear ONLY** (no local markdown files; skip conversion step)
- [ ] **System Architecture = single source** (code examples own this doc; others link)
- [ ] **No duplication** (enforce link-or-own rule via template)
- [ ] **Handover docs = Phase 7+ only** (create when autonomous execution begins, not during planning)
- [ ] **Live docs = append-only** (use dated "Deployment Checkpoints" sections, not patch operations)

### Story Structure
- [ ] **Credential Scope Matrix** (if credential story): Secret name, GCP project, tool, access level, rotation frequency
- [ ] **Build Components manifest** (atomic per-component; include tool rationale column)
- [ ] **Story Retro with pre-build Q&A** (capture assumptions, phase strategy, token targets before coding)
- [ ] **Document Ownership matrix** (build owner, ops owner, update cadence, lock points)
- [ ] **System Architecture** (design, credential flow, code templates, integration points)

### Phase Planning
- [ ] **Phase strategy justified** (parallel vs. sequential; why)
- [ ] **Token efficiency targets captured** (docs, no-rework goals)
- [ ] **Assumption capture** (what could change scope)
- [ ] **Handover template noted** (if Phase 7+ needed, reference repo template location)

---

## Build Components Manifest (Live Document)

### Status Summary Table
```
| Phase | Created | Updated | Deleted | GitHub Status |
| -- | -- | -- | -- | -- |
| 1-2 | N | N | 0 | [Pending](link) |
```
**Key:** Update per component creation (atomic, not batch).

### Component Inventory
```
| Component | Path | Purpose | GitHub Link | Notes |
| -- | -- | -- | -- | -- |
| file.py | path/to/file | Purpose | [commit](#) | Phase N: Description |
```
**Key:** Include "Why this tool?" rationale.

### Tool Selection & Rationale
Example structure:
```
| Test # | Test Name | Tool Used | Why This Tool | Result |
| -- | -- | -- | -- | -- |
| 1 | Create issue | mcp__Linear__save_issue | Structured API, no UI automation | ✅ PASS |
```

### Deployment Checkpoints (replaces TBD table)
```
- 2026-08-19T21:15Z: Phase 1-2 code ready (local validation)
- 2026-08-19T22:00Z: Phases 1-6 committed [abc123de]
- 2026-08-19T22:30Z: Spark autonomous testing initiated
```

### Key Findings Section
- ✅ What worked (with evidence)
- ❌ What failed (with root cause)
- ⚠️ Partial successes (with workaround)

---

## Story Retro (Build Tracking + Learnings)

### Questions & Answers (Pre-Build)
```
| Q | A | Rationale |
| -- | -- | -- |
| Create in Linear or local? | LINEAR ONLY | Skip conversion; direct source |
| Code duplication or link? | LINK to source | System Architecture = owner |
| Handover doc when? | PHASE 7+ (execution) | Only when autonomous action |
| Live doc strategy? | APPEND-ONLY | Timestamps + new sections survive edits |
| GitHub links? | Checkpoints section | Dated updates, no TBD tables |
```

### Build Plan
- Phases (parallel vs. sequential with justification)
- Phase 1-6 detailed steps (concise)

### Assumptions Captured
- RA pattern assumptions
- Spark execution model
- CI/CD process integration
- Handover template location

### Token Efficiency Targets
- Direct Linear creation (estimate savings)
- Atomic updates (estimate time saved)
- Pre-build Q&A (estimate scope creep prevention)

### Build Log
```
| Phase | Status | Notes |
| -- | -- | -- |
| 1-2 | ✅ Complete | [file1.py](link) + [file2.py](link); RA-008 & RA-010 cross-referenced |
| 3-6 | ✅ Complete | Phases built sequentially; autonomous_test_suite.py ready |
```

### Template Learnings (From This Build)
Include sections:
- **What worked (70%)**: Patterns to keep/reuse
- **What failed (30%)**: Issues found and fixes applied
- **Template updates needed** (for next RA)
- **Token efficiency scorecard** (savings vs. costs)
- **Highest-signal patterns** (best ROI on effort)

---

## Document Ownership Matrix (Add to Story)

```
| Document | Build Owner | Ops Owner | Update Cadence | Lock After |
| -- | -- | -- | -- | -- |
| System Architecture | Claude | — | Once | Phase 2 |
| Build Components | Claude | — | Atomic/component | Phase 6 |
| Story Retro | Claude→Agent | — | Per phase | Validation done |
| Agent Runbook | Claude | Ops team | Build→mutable | Phase 3 |
| Credential Matrix | Claude | DevOps | Build + quarterly | Never (rotates) |
```

---

## Validation Checklist (Before Code Submission)

- [ ] System Architecture is single source for code (no duplication)
- [ ] All other docs link to System Architecture, never paste code
- [ ] Build Components has tool rationale for each component
- [ ] No TBD GitHub links; use "Deployment Checkpoints" section instead
- [ ] Story Retro captures pre-build Q&A and assumptions
- [ ] Credential Scope Matrix visible upfront (if credential story)
- [ ] Handover docs flagged as "Phase 7+ only" (or removed if premature)
- [ ] Live docs use append-only pattern (dated sections, no patches)
- [ ] Token efficiency targets captured and tracked
- [ ] No duplication between documents (1 source per concept)

---

## Token Efficiency Scorecard Template

```
| Decision | Tokens Saved | Tokens Lost |
| -- | -- | -- |
| Direct Linear docs (no local) | +40 | — |
| Atomic Build Components | +30 | — |
| Pre-build Q&A | +20 | — |
| Duplication in code | — | -25 |
| Patch retries (stale content) | — | -15 |
| Early Handover doc | — | -10 |
| NET | +55 tokens | |
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Cost | Prevention |
| -- | -- | -- |
| Create local markdown, convert to Linear | +X tokens | LINEAR ONLY rule |
| Duplicate code in multiple docs | -25 tokens | System Architecture = source; link elsewhere |
| TBD GitHub links in status table | Stale perception | Use Deployment Checkpoints section |
| Patch operations on live docs | -15 tokens (retries) | Append-only or fetch-before-patch |
| Early Handover doc creation | -10 tokens (delete) | Phase 7+ only flag |
| No credential scope visibility | Discovery lag | Matrix upfront in story |
| Batch Build Components updates | Issue detection lag | Atomic per-component |
| Missing tool rationale | Consumer confusion | Justify in Build Components |

---

## Apply to Next RA Build

1. Use this template when creating new story
2. Enforce checklist before coding starts
3. Apply document strategy from first turn (no wasted commits)
4. Capture learnings in Story Retro Template Learnings section
5. Feed improvements back to this template
