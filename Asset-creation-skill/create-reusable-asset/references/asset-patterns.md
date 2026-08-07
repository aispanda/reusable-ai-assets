# Asset patterns

Load only the selected pattern.

| Pattern | Reusable core | Replaceable profile | Risk | Minimum proof |
|---|---|---|---|---|
| Code or automation | Source, parameterized launcher, config schema, tests, licence | Project config, credentials reference, acceptance values | High when executing code; critical when changing external state | Clean install/build/test plus one consumer invocation |
| Process or template | Checklist/template, decision gates, example, completion criteria | Project roles, terminology, owning-doc links | Medium; instructions may cause consequential actions | Apply once to a different scenario and inspect output |
| Reference or mapping | Stable taxonomy, source links, refresh rule, machine-readable form where useful | Project choices and interpretations | Low unless sensitive or legally consequential | Link/source validation and one lookup/use test |
| Use-case data-model starter | Modelling method, DBML/dictionary conventions, validators, ERD workflow | Domain starter plus project schema/profile | Medium; incorrect assumptions can harden into schema | Parse/relationship validation and a second-use-case adaptation |
| AI skill | `SKILL.md`, only necessary scripts/references/assets, `agents/openai.yaml` | Tool-specific installation/link | Medium; high when scripts/tools execute | Standard validation plus three realistic evaluations |

For mixed assets, choose one primary pattern and link supporting components rather than creating overlapping assets.

Require explicit human approval for deletion, deployment, publication, spending, credential access, customer-data movement, or other external state changes regardless of pattern.
