# PrairieClassroom OS — Pre-Development Starter Kit

This folder contains the minimum high-value project scaffolding that should exist before the first meaningful implementation sprint.

## What is included

- `AGENTS.md` — cross-agent project instructions for Codex and agent-compatible tooling
- `CLAUDE.md` — persistent Claude Code project memory and operating rules
- `.claude/agents/` — specialized Claude Code subagents
- `.claude/skills/` — reusable project skills/playbooks
- `docs/spec.md` — product and scope definition
- `docs/architecture.md` — target system architecture
- `docs/prompt-contracts.md` — prompt design and model-routing contracts
- `docs/data-contracts.md` — core schemas and storage expectations
- `docs/evals.md` — benchmark and acceptance framework
- `docs/safety-governance.md` — policy boundaries and guardrails
- `docs/sprint-0-checklist.md` — pre-build checklist for the first sprint
- `docs/decision-log.md` — lightweight ADR/decision register
- `.claude/settings.json` — conservative shared Claude Code settings

## Intended use

1. Read `docs/spec.md` first.
2. Read `docs/architecture.md` second.
3. Read `CLAUDE.md` before starting any coding session.
4. Use the subagents only when the task benefits from isolated context.
5. Keep `docs/decision-log.md` updated as the design evolves.

## Development principle

Build the smallest end-to-end system that proves a Gemma-4-native, local-first classroom complexity copilot is useful for teachers and EAs in Alberta classrooms.
