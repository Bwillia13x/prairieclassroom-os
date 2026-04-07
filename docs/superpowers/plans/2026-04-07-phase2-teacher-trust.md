# Phase 2: "Teacher Trust" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make teachers rely on the system day-over-day by adding output recall, language memory, draft persistence, multi-student messaging, and pending-action badges.

**Architecture:** New GET endpoints for history retrieval. New family_language field on student schema. sessionStorage form persistence hook. Multi-select student picker. Debt register lifted to AppContext for badges.

**Tech Stack:** Existing stack — no new dependencies.

**Spec:** docs/superpowers/specs/2026-04-07-teacher-friction-roadmap-design.md — Phase 2

## Tasks

Task 1: History backend (retrieve functions + GET endpoints + tests)
Task 2: Student-language schema + demo data
Task 3: Frontend history types, API, useHistory hook
Task 4: HistoryDrawer component
Task 5: Wire history into panels
Task 6: useFormPersistence hook + integration
Task 7: Multi-student message batching + auto-language
Task 8: Pending-action badges on tabs
Task 9: Integration verification
