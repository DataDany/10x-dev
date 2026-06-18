# Equipment Config Schema Implementation Plan

## Overview

Create the `equipment_configs` table in Supabase with row-level security, generate TypeScript types, and set up local seed data. This is F-01 — the foundational schema that unlocks S-01 (dumbbell calculator), S-02 (edit/delete), and S-03 (extended equipment types).

## Current State Analysis

The Supabase integration is partially initialized:

- `src/lib/supabase.ts` — SSR client configured, no generic `Database` type parameter
- `supabase/config.toml` — local dev config ready; `schema_paths = []` (no migrations yet)
- `supabase/seed.sql` — referenced in `config.toml:63` but does not exist
- No `supabase/migrations/` directory exists
- No TypeScript database types file
- Auth is fully working; `equipment_configs` will be the first product table

## Desired End State

After this change:

- `supabase/migrations/<timestamp>_create_equipment_configs.sql` defines the table, RLS policies, and `updated_at` trigger
- Local and remote Supabase both have the `equipment_configs` table
- `src/types/database.types.ts` contains generated types derived from the local schema
- `src/lib/supabase.ts` is typed with the `Database` generic
- `supabase/seed.sql` provides a ready-to-activate template for local dev data

### Key Discoveries:

- `supabase/config.toml:63` — `sql_paths = ["./seed.sql"]` already set; creating `seed.sql` activates seeding on `db reset`
- `src/lib/supabase.ts` — `createServerClient` accepts a `Database` generic enabling typed query results across all callers
- `supabase` CLI v2.106.0 is already a dev dependency; `supabase gen types typescript --local` is ready to use
- Remote project is not yet linked (`supabase link` step required in Phase 4)

## What We're NOT Doing

- No API routes or UI components — those are S-01
- No real auth users inserted via `supabase.auth.admin` in the seed — placeholder UUID approach instead
- No `deleted_at` soft-delete column — hard delete per decision
- No service-role RLS bypass policies — not needed for this client-side app

## Implementation Approach

Standard Supabase migration-first flow: write SQL migration → apply locally → generate TypeScript types → write seed template → push migration to remote.

## Critical Implementation Details

**Seed data and auth:** `supabase/seed.sql` runs after migrations on `db reset`, but `user_id` must reference a real `auth.users` row. The seed file ships with the INSERT commented out and a `<YOUR_USER_UUID>` placeholder. The developer signs up locally, copies their UUID from Studio (Authentication → Users), uncomments the INSERT, and re-runs `supabase db reset`.

**Type regeneration:** After any future schema change, re-run `supabase gen types typescript --local > src/types/database.types.ts` and commit the updated file.

---

## Phase 1: Local Supabase and migration

### Overview

Start the local Supabase Docker stack, create the migration SQL file, and apply it. The goal is a running local DB with `equipment_configs` + RLS verified in Studio.

### Changes Required:

#### 1. Start local Supabase

**File**: none (shell command)

**Intent**: Boot the local Docker-based Supabase stack so migrations can be applied.

**Contract**: `supabase start` — outputs local API URL, anon key, and Studio URL (`http://localhost:54323`). If already running, this is a no-op.

#### 2. Create migration file

**File**: `supabase/migrations/20260615000000_create_equipment_configs.sql`

**Intent**: Define the `equipment_configs` table with per-user isolation enforced at the database layer.

**Contract**: The migration creates the table, `updated_at` trigger, and four RLS policies (SELECT / INSERT / UPDATE / DELETE — each scoped to `auth.uid() = user_id`).

```sql
-- Table definition
CREATE TABLE public.equipment_configs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  equipment_type   TEXT        NOT NULL DEFAULT 'dumbbell',
  handle_weight    NUMERIC(8,2) NOT NULL CHECK (handle_weight >= 0),
  plate_weight     NUMERIC(8,2) NOT NULL CHECK (plate_weight >= 0),
  plate_count      INTEGER      NOT NULL CHECK (plate_count >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_configs_set_updated_at
  BEFORE UPDATE ON public.equipment_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row-level security
ALTER TABLE public.equipment_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_configs_select_own" ON public.equipment_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "equipment_configs_insert_own" ON public.equipment_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_configs_update_own" ON public.equipment_configs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_configs_delete_own" ON public.equipment_configs
  FOR DELETE USING (auth.uid() = user_id);
```

#### 3. Apply migration locally

**File**: none (shell command)

**Intent**: Reset the local DB so all migrations (including the new one) are applied in order.

**Contract**: `supabase db reset` — drops and recreates the local DB, runs all files in `supabase/migrations/` in filename order.

### Success Criteria:

#### Automated Verification:

- `supabase db reset` exits 0

#### Manual Verification:

- Studio at http://localhost:54323 → Table Editor → `equipment_configs` table exists with correct columns
- Studio → Authentication → Policies → 4 policies on `equipment_configs` (select / insert / update / delete)
- Studio → SQL Editor: `SELECT * FROM equipment_configs;` as anonymous returns 0 rows (RLS blocks it)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: TypeScript types

### Overview

Generate database types from the local schema and update the Supabase client to use the `Database` generic, giving TypeScript full awareness of `equipment_configs` across the codebase.

### Changes Required:

#### 1. Generate types file

**File**: `src/types/database.types.ts` (new file, generated — do not edit manually)

**Intent**: Create a TypeScript representation of the Supabase schema so callers get typed query results without manual interface maintenance.

**Contract**: Run `supabase gen types typescript --local > src/types/database.types.ts`. The output is a `Database` interface with a `public.Tables.equipment_configs` entry containing `Row`, `Insert`, and `Update` subtypes.

#### 2. Update Supabase client with Database generic

