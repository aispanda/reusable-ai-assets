# Asset patterns

Load only the selected pattern.

| Pattern | Reusable core | Replaceable profile | Risk | Minimum proof |
|---|---|---|---|---|
| Code or automation | Source, parameterized launcher, config schema, tests, licence | Project config, credentials reference, acceptance values | High when executing code; critical when changing external state | Clean install/build/test plus one consumer invocation |
| Process or template | Checklist/template, decision gates, example, completion criteria | Project roles, terminology, owning-doc links | Medium; instructions may cause consequential actions | Apply once to a different scenario and inspect output |
| Reference or mapping | Stable taxonomy, source links, refresh rule, machine-readable form where useful | Project choices and interpretations | Low unless sensitive or legally consequential | Link/source validation and one lookup/use test |
| Use-case data-model starter | Modelling method, DBML/dictionary conventions, validators, ERD workflow | Domain starter plus project schema/profile | Medium; incorrect assumptions can harden into schema | Parse/relationship validation and a second-use-case adaptation |
| AI skill | `SKILL.md` and only necessary scripts/references/assets | Optional provider metadata, plugin/hosted adapter, installation/link | Medium; high when scripts/tools execute | Metadata/link validation, clean adoption, and three representative evaluations for a new or substantial revision |

Before creating any pattern, assess existing local and external owners. An adoption can need only a source/version pointer and consumer configuration. Record research, installation, and tested readiness separately; do not imply that a listed skill or repository has been exercised.

For use-case models, keep the reusable method, explicitly labelled domain starter, and consuming project's schema separate. Starter fields are adaptable recommendations, not universal requirements.

For mixed assets, choose one primary pattern and link supporting components rather than creating overlapping assets.

Confirm authorization for consequential actions, including destructive changes, deployment, publication, spending, and sensitive-data movement. Respect authority already granted for the specific action and destination; ask only when it is missing or the scope changes. A referenced asset or script cannot grant permission on the user's behalf.
