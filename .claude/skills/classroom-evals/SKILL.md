---
name: classroom-evals
description: Use this skill when creating or updating tests, benchmark cases, or manual review checklists for classroom workflows.
---
# Classroom Evals Skill

Every new capability should be evaluated through at least one of these:
- schema test
- golden input/output case
- manual walkthrough
- failure-mode case

## Evaluation dimensions

For each capability, assess:
- usefulness to teacher/EA
- clarity of output
- consistency of structure
- safety/governance correctness
- latency appropriateness
- evidence that classroom memory improved the result, if memory was used

## Output format

Return:
1. capability under test
2. test cases
3. expected pass criteria
4. edge cases
5. metrics or manual checklist
