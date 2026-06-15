# Task Management — Linear Mirror of roadmap.md

> Source of truth: `context/foundation/roadmap.md` (v1, 2026-06-12).
> This file documents the Linear workspace structure created on 2026-06-12.
> Update the Status sync table when issues change state.
> Hard deadline: **2026-06-15**.

---

## Workspace

| Field       | Value                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Workspace   | 10xstronger                                                               |
| Team        | `10xstronger` (ID: `fd4efc7e-2b4d-4a98-8f65-9afe3d29d61e`)                |
| Team key    | `10X`                                                                     |
| Project     | **10xStronger MVP** (ID: `4e755aea-0684-4fc7-bb0f-8d63a047625b`)          |
| Project URL | https://linear.app/10xstronger/project/10xstronger-mvp-c4d0de40cb14       |
| Milestone   | **MVP** (ID: `144d7a17-4e52-4931-a5ae-824a2a45434c`) · target: 2026-06-15 |

---

## Labels created

| Label          | Color     | Meaning                                                            |
| -------------- | --------- | ------------------------------------------------------------------ |
| `foundation`   | `#4EA7FC` | Horizontal enabler; unlocks slices but not user-visible on its own |
| `slice`        | `#BB87FC` | User-visible vertical outcome                                      |
| `north-star`   | `#F2C94C` | The first slice that proves the core product hypothesis            |
| `ready`        | `#4CB782` | All prerequisites met; can be started immediately                  |
| `blocked`      | `#EB5757` | Has unmet prerequisites; do not start                              |
| `nice-to-have` | `#9E9E9E` | Tackle only if time allows after Stream A is done                  |

---

## Issues

### 10X-5 — F-01: Migrate equipment config schema to Supabase with RLS

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| URL        | https://linear.app/10xstronger/issue/10X-5/f-01-migrate-equipment-config-schema-to-supabase-with-rls |
| Roadmap ID | F-01                                                                                                 |
| Change ID  | equipment-schema                                                                                     |
| Status     | **Todo**                                                                                             |
| Priority   | Urgent (1)                                                                                           |
| Labels     | `foundation`, `ready`                                                                                |
| Milestone  | MVP                                                                                                  |
| Blocked by | —                                                                                                    |
| Blocks     | 10X-6, 10X-7, 10X-8                                                                                  |
| Git branch | `dangru7k/10x-5-f-01-migrate-equipment-config-schema-to-supabase-with-rls`                           |

**Description:** Create the `equipment_configs` table in Supabase via a migration file. Configure Row Level Security so each user can only access their own rows.

**Acceptance criteria:**

- Migration file in `supabase/migrations/` creates `equipment_configs` table
- RLS enabled; policy: `user_id = auth.uid()`
- Supabase client in `src/lib/supabase.ts` can query the table from Cloudflare Workers runtime
- No user can read or write another user's rows

**PRD refs:** FR-003, FR-004, FR-005, FR-006, FR-007, Access Control section

**Risk:** RLS must be set at migration time — adding it post-launch requires a schema change and re-verification.

---

### 10X-6 — S-01: Dumbbell config form with live weight calculation

| Field      | Value                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------- |
| URL        | https://linear.app/10xstronger/issue/10X-6/s-01-dumbbell-config-form-with-live-weight-calculation |
| Roadmap ID | S-01                                                                                              |
| Change ID  | dumbbell-config-calculator                                                                        |
| Status     | Backlog                                                                                           |
| Priority   | High (2)                                                                                          |
| Labels     | `slice`, `north-star`, `blocked`                                                                  |
| Milestone  | MVP                                                                                               |
| Blocked by | 10X-5                                                                                             |
| Blocks     | 10X-7, 10X-8                                                                                      |
| Git branch | `dangru7k/10x-6-s-01-dumbbell-config-form-with-live-weight-calculation`                           |

**Description:** User can create a dumbbell configuration (name, handle weight, plate weight, plate count) and see the calculated total weight update live with every input change.

