---
name: gemma-routing
description: Use this skill when designing or revising model-routing logic, prompt classes, or latency/quality tradeoffs.
---
# Gemma Routing Skill

Use this skill when a task touches:
- selection between small and large Gemma 4 variants
- thinking mode
- multimodal prompt handling
- tool-calling vs plain generation
- latency tradeoffs in live classroom use

## Required output

When invoked, produce:
1. task class
2. recommended model size/tier
3. whether thinking should be enabled
4. expected input modalities
5. required structured output schema
6. fallback if the preferred route is unavailable

## Project defaults

- Live classroom assistance should prefer smaller models.
- Next-day or weekly synthesis can use larger models.
- Thinking mode is opt-in, not default.
- Any route that feeds tool execution should use structured outputs.
