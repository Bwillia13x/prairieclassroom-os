# Safety and Governance

## Operating principle

PrairieClassroom OS supports classroom adults. It does not replace judgment, diagnose students, or automate punitive decisions.

## Hard rules

- Do not diagnose or imply diagnosis.
- Do not generate discipline scores or behavioral risk labels.
- Do not send family communication without explicit human approval.
- Do not present inference as observation.
- Do not expose sensitive classroom notes unnecessarily.

## Output policy

### Allowed
- lesson differentiation
- support planning
- plain-language communication drafts
- intervention logging
- retrieval-grounded summaries

### Restricted
- anything that sounds medical, clinical, or disciplinary
- high-confidence claims unsupported by current context
- parent messaging that bypasses teacher review

## Logging expectations

For any outward-facing draft or structured action, preserve:
- source prompt class
- model route used
- tool calls made
- approval status
- timestamp

## Review triggers

Require a safety review when:
- a new tool is introduced
- classroom images are used in a new way
- parent messaging behavior changes
- a feature begins to infer student state
