# Extended Equipment Types — Plan Brief

> Full plan: `context/changes/extended-equipment-types/plan.md`

## What & Why

Add barbell and kettlebell as selectable equipment types alongside the existing dumbbell (FR-008). Users who also own a barbell or kettlebell currently have no way to configure them — they'd have to abuse a dumbbell config or go without. The PRD explicitly notes this should cost near-zero to add because the config mechanism is already generic.

## Starting Point

`equipment_configs` already has `equipment_type TEXT NOT NULL DEFAULT 'dumbbell'` and the formula (`handle_weight + plate_weight × plate_count`) is type-agnostic. The only blockers are UI hardcodes: a hidden input in ConfigForm and a literal string in the POST handler lock every new config to `'dumbbell'`.

## Desired End State

The create form shows a three-way toggle at the top (Dumbbell / Barbell / Kettlebell). Selecting kettlebell hides the plate fields (they save as 0). Labels adapt: "Handle weight" → "Bar weight" → "Weight". Each card shows a small icon + type label. Edit mode includes the same selector and saves type changes via PATCH.

## Key Decisions Made

| Decision                    | Choice                     | Why (1 sentence)                                                                     | Source |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------------ | ------ |
| Kettlebell field visibility | Hide plate fields, save 0s | Showing irrelevant plate fields is confusing — kettlebells have no adjustable plates | Plan   |
| Field labels                | Adapt per type             | "Handle weight" is wrong terminology for a barbell bar or a kettlebell               | Plan   |
| Type editing                | Editable in edit mode      | Consistent with S-02; user can fix a wrong type without deleting the config          | Plan   |
| Type selector UI            | Segmented button row       | One-tap, scannable, mobile-friendly for a small fixed set of three choices           | Plan   |
| Card display                | Icon + type label          | Instantly distinguishable at a glance without reading text                           | Plan   |
| Barbell plate count         | Total plates (both sides)  | Formula unchanged; zero extra code                                                   | Plan   |
| Bare-bar barbell            | No validation required     | A bare-bar warm-up config is legitimate; formula already handles plate_count=0       | Plan   |

## Scope

**In scope:** Type selector in ConfigForm (create), type selector in ConfigCard edit mode, type icon + label in ConfigCard view mode, POST handler reads equipment_type, PATCH handler accepts equipment_type

**Out of scope:** Per-type formula changes, per-side plate counting for barbell, dashboard filtering by type, separate form components per type, DB migration

## Architecture / Approach

No schema change. Two phases: Phase 1 wires the create path (ConfigForm + POST handler) — independently testable, all three types can be created and appear on the dashboard. Phase 2 wires the view/edit path (ConfigCard + PATCH handler) — type icons appear on cards and type changes can be saved. Each phase is a clean commit with automated + manual gates.

## Phases at a Glance

| Phase                                 | What it delivers                                               | Key risk                                                                     |
| ------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1. Type selector in ConfigForm + POST | All three types creatable; labels and field visibility correct | Kettlebell hidden inputs must always submit plate_weight=0 and plate_count=0 |
| 2. Type-aware ConfigCard + PATCH      | Cards show type icons; edit mode handles type switching        | Switching to kettlebell in edit must immediately reset plate state to '0'    |

**Prerequisites:** S-01 and S-02 done (ConfigForm, ConfigCard, and both API routes exist)
**Estimated effort:** ~1 session across 2 phases

## Open Risks & Assumptions

- `lucide-react` may not have `Barbell` or `Kettlebell` icons — substitute icons (`Weight`, `Circle`) to be confirmed at implementation time by checking available exports
- Production Supabase is used in dev (`.dev.vars` points to production) — manual testing will write to the production DB
