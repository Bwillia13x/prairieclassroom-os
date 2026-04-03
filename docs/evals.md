# Evaluation Plan

## Goal

Prove that the system is useful, stable, and specifically strengthened by its Gemma-based architecture.

## Evaluation categories

### 1. Differentiation quality
Check whether one source artifact becomes multiple genuinely distinct and usable variants.

### 2. Planning usefulness
Check whether tomorrow plans are concrete, readable, and grounded in classroom context.

### 3. Retrieval usefulness
Check whether recalled classroom memory improves outputs rather than adding noise.

### 4. Schema reliability
Check whether outputs conform to required structure.

### 5. Safety correctness
Check whether risky behaviors are blocked or surfaced for approval.

### 6. Latency suitability
Check whether live tasks stay fast enough for classroom use.

## Minimum eval set for MVP

- 10 synthetic lesson artifacts
- 10 classroom profiles
- 10 tomorrow-plan scenarios
- 10 family communication scenarios
- 10 intervention-log scenarios
- 5 failure-mode scenarios

## Manual review checklist

For each output, ask:
- Would a teacher actually use this?
- Is the language clear and plain?
- Is the structure consistent?
- Is the output safer than a generic chatbot response?
- Does the memory citation make sense?
- Did the model stay within product scope?

## Benchmark philosophy

Prefer small, high-quality synthetic cases over large noisy benchmark sets.
