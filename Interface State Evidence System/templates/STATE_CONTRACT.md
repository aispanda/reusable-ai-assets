# State Contract — `<surface>`

> Complete only the rows that apply. A state must be repeatable through a deterministic fixture or a documented, controlled manual procedure. Do not use live personal, customer, or production data as a fixture.

## Surface purpose

**User outcome:** `<one observable outcome>`

**Production implementation:** `<path>`

**Local fixture source:** `<path>`

**Access boundary:** `<allowed capability / restricted capability>`

## Data and lifecycle states

| State ID | Trigger / fixture input | Visible hierarchy and message | Available action / recovery | Focus and announcement | Evidence |
|---|---|---|---|---|---|
| `<surface>-initial` | `<fixture>` | `<what appears first>` | `<first action>` | `<focus/status>` | `<render>` |
| `<surface>-loading` | `<fixture>` | `<what is known and unknown>` | `<wait/cancel/continue>` | `<status>` | `<render/review>` |
| `<surface>-populated` | `<fixture>` | `<primary information>` | `<meaningful action>` | `<interaction>` | `<render/interaction>` |
| `<surface>-empty` | `<fixture>` | `<plain explanation>` | `<safe next action>` | `<focus/status>` | `<render>` |
| `<surface>-restricted` | `<fixture>` | `<what is unavailable without leaking detail>` | `<safe next action>` | `<focus/status>` | `<render/manual>` |
| `<surface>-recoverable-error` | `<fixture>` | `<clear issue and preserved context>` | `<retry/correct/cancel>` | `<focus/error status>` | `<interaction>` |
| `<surface>-success` | `<fixture>` | `<confirmed result and durable next state>` | `<next useful action>` | `<status>` | `<interaction/review>` |

## Interaction states

| Element / action | Default | Keyboard / pointer action | Result | Focus outcome | Fixture or test |
|---|---|---|---|---|---|
| `<control>` | `<state>` | `<keys or input>` | `<visible change>` | `<where focus goes>` | `<evidence>` |

## Environment and resilience states

| Condition | Expected transformation | Information or function preserved | Evidence |
|---|---|---|---|
| Compact width | `<layout change>` | `<what remains available>` | `<render/review>` |
| Long / localized / user-supplied text | `<wrapping/truncation/full-value rule>` | `<no hidden essential value>` | `<fixture/review>` |
| Text scaling / reflow | `<expected behavior>` | `<no loss of function>` | `<review>` |
| Theme / contrast mode | `<roles and state signal>` | `<meaning does not rely only on color>` | `<review/scan>` |
| Reduced motion | `<nonessential motion removed or reduced>` | `<same information>` | `<review>` |

## Exclusions and limitations

| Item | Reason / required separate evidence |
|---|---|
| `<out-of-scope state or proof>` | `<why this contract does not establish it>` |

## Completion check

- [ ] Each material state has a stable ID, fixture input, visible result, next action, and evidence.
- [ ] Restricted states disclose only what is safe and useful.
- [ ] Error states preserve useful input whenever appropriate and explain a recovery.
- [ ] Keyboard, focus, status, and error behavior are explicit for material controls.
- [ ] Environmental variations preserve the outcome rather than merely shrinking the layout.
- [ ] The evidence claim matches the evidence type and does not overstate what was proven.
