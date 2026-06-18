# Dumbbell Config Calculator Implementation Plan

## Overview

Build the S-01 north-star slice: a form on the dashboard where the user creates a dumbbell configuration (name, handle weight, plate weight, plate count) and immediately sees the calculated total weight updating with every keystroke. Saved configurations appear as cards below the form.

## Current State Analysis

- `equipment_configs` table with RLS exists (F-01) — `src/types/database.types.ts` has typed schema
- `src/lib/supabase.ts` — typed SSR client with `Database` generic
- `src/pages/dashboard.astro` — placeholder (email + sign-out button only)
- `src/middleware.ts` — `/dashboard` already in `PROTECTED_ROUTES`; sets `context.locals.user`
- Auth components (`FormField`, `SubmitButton`, `ServerError`) — reusable patterns
- No equipment API routes, no equipment components exist yet

## Desired End State

After this change, a logged-in user on `/dashboard` sees:

1. A form with 4 inputs (name, handle weight, plate weight, plate count) and a live "Total: X.X kg" panel that updates on every keystroke — formula: `handle_weight + (plate_weight × plate_count)`
2. Below the form: a grid of cards, each showing a saved config's name, components, and its calculated weight in large type
3. When no configs exist: an encouraging empty-state message
4. Saving a config redirects back to `/dashboard`; a duplicate name shows a specific error message

### Key Discoveries:

- `src/middleware.ts:7` — `context.locals.user` is populated before API routes and pages; no middleware change needed
- `src/components/auth/FormField.tsx` — accepts `type="number"`, stores value as string; parse in component
- Auth API routes pattern: `formData() → createClient() → Supabase op → redirect` — same pattern for equipment POST
- `ConfigList` and `ConfigCard` are display-only — render without `client:*` directive in Astro (static HTML)
- `ConfigForm` needs `client:load` for live calculation interactivity
- `equipment_type` is hardcoded to `'dumbbell'` for S-01; not shown as a user input

## What We're NOT Doing

- No edit or delete (S-02)
- No other equipment types (S-03)
- No optimistic UI updates — full page redirect after POST
- No separate `/equipment` page — dashboard is the single view
- No GET API route — configs fetched server-side in `dashboard.astro`

## Implementation Approach

Astro SSR + React islands pattern: `dashboard.astro` fetches configs server-side, passes them as props to static `ConfigList`. Only `ConfigForm` hydrates client-side (`client:load`) for live calculation. POST goes to a new API route that follows the existing auth route pattern.

## Critical Implementation Details

**Supabase INSERT and user_id:** The API route must pass `user_id: context.locals.user.id` explicitly in the insert payload — the RLS INSERT policy verifies it matches `auth.uid()` but the column is `NOT NULL`. Do not rely on RLS to auto-fill the column.

**Duplicate name error code:** Supabase returns Postgres error code `'23505'` on unique constraint violation. Check `error.code === '23505'` in the POST route to surface a specific message instead of the raw DB error.

**Number input parsing:** `FormField` calls `onChange` with `e.target.value` as a string. Store raw strings in state; parse with `parseFloat` / `parseInt` only for the live calculation and API submission. Treat empty string as 0 for the live calc display.

---

## Phase 1: POST API route

### Overview

Create the `POST /api/equipment/configs` handler that validates inputs, inserts into `equipment_configs`, and redirects with success or a specific error message.

### Changes Required:

#### 1. API route file

**File**: `src/pages/api/equipment/configs.ts`

**Intent**: Accept form submissions from the config form, validate all four fields, insert into Supabase, and redirect appropriately.

**Contract**: Exports `POST: APIRoute`. Reads `formData`: `name` (string), `handle_weight` (number), `plate_weight` (number), `plate_count` (integer). All fields required. On success: `redirect('/dashboard')`. On validation failure or Supabase error: `redirect('/dashboard?error=<encoded message>')`. On duplicate name (Postgres code `23505`): redirect with message `'A configuration with this name already exists'`.

```typescript
// Guard: user must be authenticated (middleware sets context.locals.user)
const user = context.locals.user;
if (!user) return context.redirect("/auth/signin");

// Insert — user_id must be passed explicitly; RLS verifies it matches auth.uid()
const { error } = await supabase
  .from("equipment_configs")
  .insert({ name, equipment_type: "dumbbell", handle_weight, plate_weight, plate_count, user_id: user.id });

if (error?.code === "23505") {
  return context.redirect(`/dashboard?error=${encodeURIComponent("A configuration with this name already exists")}`);
}
```

### Success Criteria:

#### Automated Verification:

- `npx astro sync && npm run lint` passes

#### Manual Verification:

- POST valid data → config row appears in Supabase Studio Table Editor
- POST with a duplicate name → `/dashboard?error=...` shows the specific duplicate message
- POST with empty name → `/dashboard?error=...` shows validation error
- POST without being logged in → redirects to `/auth/signin`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: React components

### Overview

Build three React components: `ConfigForm` (form with live calc, needs hydration), `ConfigCard` (static display card), and `ConfigList` (grid or empty state, static).

### Changes Required:

#### 1. ConfigForm component

**File**: `src/components/equipment/ConfigForm.tsx`

**Intent**: Render a form with four inputs and a live "Total weight" panel that recalculates on every keystroke. Follows the `SignUpForm` pattern for state management, validation, and error display.

