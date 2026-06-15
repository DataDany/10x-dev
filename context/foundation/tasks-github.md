# Task Management — GitHub Mirror of roadmap.md

> Source of truth: `context/foundation/roadmap.md` (v1, 2026-06-12).
> This file is a ready-to-paste GitHub Issues reference. Update it when roadmap status changes.
> Hard deadline: **2026-06-15**.

---

## Milestone: MVP

All items below belong to the single `MVP` milestone on GitHub.

---

## Issues

### #1 — F-01: Migrate equipment config schema to Supabase with RLS

**Labels:** `foundation`, `ready`
**Milestone:** MVP
**Depends on:** —
**Blocks:** #2, #3, #4

**Body:**

Create the `equipment_configs` table in Supabase via a migration file. Configure Row Level Security so each user can only access their own rows.

**Acceptance criteria:**

- [ ] Migration file in `supabase/migrations/` creates `equipment_configs` table
- [ ] RLS enabled; policy: `user_id = auth.uid()`
- [ ] Supabase client in `src/lib/supabase.ts` can query the table from Cloudflare Workers runtime
- [ ] No user can read or write another user's rows

**PRD refs:** FR-003, FR-004, FR-005, FR-006, FR-007, Access Control section

**Risk:** RLS must be set at migration time. Adding it post-launch requires a schema change and re-verification.

---

### #2 — S-01: Dumbbell config form with live weight calculation

**Labels:** `slice`, `north-star`, `blocked`
**Milestone:** MVP
**Depends on:** #1 (F-01)
**Blocks:** #3, #4

**Body:**

User can create a dumbbell configuration (name, handle weight, plate weight, plate count) and see the calculated total weight update live with every input change.

**Acceptance criteria:**

- [ ] Form fields: name, handle weight (kg), plate weight (kg), plate count
- [ ] Total weight formula: `handle + (plate_weight × plate_count × 2)` updates on every keystroke
- [ ] Saved config persists to `equipment_configs` table via Supabase
- [ ] Calculation is arithmetically exact (no floating-point drift shown to user)
- [ ] Works in Cloudflare Workers SSR runtime

**PRD refs:** FR-003, FR-004, FR-005, US-01

**Risk:** Wrong result here undermines the entire purpose of the product.

---

### #3 — S-02: Edit and delete equipment configurations

**Labels:** `slice`, `blocked`
**Milestone:** MVP
**Depends on:** #1 (F-01), #2 (S-01)
**Blocks:** —
**Parallel with:** #4

**Body:**

User can edit any existing equipment configuration (change handle weight, plate weight, or count) and delete configurations they no longer need.

**Acceptance criteria:**

- [ ] Edit flow pre-fills form with existing config values
- [ ] Save overwrites the existing row (no duplicate created)
- [ ] Delete removes the row and removes it from the UI immediately
- [ ] RLS enforced: user can only edit/delete their own configs

**PRD refs:** FR-006, FR-007

**Risk:** Without edit, user must delete and recreate every time their strength progresses — usability regression on an otherwise fast product.

---

### #4 — S-03: Support barbell and kettlebell config types

**Labels:** `slice`, `nice-to-have`, `blocked`
**Milestone:** MVP
**Depends on:** #1 (F-01), #2 (S-01)
**Blocks:** —
**Parallel with:** #3

**Body:**

User can configure other equipment types (barbell, kettlebell) using the same component mechanism as dumbbells.

**Acceptance criteria:**

- [ ] Equipment type selector (dumbbell / barbell / kettlebell)
- [ ] Calculation formula adapts per type (e.g. barbell: bar + plates × 2; kettlebell: single weight)
- [ ] All types share the same `equipment_configs` table (equipment_type column)

**PRD refs:** FR-008

**Risk:** Nice-to-have with hard deadline 2026-06-15. Tackle only if Stream A (F-01 → S-01 → S-02) is complete ahead of schedule.

---

## Labels reference

| Label          | Meaning                                                            |
| -------------- | ------------------------------------------------------------------ |
| `foundation`   | Horizontal enabler; unlocks slices but not user-visible on its own |
| `slice`        | User-visible vertical outcome                                      |
| `north-star`   | The first slice that proves the core product hypothesis            |
| `ready`        | All prerequisites met; can be started immediately                  |
| `blocked`      | Has unmet prerequisites; do not start                              |
| `nice-to-have` | Tackle only if time allows after Stream A is done                  |

## Dependency graph

```
F-01 (equipment-schema)
 └── S-01 (dumbbell-config-calculator)   ← north star
      ├── S-02 (config-management)        ← complete MVP
      └── S-03 (extended-equipment-types) ← nice-to-have
```

## Stream A — must-have path

`F-01` → `S-01` → `S-02`

Ship this to call MVP done.

## Status sync

| Roadmap ID | GitHub Issue | Status (roadmap) | Status (GitHub) |
| ---------- | ------------ | ---------------- | --------------- |
| F-01       | #1           | ready            | open            |
| S-01       | #2           | proposed         | open            |
| S-02       | #3           | proposed         | open            |
| S-03       | #4           | proposed         | open            |