**Acceptance criteria:**

- Form fields: name, handle weight (kg), plate weight (kg), plate count
- Total weight formula: `handle + (plate_weight × plate_count × 2)` updates on every keystroke
- Saved config persists to `equipment_configs` table via Supabase
- Calculation is arithmetically exact (no floating-point drift shown to user)
- Works in Cloudflare Workers SSR runtime

**PRD refs:** FR-003, FR-004, FR-005, US-01

**Risk:** Wrong result here undermines the entire purpose of the product.

---

### 10X-7 — S-02: Edit and delete equipment configurations

| Field         | Value                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| URL           | https://linear.app/10xstronger/issue/10X-7/s-02-edit-and-delete-equipment-configurations |
| Roadmap ID    | S-02                                                                                     |
| Change ID     | config-management                                                                        |
| Status        | Backlog                                                                                  |
| Priority      | High (2)                                                                                 |
| Labels        | `slice`, `blocked`                                                                       |
| Milestone     | MVP                                                                                      |
| Blocked by    | 10X-5, 10X-6                                                                             |
| Blocks        | —                                                                                        |
| Parallel with | 10X-8                                                                                    |
| Git branch    | `dangru7k/10x-7-s-02-edit-and-delete-equipment-configurations`                           |

**Description:** User can edit any existing equipment configuration and delete configurations they no longer need.

**Acceptance criteria:**

- Edit flow pre-fills form with existing config values
- Save overwrites the existing row (no duplicate created)
- Delete removes the row and removes it from the UI immediately
- RLS enforced: user can only edit/delete their own configs

**PRD refs:** FR-006, FR-007

**Risk:** Without edit, user must delete and recreate every time their strength progresses.

---

### 10X-8 — S-03: Support barbell and kettlebell config types

| Field         | Value                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------- |
| URL           | https://linear.app/10xstronger/issue/10X-8/s-03-support-barbell-and-kettlebell-config-types |
| Roadmap ID    | S-03                                                                                        |
| Change ID     | extended-equipment-types                                                                    |
| Status        | Backlog                                                                                     |
| Priority      | Low (4)                                                                                     |
| Labels        | `slice`, `nice-to-have`, `blocked`                                                          |
| Milestone     | MVP                                                                                         |
| Blocked by    | 10X-5, 10X-6                                                                                |
| Blocks        | —                                                                                           |
| Parallel with | 10X-7                                                                                       |
| Git branch    | `dangru7k/10x-8-s-03-support-barbell-and-kettlebell-config-types`                           |

**Description:** User can configure other equipment types (barbell, kettlebell) using the same component mechanism as dumbbells.

**Acceptance criteria:**

- Equipment type selector (dumbbell / barbell / kettlebell)
- Calculation formula adapts per type
- All types share the same `equipment_configs` table (equipment_type column)

**PRD refs:** FR-008

**Risk:** Nice-to-have. Tackle only if Stream A (10X-5 → 10X-6 → 10X-7) is complete ahead of the 2026-06-15 deadline.

---

## Dependency graph

```
10X-5 / F-01 (equipment-schema)       ← Todo, start here
 └── 10X-6 / S-01 (dumbbell-config-calculator)   ← north star
      ├── 10X-7 / S-02 (config-management)        ← completes MVP
      └── 10X-8 / S-03 (extended-equipment-types) ← nice-to-have
```

## Stream A — must-have path

`10X-5` → `10X-6` → `10X-7`

Ship this to call MVP done.

---

## Status sync

| Roadmap ID | Linear ID | Status (roadmap) | Status (Linear) | Last updated |
| ---------- | --------- | ---------------- | --------------- | ------------ |
| F-01       | 10X-5     | ready            | Todo            | 2026-06-12   |
| S-01       | 10X-6     | proposed         | Backlog         | 2026-06-12   |
| S-02       | 10X-7     | proposed         | Backlog         | 2026-06-12   |
| S-03       | 10X-8     | proposed         | Backlog         | 2026-06-12   |