**File**: `src/lib/supabase.ts`

**Intent**: Thread the `Database` generic through `createServerClient` so all callers receive typed Supabase query results.

**Contract**: Add `import type { Database } from "@/types/database.types"` and change `createServerClient(...)` to `createServerClient<Database>(...)`.

### Success Criteria:

#### Automated Verification:

- `npx astro sync && npm run lint` passes with no new errors

#### Manual Verification:

- In any `.ts` file, importing `Database` from `@/types/database.types` and hovering over `Database['public']['Tables']['equipment_configs']['Row']` shows the correct fields in IDE

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human before proceeding to the next phase.

---

## Phase 3: Seed data

### Overview

Create `supabase/seed.sql` with a commented-out template so the developer can populate the local DB with example configs during S-01 UI work.

### Changes Required:

#### 1. Create seed.sql

**File**: `supabase/seed.sql`

**Intent**: Provide a ready-to-activate seed template that eliminates the "empty state on every db reset" friction during S-01 UI development.

**Contract**: File content — all INSERT lines commented out with a `<YOUR_USER_UUID>` placeholder and step-by-step instructions:

```sql
-- Seed example equipment configs for local development.
--
-- Steps to activate:
--   1. Run the app:  npm run dev
--   2. Sign up at:   http://localhost:3000/auth/signup
--   3. Open Studio:  http://localhost:54323
--   4. Go to:        Authentication → Users → copy your UUID
--   5. Replace <YOUR_USER_UUID> below with your actual UUID
--   6. Uncomment the INSERT and run: supabase db reset
--
-- INSERT INTO public.equipment_configs (user_id, name, equipment_type, handle_weight, plate_weight, plate_count)
-- VALUES
--   ('<YOUR_USER_UUID>', 'Left dumbbell',  'dumbbell', 2.5, 1.25, 4),
--   ('<YOUR_USER_UUID>', 'Right dumbbell', 'dumbbell', 2.5, 1.25, 4);
```

### Success Criteria:

#### Automated Verification:

- `supabase db reset` exits 0 with `seed.sql` present (valid SQL even when all lines are comments)

#### Manual Verification:

- After following the seed instructions, 2 configs appear in Studio → Table Editor → `equipment_configs`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human before proceeding to the next phase.

---

## Phase 4: Remote deployment

### Overview

Link the local project to the remote Supabase project and push the migration so production has the `equipment_configs` table before S-01 ships.

### Changes Required:

#### 1. Link to remote project

**File**: none (shell command; writes `.supabase/` config locally)

**Intent**: Associate the Supabase CLI with the remote project so `db push` knows where to deploy.

**Contract**: `supabase link --project-ref <project-ref>` — find `<project-ref>` in the remote dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`. You will be prompted for the database password.

#### 2. Push migration to remote

**File**: none (shell command)

**Intent**: Apply all pending migrations to the production database.

**Contract**: `supabase db push` — applies `20260615000000_create_equipment_configs.sql` to the remote project. This is irreversible without a rollback migration; the table can be dropped via `DROP TABLE public.equipment_configs CASCADE` if needed before S-01 ships any data.

### Success Criteria:

#### Automated Verification:

- `supabase db push` exits 0 with no errors

#### Manual Verification:

- Remote Supabase dashboard → Table Editor → `equipment_configs` table exists
- Remote dashboard → Authentication → Policies → 4 policies present on `equipment_configs`
- Confirm that `SUPABASE_URL` and `SUPABASE_KEY` in `.dev.vars` match the remote project credentials

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the remote deployment was successful.

---

## Testing Strategy

### Manual Testing Steps:

1. Sign up a test user at http://localhost:3000/auth/signup
2. In Studio → SQL Editor, insert a row with the test user's UUID — should succeed
3. Try inserting with a different (fake) UUID — should be rejected by RLS
4. Query as anonymous (no auth) — should return 0 rows
5. UPDATE a row and verify `updated_at` changes

## Migration Notes

- First product table — no data migration needed
- If migration fails locally: `supabase db reset` to start fresh
- Remote rollback (before S-01 ships data): `DROP TABLE public.equipment_configs CASCADE`

## References

- Roadmap: `context/foundation/roadmap.md` (F-01)
- PRD: `context/foundation/prd.md` (FR-003–FR-007, Access Control)
- Supabase client: `src/lib/supabase.ts`
- Supabase config: `supabase/config.toml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Local Supabase and migration

#### Automated

- [x] 1.1 `supabase db reset` exits 0 — e742192

#### Manual

- [x] 1.2 Studio shows `equipment_configs` table with correct columns — e742192
- [x] 1.3 Studio shows 4 RLS policies on `equipment_configs` — e742192
- [x] 1.4 Anonymous SQL query returns 0 rows (RLS verified) — e742192

### Phase 2: TypeScript types

#### Automated

- [x] 2.1 `npx astro sync && npm run lint` passes with `Database` generic in `supabase.ts` — 80951ef

#### Manual

- [x] 2.2 IDE hover on `Database['public']['Tables']['equipment_configs']['Row']` shows correct fields — 80951ef

### Phase 3: Seed data

#### Automated

- [x] 3.1 `supabase db reset` exits 0 with `seed.sql` present — 2d6ca13

#### Manual

- [x] 3.2 After activating seed, 2 configs appear in Studio Table Editor — 2d6ca13

### Phase 4: Remote deployment

#### Automated

- [x] 4.1 `supabase db push` exits 0

#### Manual

- [x] 4.2 Remote dashboard shows `equipment_configs` table
- [x] 4.3 Remote dashboard shows 4 RLS policies on `equipment_configs`
- [x] 4.4 Remote env vars in `.dev.vars` match the remote project credentials
