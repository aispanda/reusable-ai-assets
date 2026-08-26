# RA-008 - Multi-Agent Orchestration Knowledge Base

| Metadata | Value |
|---|---|
| Category | AI workflow / Architecture |
| Select when | Multi-Agent, Evaluator-Optimizer, LLM-as-a-Judge, CoT, Actor-Critic |
| Entry point | `KNOWLEDGE_BASE.md` |
| Status | Reusable v2.2; bounded supervisor-worker-reviewer delivery independently validated (6/6 cases; nonblocking notes) |

## Outcome

Establish the foundational engineering standard for choosing and governing risk-sensitive agent workflows, including independent review, role authority, loop limits, checkpoints and disagreement handling.

## Reuse boundary

- **Reusable core**: the architecture knowledge base, independent-review protocol and reviewer role/output templates.

## Transfer manifest

| Path | Role | Classification |
|---|---|---|
| `KNOWLEDGE_BASE.md` | The universal blueprint for multi-agent orchestration | Reusable core |
| `references/independent-review.md` | Fresh-context reviewer inputs, independence, evidence and verdict rules | Reusable core |
| `templates/BOUNDED_DELIVERY_CONTROL_BLOCK.template.md` | Bounded supervisor-worker-reviewer execution control block | Reusable core |
| `evaluations/bounded-delivery-evaluation-cases.md` | Six behavioral acceptance cases for bounded delivery | Verification asset |
| `references/langgraph-visualization-and-debugging.md` | LangGraph static architecture mapping and Studio interactive execution reference | Reusable core |
| `templates/REVIEWER_ROLE_CARD.template.md` | Bounded reusable reviewer definition | Reusable core |

## Related Implementations

| Asset | Connection | Scope |
|---|---|---|
| RA-013: Agent Linear API Integration | Concrete implementation of credential/access management enabling multi-agent patterns; demonstrates bounded delegation via GSM + GCP Logging for audit trails | Credential access, audit integration, autonomous agent execution |

## Inputs and outputs

- **Inputs**: Read access for AI engineers and agents.
- **Outputs**: Standardization of Evaluator-Optimizer workflows across all Antigravity projects.

## Use / transfer

Read `KNOWLEDGE_BASE.md` before designing a pipeline. Use `references/independent-review.md` and the role-card template whenever one agent checks another agent's work.

## Dependencies, cost and licensing

- **Dependencies**: None.
- **Cost**: $0 (Documentation only).

## Verification

Scoped Markdown, link, manifest, requirements, leakage and RA-003 strict-clean validation passed. One independent fresh-context reviewer passed all six bounded-delivery behavioral cases with nonblocking notes.

## Boundaries and limitations

This is a conceptual blueprint, not an executable approval system. Role prompts are policy aids; tool permissions, deterministic tests and human authority remain separate controls. A model-generated verdict cannot approve consequential release by itself.
