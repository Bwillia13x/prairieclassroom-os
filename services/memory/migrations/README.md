# Database Migrations

Lightweight SQLite migration framework for PrairieClassroom OS per-classroom databases.

## Convention

- Migrations live in this directory as numbered SQL files: `NNN_description.sql`
- Numbering is zero-padded to three digits: `001_`, `002_`, `003_`, etc.
- Each file runs exactly once per database, tracked in a `_migrations` table.
- Migrations execute inside a transaction -- if any statement fails, the entire migration rolls back.
- Files are applied in numeric order. Never renumber or reorder existing migrations.

## Adding a new migration

1. Create `NNN_short_description.sql` with the next available number.
2. Write standard SQLite SQL. Multiple statements per file are fine.
3. Use `IF NOT EXISTS` / `IF EXISTS` when the migration must tolerate partial prior state.
4. Run `npm run test` to verify the migration applies cleanly.

## Existing migrations

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | 8 tables + 8 indexes extracted from the original inline `db.ts` setup |