**Contract**: Props: `{ serverError?: string | null }`. Exports as default. Uses `FormField` for each input, `SubmitButton` with `pendingText`, `ServerError` for the `serverError` prop. Action: `POST /api/equipment/configs`. Four fields: `name` (text), `handle_weight` (number, step 0.01, min 0), `plate_weight` (number, step 0.01, min 0), `plate_count` (number, step 1, min 0). Live calc: `const total = (parseFloat(handleWeight) || 0) + ((parseFloat(plateWeight) || 0) * (parseInt(plateCount) || 0))`. Display: `{total.toFixed(1)} kg` — always visible, shows `0.0 kg` when fields are empty. Client-side validation mirrors `SignUpForm` (prevent submit if invalid, show per-field errors). `equipment_type` is a hidden input with value `"dumbbell"`.

#### 2. ConfigCard component

**File**: `src/components/equipment/ConfigCard.tsx`

**Intent**: Display one saved equipment configuration as a card with its calculated total weight prominently shown.

**Contract**: Props: `{ config: Database['public']['Tables']['equipment_configs']['Row'] }`. No interactivity — renders static HTML. Shows: `config.name` as heading, `config.handle_weight` kg + `config.plate_weight` kg × `config.plate_count` as secondary line, and `total.toFixed(1) kg` as the prominent result. Styling: card with `rounded-xl border border-white/10 bg-white/5 p-4` matching app aesthetic.

#### 3. ConfigList component

**File**: `src/components/equipment/ConfigList.tsx`

**Intent**: Render a grid of `ConfigCard` components or an encouraging empty-state message when no configs exist.

**Contract**: Props: `{ configs: Database['public']['Tables']['equipment_configs']['Row'][] }`. No interactivity. When `configs.length === 0`: render a `<p>` with "You don't have any configurations yet. Use the form above to add your first one." When non-empty: render a `<div className="grid gap-4 sm:grid-cols-2">` with one `ConfigCard` per config.

### Success Criteria:

#### Automated Verification:

- `npx astro sync && npm run lint` passes with no type errors in the new components

#### Manual Verification:

- `ConfigForm` live calc updates correctly: e.g. handle=2.5, plate=1.25, count=4 → shows `7.5 kg`
- Live calc shows `0.0 kg` when all fields are empty
- Client-side validation prevents submit when `name` is empty
- `ConfigCard` renders with correct calculated weight
- `ConfigList` renders empty-state message when no configs provided

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Dashboard integration

### Overview

Replace the `dashboard.astro` placeholder with the full layout: server-side config fetch, `ConfigForm` with `client:load`, and static `ConfigList`.

### Changes Required:

#### 1. Updated dashboard page

**File**: `src/pages/dashboard.astro`

**Intent**: Fetch the user's configs from Supabase at SSR time, read the `?error` query param, and render the form + list layout.

**Contract**: Server block: create Supabase client, fetch `equipment_configs` ordered by `created_at DESC`. Read `Astro.url.searchParams.get('error')`. Template: page title "My Equipment", `<ConfigForm serverError={error} client:load />`, then `<ConfigList configs={configs} />` (no `client:*` directive — static). Retain the existing sign-out button. Drop the placeholder text about "authenticated users only."

### Success Criteria:

#### Automated Verification:

- `npm run build` exits 0
- `npx astro sync && npm run lint` passes

#### Manual Verification:

- Sign in and open `/dashboard` — form and empty-state message visible
- Fill in form and submit — new config appears as a card on the next page load
- Live calc in form works end-to-end in the browser
- Try duplicate name — specific error message appears on dashboard
- Try submitting empty form — client-side validation blocks it
- Sign out and visit `/dashboard` directly — redirect to `/auth/signin`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Manual Testing Steps:

1. Sign in at `/auth/signin`
2. On dashboard: verify form appears above empty-state message
3. Type into handle/plate/count fields — verify total updates live
4. Submit form with all fields filled — verify card appears after redirect
5. Submit again with the same name — verify duplicate error message
6. Clear all form fields and submit — verify client-side validation blocks it
7. Verify calculated weight on card matches the formula: `handle + (plate × count)`
8. Open Studio and verify the row exists in `equipment_configs` with correct values

## References

- Roadmap: `context/foundation/roadmap.md` (S-01)
- PRD: `context/foundation/prd.md` (FR-003, FR-004, FR-005, US-01)
- F-01 plan: `context/changes/equipment-schema/plan.md`
- Form pattern: `src/components/auth/SignUpForm.tsx`
- API pattern: `src/pages/api/auth/signup.ts`
- Types: `src/types/database.types.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: POST API route

#### Automated

- [x] 1.1 `npx astro sync && npm run lint` passes

#### Manual

- [x] 1.2 POST valid data → config row appears in Supabase Studio
- [x] 1.3 POST duplicate name → specific error message on dashboard
- [x] 1.4 POST empty name → validation error on dashboard
- [x] 1.5 POST unauthenticated → redirect to `/auth/signin`

### Phase 2: React components

#### Automated

- [ ] 2.1 `npx astro sync && npm run lint` passes with no type errors in new components

#### Manual

- [ ] 2.2 Live calc: handle=2.5, plate=1.25, count=4 → shows `7.5 kg`
- [ ] 2.3 Live calc shows `0.0 kg` when fields are empty
- [ ] 2.4 Client-side validation blocks submit when name is empty
- [ ] 2.5 ConfigCard renders with correct calculated weight
- [ ] 2.6 ConfigList renders empty-state message when no configs provided

### Phase 3: Dashboard integration

#### Automated

- [ ] 3.1 `npm run build` exits 0
- [ ] 3.2 `npx astro sync && npm run lint` passes

#### Manual

- [ ] 3.3 Sign in → dashboard shows form and empty-state
- [ ] 3.4 Submit form → config card appears after redirect
- [ ] 3.5 Live calc works end-to-end in browser
- [ ] 3.6 Duplicate name → specific error on dashboard
- [ ] 3.7 Empty form submit → client-side validation blocks
- [ ] 3.8 Unauthenticated `/dashboard` visit → redirect to sign-in
