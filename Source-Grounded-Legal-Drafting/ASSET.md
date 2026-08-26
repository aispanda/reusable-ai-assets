# RA-012 - Source-Grounded Legal Drafting

| Metadata | Value |
|---|---|
| Category | Legal drafting / AI workflow |
| Select when | draft or revise a legal document from supplied drafts, directives, evidence, templates or current-law research |
| Entry point | [`draft-source-grounded-legal-documents/SKILL.md`](draft-source-grounded-legal-documents/SKILL.md) |
| Status | Reusable v0.1; validation, privacy scan and three fictional evaluations passed |

## Outcome

Create a new, source-locked legal document that preserves the authorized bargain, verifies current law, exposes missing execution facts and leaves source artifacts unchanged.

## Reuse boundary

The reusable core is the source-authority hierarchy, research gate, legal-drafting checks, artifact-preservation workflow and completion report. Matter facts, private evidence, client terminology, negotiated choices and legal advice remain project-specific and must never enter this asset.

## Transfer manifest

- `draft-source-grounded-legal-documents/SKILL.md` - reusable core workflow.
- `draft-source-grounded-legal-documents/references/source-authority-and-conflicts.md` - reusable conflict and missing-fact rules.
- `draft-source-grounded-legal-documents/references/legal-drafting-gates.md` - reusable quality gates.
- `draft-source-grounded-legal-documents/references/evaluation-cases.md` - fictional evaluation inputs and pass criteria.
- `draft-source-grounded-legal-documents/agents/openai.yaml` - reusable Codex interface metadata.
- Matter files, research logs, generated documents, render output and personal data - excluded project evidence/output.

## Inputs and outputs

Inputs are user-authorized source materials, instructions, destination and current official law actually accessed. Output is a new clean or redline legal document plus a concise verification and unresolved-items handoff. Source materials remain authoritative and unchanged unless the user expressly authorizes edits.

## Use / transfer

Install or link the skill folder in a Codex skills directory, then invoke `$draft-source-grounded-legal-documents` with the source files, their roles and the requested destination.

## Dependencies, cost and licensing

No bundled runtime code or third-party text. The workflow may use available document, Drive, browser and legal-verification skills; connector and research costs depend on the host environment. External source terms remain applicable.

## Verification

- Skill-creator `quick_validate.py`: passed on 2026-08-11.
- RA-003 `validate_asset.py --strict-clean` with a project-owned privacy policy: passed on 2026-08-11.
- Matter-name and personal machine-path scan: passed with no matches on 2026-08-11.
- Three fictional evaluation gates (property-backed retirement, lease amendment and shareholder settlement): passed on 2026-08-11.

## Boundaries and limitations

The skill does not provide legal advice, choose material commercial terms, invent facts, guarantee enforceability, replace jurisdiction-qualified counsel or certify execution readiness without the required facts, consents, valuations, registrations and professional review.
