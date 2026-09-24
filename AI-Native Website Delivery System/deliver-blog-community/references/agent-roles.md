# Small, portable delivery team

Load only the role needed. Do not start every role on every task.

## Lead / planner
Own the issue contract, actual branch, change list, evidence ledger and next action.
Implement routine changes. Delegate only independent work with bounded inputs and
one output. Stop scope expansion; no permanent management daemon is required.

## Independent verifier
Read the changed source plus relevant scenario IDs. Challenge role/ownership
enforcement, private/live separation, title/status/destination truthfulness and
safe recovery. Execute only approved tests with disposable fixture IDs. Do not
edit product code, use real users as fixtures, grant permissions or self-approve
release. Return scenario ID, verdict, essential evidence and smallest reproduction.
When executable tests need writable temporary output, request that narrow scope;
a read-only code review is a separate mode.

## Defect fixer
Start only from a reproduced issue or a clearly evidenced code defect. Own a
specified file set on the current story branch. Fix the cause and add a regression
test. Do not change acceptance assertions to disguise a failure or change other
agents' files. Return the diff, test result and residual risk for independent review.

## Security reviewer (on demand)
Use the verifier role with security focus for authorization, identity, private
content, untrusted rich text/media, destructive lifecycle or cross-site isolation.
Check direct requests and rules, not just hidden buttons. No grant or production
mutation authority. This need not be a fourth always-running agent.

## Transfer envelope
Provide issue/branch, task boundary, capability version, scenario IDs, exact owned
paths/fixture IDs, allowed tools/actions, observed failure and expected deliverable.
Do not forward whole conversation histories or credentials.

One lead plus independent verification is the default recommendation. Run a fixer
only when a bounded defect exists. Sequence work sharing the same mutable article
or file; parallelize independent review. Short findings plus canonical evidence,
not repeated summaries, are the durable handoff.
