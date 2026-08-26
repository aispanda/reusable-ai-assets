# LangGraph Visualization and Execution Mapping

## Purpose

Standardize graph architecture visualization and runtime observability for LangGraph workflows across development, debugging, and production review.

---

## 1. Option 1: Static Architecture Map (Design & Documentation)

Use static graph export during development, code reviews, and documentation generation. LangGraph exposes rendering methods directly on compiled graphs via `.get_graph()`.

### Code Implementation

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict

class AgentState(TypedDict):
    input: str
    output: str

# Define graph
builder = StateGraph(AgentState)
# ... add nodes and edges ...
graph = builder.compile()

# 1. Print Mermaid syntax (embed directly in Markdown)
mermaid_syntax = graph.get_graph().draw_mermaid()
print(mermaid_syntax)

# 2. Print ASCII representation (CLI/terminal friendly)
print(graph.get_graph().draw_ascii())

# 3. Save as PNG image (requires internet connection or mermaid.ink)
png_bytes = graph.get_graph().draw_mermaid_png(
    output_file_path="agent-orchestration.png"
)
```

### When to Use
- Pull Request descriptions and architecture review docs.
- CI/CD build artifacts to detect unauthorized topology mutations.
- Static READMEs and technical specifications without running an active server.

---

## 2. Option 2: Interactive Execution Map (LangGraph Studio & Debugging)

Use LangGraph Studio as the primary local development environment for live execution inspection, time-travel debugging, and failure replay.

### Setup & Installation

```bash
pip install -U langgraph "langgraph-cli[inmem]"
```

### Project Configuration (`langgraph.json`)

Create `langgraph.json` in the root of your project:

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent_orchestrator": "./agent_graph.py:graph"
  },
  "env": ".env"
}
```

### Launching the Studio

```bash
langgraph dev
```

This starts the local Agent Server and prints the Studio web interface URL (e.g., `http://localhost:2024` or LangSmith Studio connector).

### Key Studio Capabilities
- **Live Graph Stepping**: Watch node activations and state transitions in real time.
- **State Inspection**: Inspect graph state payload at each checkpoint without print statements.
- **Prompt Iteration**: Edit system prompts or node inputs directly inside the UI and re-run that specific step.
- **Time Travel & Failure Replay**: Select any historical checkpoint on a failed run, edit the state or parameters, and fork execution from that point forward.
- **Evaluation Dataset Export**: Convert failure cases or high-quality runs into LangSmith evaluation benchmark datasets.

---

## 3. Minimal Development Workflow

```text
Write StateGraph
  -> compile()
  -> draw_mermaid() (verify static topology)
  -> configure langgraph.json
  -> run `langgraph dev` (launch LangGraph Studio)
  -> inspect node state & traces interactively
  -> use checkpoints & time travel to debug & fork failures
```

---

## 4. Selection Matrix

| Need | Recommended Tool | Command / Method |
|---|---|---|
| Architecture review in PR / Docs | Static Mermaid / PNG | `graph.get_graph().draw_mermaid()` / `draw_mermaid_png()` |
| Terminal / headless verification | Static ASCII | `graph.get_graph().draw_ascii()` |
| Live debugging & state inspection | LangGraph Studio | `langgraph dev` |
| Failure diagnosis & state rewind | Studio Time Travel | Checkpoint rollback & branch execution |
| Production tracing & cost audit | LangSmith / Opik | Tracing environment variables (`LANGSMITH_TRACING=true`) |
