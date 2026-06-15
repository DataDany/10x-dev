---
project: 10xStronger
version: 1
status: draft
created: 2026-06-12
updated: 2026-06-12
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: 10xStronger

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Home gym users with unmarked adjustable plate dumbbells cannot answer basic questions like "how much can you lift?" or track their strength progression — because the data simply doesn't exist. 10xStronger closes this gap: a focused, single-user web tool that calculates the actual total weight of any equipment configuration so the user never has to compute it mentally during training. The product is intentionally narrow — a calculator for a niche but real problem, shaped to ship in one week.

## North star

**S-01: dumbbell-config-calculator** — the smallest end-to-end slice whose successful delivery proves the core product hypothesis.

> _North star_ here means: the first user-visible flow that, if shipped, confirms the product does the one thing it exists to do. It is placed as early as prerequisites allow because every other slice only matters if this one works.

The primary success criterion is literally "user configures a dumbbell (handle + plates × count) and sees the correct total weight in kg" — this slice delivers exactly that.

## At a glance

| ID   | Change ID                  | Outcome (user can …)                                                           | Prerequisites | PRD refs                                      | Status   |
| ---- | -------------------------- | ------------------------------------------------------------------------------ | ------------- | --------------------------------------------- | -------- |
| F-01 | equipment-schema           | (foundation) equipment config schema migrated to Supabase with RLS             | —             | FR-003, FR-004, FR-005, FR-006, FR-007        | ready    |
| S-01 | dumbbell-config-calculator | create a dumbbell config and immediately see the calculated total weight       | F-01          | FR-001, FR-002, FR-003, FR-004, FR-005, US-01 | proposed |
| S-02 | config-management          | edit and delete existing equipment configurations                              | F-01, S-01    | FR-006, FR-007                                | proposed |
| S-03 | extended-equipment-types   | configure other equipment types (barbell, kettlebell) using the same mechanism | F-01, S-01    | FR-008                                        | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme              | Chain                    | Note                                                                          |
| ------ | ------------------ | ------------------------ | ----------------------------------------------------------------------------- |
| A      | Weight calculator  | `F-01` → `S-01` → `S-02` | Must-have path; directly delivers the north star. Ship this to call MVP done. |
| B      | Extended equipment | `S-03`                   | Joins Stream A at `S-01`; nice-to-have — tackle only if Stream A lands early. |

## Baseline

What's already in place in the codebase as of 2026-06-12 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro 6 + React 19 + Tailwind; pages: index, dashboard, auth/signin, auth/signup, auth/confirm-email; components: SignInForm, SignUpForm, SubmitButton, PasswordToggle
- **Backend / API:** present — Astro SSR on Cloudflare Workers; API routes at `src/pages/api/auth/`
- **Data:** partial — Supabase JS client present (`src/lib/supabase.ts`); no schema migrations, no seed data
- **Auth:** present — Supabase SSR (`@supabase/ssr`); middleware at `src/middleware.ts` protects `/dashboard`; FR-001 and FR-002 already implemented
- **Deploy / infra:** present — `wrangler.jsonc` (Cloudflare Workers), `.github/workflows/ci.yml` (GitHub Actions with auto-deploy on merge)
- **Observability:** partial — Cloudflare native observability enabled in `wrangler.jsonc`; no third-party error tracking (Sentry etc.)

## Foundations

### F-01: Equipment config schema

- **Outcome:** (foundation) `equipment_configs` table migrated to Supabase; row-level security enforces per-user data isolation; Supabase client in `src/lib/supabase.ts` can query it.
- **Change ID:** equipment-schema
- **PRD refs:** FR-003, FR-004, FR-005, FR-006, FR-007 (all CRUD operations require this table); Access Control section (RLS is the mechanism for "a user's data is never accessible to another user")
- **Unlocks:** S-01 (needs table to persist configs), S-02 (needs persisted configs to edit/delete), S-03 (same table structure, extended by equipment type column)
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** RLS must be configured at migration time — adding it post-launch requires a schema change and re-verification. Skipping it now would violate the NFR "one user's data must never be accessible to another user".
- **Status:** ready

## Slices

### S-01: Dumbbell config — create and calculate

- **Outcome:** user can create a dumbbell configuration (name, handle weight, plate weight, plate count) and immediately see the calculated total weight updating with every input change.
- **Change ID:** dumbbell-config-calculator
- **PRD refs:** FR-001 (auth: present in baseline), FR-002 (auth: present in baseline), FR-003, FR-004, FR-005, US-01
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Calculation must be arithmetically exact and visibly update on every input change (guardrail + NFR). A wrong result here undermines the entire purpose of the product.
- **Status:** proposed

### S-02: Config management — edit and delete

- **Outcome:** user can edit any existing equipment configuration and delete configurations they no longer need.
- **Change ID:** config-management
- **PRD refs:** FR-006, FR-007
- **Prerequisites:** F-01, S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Edit is a recurring action — user's strength changes over time (per FR-006 Socrates note). Shipping without edit means the user must delete and recreate configs every time they progress; that's a usability regression on an otherwise fast product.
- **Status:** proposed

### S-03: Extended equipment types

- **Outcome:** user can configure other equipment types (barbell, kettlebell) using the same component mechanism as dumbbells.
- **Change ID:** extended-equipment-types
- **PRD refs:** FR-008
- **Prerequisites:** F-01, S-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Nice-to-have with a 4-day hard deadline. Realize only if Stream A (F-01 → S-01 → S-02) lands ahead of schedule. Skipping does not affect the primary success criterion.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                  | Suggested issue title                                | Ready for `/10x-plan` | Notes                                                        |
| ---------- | -------------------------- | ---------------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| F-01       | equipment-schema           | Migrate equipment config schema to Supabase with RLS | yes                   | Run `/10x-plan equipment-schema`                             |
| S-01       | dumbbell-config-calculator | Dumbbell config form with live weight calculation    | no                    | Depends on F-01                                              |
| S-02       | config-management          | Edit and delete equipment configurations             | no                    | Depends on F-01 + S-01                                       |
| S-03       | extended-equipment-types   | Support barbell and kettlebell config types          | no                    | Depends on F-01 + S-01; nice-to-have — park if time runs out |

## Open Roadmap Questions

(none — PRD carries zero open questions; no cross-cutting questions surfaced during framing)

## Parked

- **External platform integrations (Garmin, Strava, MyFitnessPal)** — Why parked: PRD §Non-Goals; no external dependencies in v1.
- **Native mobile app** — Why parked: PRD §Non-Goals; responsive web is sufficient.
- **Exercise technique coaching** — Why parked: PRD §Non-Goals; weight calculation only.
- **Training statistics, funny comparisons, strength progression plans** — Why parked: PRD §Non-Goals (v2+).
- **Premium subscription tier** — Why parked: PRD §Access Control; flat model supports the addition post-MVP without structural changes.

## Done

(Empty on first generation. `/10x-archive` appends an entry here — and flips that item's `Status` to `done` — when a change whose `Change ID` matches the item is archived.)
