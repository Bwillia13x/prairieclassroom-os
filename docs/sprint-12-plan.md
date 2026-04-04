# Sprint 12 Plan — Auth, Error Recovery, and Housekeeping

## Goal

Add classroom-code authentication, structured error recovery in the inference pipeline, WAL checkpoint management, dead file cleanup, and demo student dropdown fix.

## User story

As a teacher running this in a school, I want my classroom data protected by a classroom code — and when the system hits a model error, I want a clear message instead of a blank screen.

## Changes

### 1. Classroom code auth (`services/orchestrator/auth.ts`, `server.ts`)

Simple shared-secret model: each classroom profile gains an `access_code` field. API requests include `X-Classroom-Code` header. Middleware validates before route handlers. Demo mode (`?demo=true` / demo classroom) bypasses auth.

### 2. Auth UI (`apps/web/`)

Classroom code entry on first load. Store in sessionStorage. Attach to all API requests. Clear on classroom switch.

### 3. Inference error recovery (`services/orchestrator/server.ts`)

When inference returns unparseable output: return structured error with raw output in a disclosure field. UI can show "couldn't generate" + retry button.

### 4. SQLite WAL checkpoint (`services/memory/db.ts`)

Checkpoint on server startup + periodically. Prevents WAL files from growing unbounded.

### 5. Dead file cleanup

Remove `initial_roadmap.md` (0 bytes) and `system_overview.md` (0 bytes).

### 6. Demo student dropdown (`apps/web/src/App.tsx`)

Add demo classroom students to the student stubs so the intervention logger dropdown works during demos.

## Eval impact

3 new eval cases: auth-001 (unauthorized), auth-002 (wrong code), error-001 (structured error on parse failure).
