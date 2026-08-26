---
name: draft-source-grounded-legal-documents
description: Draft, revise, merge, or finalize legal agreements, memoranda, deeds, settlement documents, submissions, and related instruments from user-supplied drafts, directives, templates, evidence, or checklists. Use when legal drafting must remain source-locked, preserve supplied facts and scope, verify current law from authoritative sources, reconcile conflicting instructions or outdated citations, strengthen enforceability, create a clean or redline document, and keep source files unchanged unless the user expressly authorizes edits.
---

# Draft Source-Grounded Legal Documents

Produce an execution-ready working draft without inventing facts or silently converting an agreement into something legally different.

## Core workflow

1. Ground every supplied file before drafting. Classify it as `instruction`, `factual source`, `legal source`, `structural template`, `prior draft`, or `helpful but non-authoritative material`.
2. Preserve the source files. Create a new document in the source folder unless the user expressly authorizes an in-place edit.
3. Keep an in-memory coverage map: requirement, authority, destination, and status. Do not serialize matter facts into this skill.
4. Apply this authority order unless the user directs otherwise:
   - explicit current user instructions for scope and output;
   - verified current law for legal accuracy and mandatory formalities;
   - designated factual sources for names, dates, amounts, dimensions, ratios, entities, and events;
   - designated template or prior draft for structure and existing negotiated terms;
   - generic drafting convention only where the governing sources are silent and the addition does not expand the bargain.
5. Read [references/source-authority-and-conflicts.md](references/source-authority-and-conflicts.md) when sources conflict, contain a statutory error, or omit a fact needed for execution.
6. Research only issues that affect validity, enforceability, current-law accuracy, limitation, filing, registration, tax treatment, third-party release, or the user's requested conclusion. Prefer legislation, courts, regulators, and other primary official sources. Record the source and access date.
7. Draft once to the requested final shape. Use plain, precise clauses; defined triggers; objective conditions; explicit allocation formulas; workable completion mechanics; and clear remedies. Preserve requested terms and omit unrequested deal terms.
8. Run every gate in [references/legal-drafting-gates.md](references/legal-drafting-gates.md). Repair contradictions before polishing prose.
9. Use the installed source-verification, persuasive-legal-writing, opposing-counsel, Google Drive/Docs, DOCX, or PDF skills when their trigger conditions apply. Follow their artifact-specific verification workflows.
10. Reconcile the coverage map, verify the final artifact and placement, and confirm the source files remain unchanged.

## Source lock

- Do not invent or normalize a name, party, entity, address, date, amount, percentage, area, identifier, account, asset, event, quotation, or legal citation.
- Retain a precise blank, bracketed field, or `TBD - source required` when the source lacks an execution fact.
- Distinguish contractual choices from statements of law. Verify legal propositions before relying on them.
- Quote only exact source text. Label paraphrases as paraphrases in analysis or review notes.
- Do not import facts from a precedent merely because its clause structure is useful.

## Conflict rule

Never copy a known statutory error merely because a directive names it. Verify the current title, year, commencement, repeal, savings, and material provision. Use the current law in the draft, preserve any still-applicable repealed law through accurate savings language, and disclose the correction succinctly at handoff.

If mandatory law conflicts with a requested commercial term, stop short of presenting the term as valid. Draft the nearest supported formulation or mark it for counsel decision.

## Drafting boundary

Do not add confidentiality, non-compete, non-solicit, releases, guarantees, indemnities, waivers, governing-law changes, forum changes, new parties, new assets, or new economics unless the sources or user require them. Add only provisions necessary to implement an authorized term or mandatory law; identify consequential additions in the handoff.

## Artifact handling

- Treat a supplied native template as structural authority and preserve its topology through the relevant document skill.
- For a content-only source, create a separate clean draft using the requested destination format.
- When working in Drive, place the new artifact in the supplied folder and verify membership by readback.
- Use revision controls before writing and never overwrite a source merely for convenience.
- Render or export final documents and inspect all pages when the available document skill requires visual QA. If rendering is unavailable, disclose that limitation.

## Completion report

Return only:

1. the new artifact link or file;
2. material legal or structural corrections;
3. verification performed;
4. facts, documents, approvals, or professional decisions still required; and
5. authoritative sources actually checked when research occurred.

Do not describe a draft as legal advice or ready for signature when essential facts, title records, third-party consents, tax advice, valuations, registrations, or mandatory formalities remain unverified.
