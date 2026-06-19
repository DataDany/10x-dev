# Extended Equipment Types Implementation Plan

## Overview

Add barbell and kettlebell as selectable equipment types alongside the existing dumbbell. A segmented button row lets the user pick the type when creating or editing a config. Kettlebell hides the plate fields (saves 0s automatically). Labels and icons adapt per type. No schema migration needed — `equipment_type` column already exists in `equipment_configs`.

## Current State Analysis

- `equipment_configs` table already has `equipment_type TEXT NOT NULL DEFAULT 'dumbbell'` — formula (`handle_weight + plate_weight × plate_count`) is already generic and correct for all three types.
- `ConfigForm.tsx:63` — `<input type="hidden" name="equipment_type" value="dumbbell" />` hardcodes the type at create time.
- `configs.ts:39` — `equipment_type: "dumbbell"` literal in the INSERT, ignores whatever was in the form field.
- `ConfigCard.tsx` — view mode shows no equipment type; edit mode has no type selector; PATCH body never sends equipment_type.
- `configs/[id].ts` PATCH handler — no `equipment_type` field in the update call.
- `lucide-react` is already imported in both ConfigForm and ConfigCard; `Dumbbell` icon is already in use.

## Desired End State

A user creating a config sees three toggle buttons at the top of the form — Dumbbell, Barbell, Kettlebell. Selecting Kettlebell hides the plate weight and plate count fields (which default to 0). The handle-weight label reads "Handle weight", "Bar weight", or "Weight" depending on the type. On the card, a small icon + type label appears next to the config name. When editing, the same type selector appears and the type change is saved via PATCH.

### Key Discoveries

- No DB migration needed — `equipment_type` column exists and the formula is already type-agnostic.
- `configs.ts` must be updated to read `equipment_type` from form data (not hardcode it), but the validation rules for `plate_weight` and `plate_count` remain: `>= 0` is still valid (kettlebell sends 0, which passes).
- For kettlebell, the create form must submit `plate_weight=0` and `plate_count=0` as hidden inputs when those fields are not shown. The POST handler already accepts 0 for both without error.
- The `configs/[id].ts` PATCH handler currently does not touch `equipment_type` — it must be added to the update payload and validated (must be one of `'dumbbell' | 'barbell' | 'kettlebell'`).
- `lucide-react` does not have a `Barbell` or `Kettlebell` icon. Reasonable substitutes: `Dumbbell` for dumbbell (existing), `Weight` for barbell, `Circle` for kettlebell — confirm at implementation time by checking the available icon list.
- ConfigForm is a default export; ConfigCard is a named export. Both already import from lucide-react and the auth component library.

## What We're NOT Doing

- No per-type formula change — barbell plate_count means total plates (both sides), not per-side. Formula stays `handle + plate × count`.
- No special validation requiring plate_count > 0 for barbell. A bare-bar config is valid.
- No equipment_type column rename or DB migration.
- No separate form component per type — one ConfigForm handles all types via conditional rendering.
- No equipment_type filter or grouping on the dashboard (configs listed in one grid regardless of type).

## Implementation Approach

Two phases: Phase 1 wires up the **create** path (ConfigForm + POST handler). Phase 2 wires up the **view and edit** path (ConfigCard + PATCH handler). Each phase is independently testable: after Phase 1 you can create all three types and see them on the dashboard (unlabelled, as plain cards); after Phase 2 the cards show type icons and the edit flow handles type changes.

## Critical Implementation Details

**Kettlebell hidden inputs on form submit:** When `equipmentType === 'kettlebell'`, ConfigForm must render `<input type="hidden" name="plate_weight" value="0" />` and `<input type="hidden" name="plate_count" value="0" />` in place of the visible FormField components so that the POST body always includes all required fields. Do not rely on the POST handler defaulting missing fields — the handler validates their presence and format.

**equipment_type validation in PATCH:** The PATCH handler currently accepts any string for a JSON field update. Add an explicit allowlist check: `if (!['dumbbell','barbell','kettlebell'].includes(equipmentType)) return json({ error: 'Invalid equipment type' }, 400)`. This prevents accidental storage of typos.

**ConfigCard edit state initialization:** `equipmentType` state is initialized from `config.equipment_type` at mount (same once-only pattern as name/handleWeight). When the user switches type in edit mode to kettlebell, set `plateWeight` and `plateCount` to `'0'` immediately so the PATCH body is always valid.

---

## Phase 1: Type selector in ConfigForm and POST handler

### Overview

