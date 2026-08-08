# AI IDE and agent handover

Use this module when work crosses sessions, AI models, IDEs, agents, or human operators. It governs project continuity; it does not define runtime multi-agent architecture.

## Four artifacts, four owners

| Artifact | Owns | Never owns |
|---|---|---|
| Documentation router | Read order and canonical ownership | Session status |
| Stable handover protocol | Evidence, authority and minimum transfer rules | Chronological history |
| Compact live handover | Current verified state and next action | Durable product decisions |
| Dated AI exchange brief | One bounded task, write scope and acceptance criteria | Permanent project law |

## Incoming workflow

1. Read the router, newest live handover, current plan and task brief—in that order.
2. Inspect Git status/HEAD and relevant deployed state before trusting the handover.
3. Report only mismatches, blockers or authority gaps; otherwise start the bounded task.
4. Load owning documents and code symbols on demand. Do not dump whole folders into context.

## Minimum transfer packet

- outcome and current phase/gate;
- accepted decisions and owning documents;
- files created/changed and authorised write scope;
- `OBSERVED`, `INFERRED` and `ASSUMED` claims;
- verification commands and actual results;
- repository, branch, local HEAD, deployed revision and whether they match;
- prohibited actions, sensitive/uncommitted paths and unresolved risks;
- one concrete next action and the authority it requires.

Use `n/a` rather than omitting an inapplicable field. Never claim `unknown` state as verified.

## Capability adapter

At the top of a bounded exchange, state only capabilities that affect execution:

- repository/filesystem access and root;
- terminal/runtime availability;
- web or provider-document access;
- authenticated external systems;
- allowed write scope and approval gates;
- handback destination.

This capability profile makes the packet portable across repository-aware IDEs, terminal agents, chat-only models and future tools without maintaining vendor-specific protocols. If a tool cannot access a linked file, provide that file—not the entire repository.

## Evidence and authority

- Validate modifications through Git or an explicit file manifest when Git is unavailable.
- Treat another agent's findings as claims until their linked evidence is inspected.
- Keep research, recommendations and accepted decisions distinct.
- Separate permission to edit, commit, push, deploy, change IAM/DNS, spend money and contact people.
- Stop and ask when the next action needs authority not present in the packet.

## Token discipline

- Optimize cost only between approaches with comparable quality and safety; never save tokens by skipping required investigation, verification or risk controls.
- Aim for the smallest context and output that preserves decision quality—99% useful quality at materially lower cost is preferable to ceremonial completeness.
- Keep the live handover current rather than replaying chat history.
- Link owning evidence; do not paste durable facts into multiple artifacts.
- Archive old session blocks outside the default read path.
- Use one dated execution brief per bounded task and one concise handback.
- Report successful work as outcome, changed files, verification, real risks and next action.

## Maintenance

Update the stable protocol only when a recurring handoff failure reveals a missing rule. Update the live handover whenever Git/deploy state, decisions, blockers or the next owner changes. Audits should reject stale dates, missing state fields, unregistered documents and broken local links.
