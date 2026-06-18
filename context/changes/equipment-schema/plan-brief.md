# Equipment Config Schema — Plan Brief

> Full plan: `context/changes/equipment-schema/plan.md`

## What & Why

Create the `equipment_configs` table in Supabase with row-level security so each user's data is isolated at the database layer. This is F-01 — the only prerequisite for S-01 (dumbbell calculator), S-02 (edit/delete), and S-03 (extended equipment types). Without this table, no product feature can persist data.

## Starting Point

The Supabase SSR client is configured (`src/lib/supabase.ts`) and auth is fully working, but there are no migrations, no `supabase/migrations/` directory, and no TypeScript database types. The `supabase/seed.sql` path is referenced in `config.toml` but the file doesn't exist yet.

## Desired End State

Local and remote Supabase both have `equipment_configs` with 4 RLS policies enforcing per-user access. `src/types/database.types.ts` exists and `src/lib/supabase.ts` uses the `Database` generic. A seed template in `supabase/seed.sql` lets the developer populate local data with two example dumbbell configs.

## Key Decisions Made

| Decision                | Choice                                       | Why (1 sentence)                                                                              | Source |
| ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| `equipment_type` column | Add now (default `'dumbbell'`)               | S-03 can reuse the table without a schema migration                                           | Plan   |
| Delete model            | Hard delete                                  | No undo/history requirement in PRD; simpler queries                                           | Plan   |
| Numeric constraints     | CHECK `>= 0` on all three numeric fields     | Defence in depth — weight calculation must be arithmetically correct (PRD guardrail)          | Plan   |
| TypeScript types        | Generate via `supabase gen types typescript` | Standard Supabase pattern; CLI already a dev dep                                              | Plan   |
| Name uniqueness         | UNIQUE(user_id, name)                        | Prevents silent duplicate configs at DB layer                                                 | Plan   |
| Seed data               | Commented-out template with placeholder UUID | `config.toml` already references `seed.sql`; removes empty-state friction during S-01 UI work | Plan   |

## Scope

**In scope:**

- `supabase/migrations/20260615000000_create_equipment_configs.sql` — table + trigger + 4 RLS policies
- `src/types/database.types.ts` — generated from local schema
- `src/lib/supabase.ts` — typed with `Database` generic
- `supabase/seed.sql` — commented-out dev seed template
- Remote deployment via `supabase db push`

**Out of scope:**

- API routes or UI components (S-01)
- Real auth users created in seed (placeholder UUID approach)
- Soft delete / `deleted_at` column

## Architecture / Approach

Standard Supabase migration-first flow. One SQL file defines the entire schema change; `supabase db reset` applies it locally; `supabase gen types` syncs TypeScript; `supabase db push` deploys to remote. RLS is the only mechanism for user data isolation — no application-layer filtering needed.

## Phases at a Glance

| Phase                         | What it delivers                                           | Key risk                                                     |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| 1. Local Supabase + migration | Running local DB with `equipment_configs` + RLS verified   | `supabase start` requires Docker to be running               |
| 2. TypeScript types           | Typed Supabase client; `Database` generic in `supabase.ts` | Type gen fails if local Supabase is not running              |
| 3. Seed data                  | `supabase/seed.sql` template ready to activate             | Seed requires signing up locally first to get a real UUID    |
| 4. Remote deployment          | Production DB has `equipment_configs` + RLS                | `supabase link` needs the remote project ref and DB password |

**Prerequisites:** Docker running (for local Supabase), remote Supabase project credentials, remote project ref from dashboard URL
**Estimated effort:** ~1 session across 4 phases

## Open Risks & Assumptions

- Docker must be running for `supabase start` — not verified in this plan
- Remote project ref and DB password must be available for Phase 4
- `supabase gen types` output format may differ slightly between CLI versions; generated file should not be edited manually

## Success Criteria (Summary)

- `supabase db push` exits 0 and remote dashboard shows `equipment_configs` with 4 RLS policies
- `npm run lint` passes with `Database` generic in `supabase.ts`
- Anonymous SQL query against `equipment_configs` returns 0 rows (RLS enforced)