Add a three-way type selector at the top of the create form. The selected type drives field visibility (kettlebell hides plates), label text, and the value submitted to the POST handler. The POST handler is updated to read `equipment_type` from the form body instead of hardcoding `'dumbbell'`.

### Changes Required

#### 1. ConfigForm — type selector and conditional fields

**File:** `src/components/equipment/ConfigForm.tsx`

**Intent:** Add `equipmentType` state (default `'dumbbell'`), render a segmented button row (Dumbbell | Barbell | Kettlebell) at the top of the form, conditionally show/hide plate fields for kettlebell, and adapt the handle-weight label per type. Replace the hidden `equipment_type="dumbbell"` input with a hidden input reflecting the current state value.

**Contract:**

- `equipmentType` state: `'dumbbell' | 'barbell' | 'kettlebell'`, default `'dumbbell'`.
- Segmented row: three buttons side by side. Active button uses `bg-purple-600 text-white`; inactive uses `bg-white/5 text-blue-100/60 hover:bg-white/10`. Each button shows the appropriate lucide icon + label.
- Handle-weight label mapping: `{ dumbbell: 'Handle weight (kg)', barbell: 'Bar weight (kg)', kettlebell: 'Weight (kg)' }`.
- Plate fields (`plate_weight`, `plate_count` FormFields) rendered only when `equipmentType !== 'kettlebell'`.
- When `equipmentType === 'kettlebell'`: render `<input type="hidden" name="plate_weight" value="0" />` and `<input type="hidden" name="plate_count" value="0" />`.
- Hidden input: `<input type="hidden" name="equipment_type" value={equipmentType} />`.
- Client validation: skip `plateWeight` and `plateCount` field validation when `equipmentType === 'kettlebell'`.

#### 2. POST handler — read equipment_type from form

**File:** `src/pages/api/equipment/configs.ts`

**Intent:** Replace the hardcoded `equipment_type: "dumbbell"` in the INSERT with the value from `form.get("equipment_type")`. Validate it is one of the three allowed values.

**Contract:** Read `const equipmentType = form.get("equipment_type") as string | null`. If not in `['dumbbell', 'barbell', 'kettlebell']`, redirect to dashboard with `"Invalid equipment type"` error. Pass `equipment_type: equipmentType` to the Supabase insert.

### Success Criteria

#### Automated Verification

- `npx astro sync && npm run lint` passes

#### Manual Verification

- Create form shows Dumbbell / Barbell / Kettlebell buttons; active button is highlighted
- Selecting Kettlebell hides plate weight and plate count fields; selecting Dumbbell or Barbell shows them
- Handle-weight label reads "Handle weight (kg)" for dumbbell, "Bar weight (kg)" for barbell, "Weight (kg)" for kettlebell
- Submitting a barbell config saves correctly (visible in production Supabase table)
- Submitting a kettlebell config saves with `plate_weight=0` and `plate_count=0` in the DB
- Live weight calc still works correctly for all three types

**Implementation Note:** Pause after automated checks pass and wait for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Type-aware ConfigCard and PATCH handler

### Overview

ConfigCard view mode shows an icon + type label next to the config name. Edit mode adds the same type selector, conditional plate fields, and dynamic labels. The PATCH handler is updated to accept and save `equipment_type`.

### Changes Required

#### 1. ConfigCard — view mode type display

**File:** `src/components/equipment/ConfigCard.tsx`

**Intent:** In view mode, show a small icon and type label (e.g. Dumbbell icon + "Dumbbell") next to the config name so the user can distinguish types at a glance.

**Contract:**

- Add an icon + type label line directly below `<h3>{config.name}</h3>` in view mode.
- Icon mapping: `{ dumbbell: <Dumbbell />, barbell: <Weight />, kettlebell: <Circle /> }` (verify icon names at implementation time against available lucide-react exports).
- Label mapping: `{ dumbbell: 'Dumbbell', barbell: 'Barbell', kettlebell: 'Kettlebell' }`.
- Styling: `flex items-center gap-1 text-xs text-blue-100/50` — subtle, same muted treatment as handle/plate detail lines.
- View-mode total calc unchanged (`config.handle_weight + config.plate_weight * config.plate_count`).

#### 2. ConfigCard — edit mode type selector and conditional fields

**File:** `src/components/equipment/ConfigCard.tsx`

**Intent:** Add `equipmentType` state (initialized from `config.equipment_type`), render the same segmented type selector in edit mode, conditionally show plate fields and adapt labels — same logic as ConfigForm. When switching to kettlebell, immediately set `plateWeight` and `plateCount` state to `'0'`.

**Contract:**

