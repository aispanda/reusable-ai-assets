# AI Exchange

Use this folder only for bounded, dated execution handoffs between AI tools or agents.

## Naming

`YYYY-MM-DD_FROM_<ROLE>_TO_<ROLE>_<TASK>.md`

## Each exchange states

- mission and expected outcome;
- capability profile: filesystem/repository, terminal, web/external access and handback destination;
- absolute or project-relative files to read and authorized files to change;
- accepted decisions and source-of-truth documents;
- explicit do-not-change boundaries;
- acceptance criteria and verification evidence;
- escalation rule for discoveries outside scope; and
- concise handback location.

The receiving agent first verifies Git/deploy state against `docs/AI_HANDOVER.md`. If a required file is inaccessible, request that file only. Do not reconstruct missing evidence or request a full-folder dump.

Do not store secrets, duplicate product facts, or use an exchange file as permanent project law. Apply accepted results surgically to owning documents.
