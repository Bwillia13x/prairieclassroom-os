# PrairieClassroom OS — Architecture

## System thesis

Use Gemma 4 as the reasoning-and-orchestration substrate for a classroom operating layer.

## Core architecture

### 1. Input layer
Handles:
- worksheet/photo upload
- PDF page images
- typed teacher notes
- voice notes
- classroom memory retrieval context

### 2. Orchestration layer
Responsible for:
- task classification
- model routing
- prompt contract selection
- retrieval injection
- structured output validation
- tool-call execution

### 3. Model layer
Two-speed design:

- **Live route** — small Gemma 4 model for low-latency classroom assistance
- **Planning route** — larger Gemma 4 model for next-day planning and synthesis

### 4. Memory layer
Stores and retrieves:
- student support notes
- successful scaffolds
- intervention history
- family communication preferences
- class routines

### 5. Tool layer
Initial tools:
- `differentiate_material`
- `prepare_tomorrow_plan`
- `draft_family_message`
- `log_intervention`
- `generate_visual_support`

### 6. Safety layer
Enforces:
- no diagnosis
- no discipline scoring
- no external send without approval
- observation/inference separation
- auditability of outward-facing outputs

## Canonical MVP flow

1. Input artifact arrives.
2. Orchestrator classifies task.
3. Relevant classroom memory is retrieved.
4. Gemma route is selected.
5. Structured output is generated.
6. Optional tool action is executed.
7. Teacher reviews and approves.
8. Output and interaction are persisted.

## What to keep modular from day one

- prompt contracts
- tool schemas
- output validators
- retrieval adapters
- model-routing logic

## What not to overbuild yet

- multi-school dashboards
- external system integrations
- analytics warehouse
- fully automated workflow chains