- `equipmentType` state: `'dumbbell' | 'barbell' | 'kettlebell'`, initialized from `config.equipment_type`.
- When `setEquipmentType('kettlebell')` is called, also call `setPlateWeight('0')` and `setPlateCount('0')`.
- Plate FormFields conditionally rendered: `equipmentType !== 'kettlebell'`.
- Handle-weight label uses the same mapping as ConfigForm.
- Edit-mode live calc: `parseFloat(handleWeight) || 0` (for kettlebell, plateWeight and plateCount are `'0'` so the formula resolves to handleWeight — correct).
- PATCH body: `{ name, handle_weight, plate_weight, plate_count, equipment_type: equipmentType }`.
- Client validation: skip `plateWeight` / `plateCount` when `equipmentType === 'kettlebell'`.

#### 3. PATCH handler — accept equipment_type

**File:** `src/pages/api/equipment/configs/[id].ts`

**Intent:** Accept `equipment_type` in the JSON body, validate it against the allowlist, and include it in the Supabase update call.

**Contract:**

- Read `const et = body.equipment_type`. If `typeof et !== 'string' || !['dumbbell','barbell','kettlebell'].includes(et)`, return `json({ error: 'Invalid equipment type' }, 400)`.
- Add `equipment_type: et` to the `.update({ ... })` payload alongside the four existing fields.

### Success Criteria

#### Automated Verification

- `npx astro sync && npm run lint` passes
- `npm run build` exits 0

#### Manual Verification

- Each config card shows its type icon + label in view mode
- Clicking Edit on a barbell config shows it pre-selected in the type selector
- Switching type to kettlebell in edit mode hides plate fields and resets them to 0
- Saving a type change via Edit correctly updates the type in the DB and shows the new icon on the card
- Cancel from edit mode returns card to view mode without changing stored type

**Implementation Note:** Pause after automated checks pass and wait for manual confirmation before closing the phase.

---

## Testing Strategy

### Manual Testing Steps

1. Create a dumbbell config — verify form, calc, card display, and DB row
2. Create a barbell config — verify "Bar weight" label, same 4 fields, correct calc, DB row shows `equipment_type='barbell'`
3. Create a kettlebell config — verify only "Weight" field shown, DB row shows `plate_weight=0, plate_count=0, equipment_type='kettlebell'`
4. Dashboard shows all three cards with correct icons and type labels
5. Edit a barbell config, change type to kettlebell — plate fields disappear, save works, card updates
6. Edit a kettlebell config, change type to dumbbell — plate fields appear, save works
7. Cancel any edit — no changes persisted

## References

- Roadmap: `context/foundation/roadmap.md` (S-03)
- PRD: `context/foundation/prd.md` (FR-008)
- S-01 plan: `context/archive/2026-06-18-dumbbell-config-calculator/plan.md`
- S-02 plan: `context/archive/2026-06-19-config-management/plan.md`
- POST pattern: `src/pages/api/equipment/configs.ts`
- PATCH/DELETE pattern: `src/pages/api/equipment/configs/[id].ts`
- Form pattern: `src/components/equipment/ConfigForm.tsx`
- Card pattern: `src/components/equipment/ConfigCard.tsx`
- DB schema: `supabase/migrations/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Type selector in ConfigForm and POST handler

#### Automated

- [x] 1.1 `npx astro sync && npm run lint` passes [plan updated: kettlebell → custom] — 4e0049e

#### Manual

- [x] 1.2 Create form shows Dumbbell / Barbell / Kettlebell buttons; active button is highlighted
- [x] 1.3 Selecting Kettlebell hides plate fields; Dumbbell/Barbell shows them
- [x] 1.4 Handle-weight label adapts per type
- [x] 1.5 Submitting a barbell config saves correctly in DB
- [x] 1.6 Submitting a kettlebell config saves with plate_weight=0 and plate_count=0
- [x] 1.7 Live weight calc still correct for all three types

### Phase 2: Type-aware ConfigCard and PATCH handler

#### Automated

- [x] 2.1 `npx astro sync && npm run lint` passes — 5417f12
- [x] 2.2 `npm run build` exits 0 — 5417f12

#### Manual

- [x] 2.3 Config cards show type icon + label in view mode — 5417f12
- [x] 2.4 Edit pre-selects the correct type for existing configs — 5417f12
- [x] 2.5 Switching to kettlebell in edit hides plate fields and resets them to 0 — 5417f12
- [x] 2.6 Saving a type change updates the DB and card icon — 5417f12
- [x] 2.7 Cancel from edit returns card to view mode without changes — 5417f12
