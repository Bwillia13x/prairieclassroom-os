# Prompt Contracts

## Purpose

Every major model interaction should be treated as a versioned contract, not an ad hoc prompt.

## Current prompt classes

### A. Differentiate material
Input:
- artifact text and/or image
- classroom profile summary
- target variants

Output:
- structured list of lesson variants

### B. Tomorrow plan
Input:
- today note
- upcoming artifact(s)
- classroom memory summary

Output:
- transition watchpoints
- student support priorities
- EA plan
- recommended prep items

### C. Family message
Input:
- classroom event or missed work summary
- tone class
- target language

Output:
- plain-language family note
- optional simplified student-facing summary

### D. Intervention log
Input:
- teacher note
- tagged student(s)
- action taken

Output:
- structured intervention record

## Prompt design rules

- Separate task instructions from project policy.
- Keep structured outputs explicit.
- Do not bury critical schema requirements in prose.
- Prefer short, stable instructions plus injected context.
- Include disallowed behavior where safety matters.

## Thinking mode policy

Use only for:
- tomorrow planning
- ambiguous multimodal synthesis
- hard tradeoff reasoning

Avoid for:
- simple message drafting
- routine variant formatting
- low-stakes transformations

## Routing template

For every prompt class, document:
- route name
- preferred model tier
- thinking on/off
- retrieval required yes/no
- tool-call capable yes/no
- output schema version
