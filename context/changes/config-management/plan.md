# Config Management Implementation Plan

## Overview

Add inline edit and delete to existing equipment config cards. Each card gains an Edit button (expands to a pre-filled form with live weight calc) and a Delete button (inline confirm-toggle). Both use `fetch()` from the React component to call new JSON API endpoints — no page navigation to a separate edit page.

## Current State Analysis

- `ConfigCard` (`src/components/equipment/ConfigCard.tsx`) is a static display component with no interactivity — no buttons, no state, no client hydration
- `ConfigList` (`src/components/equipment/ConfigList.tsx`) is also static (no `client:*` in `dashboard.astro`)
- Only a `POST` handler exists at `src/pages/api/equipment/configs.ts` — no `PATCH`, `DELETE`, or dynamic `[id]` routes
- `dashboard.astro` SSR-fetches configs and passes them as props to `<ConfigList>` (static)
- All existing API routes use form-POST → redirect and return no JSON; S-02 introduces the first JSON-returning endpoints

## Desired End State

After this change, each config card on the dashboard has:

1. An **Edit** button that expands the card to a pre-filled inline form (name, handle weight, plate weight, plate count + live total calc). Save calls PATCH; on success the page reloads to `/dashboard`. On duplicate name the error appears inside the card without collapsing it.
2. A **Delete** button that toggles a confirm step inline ("Are you sure? / Yes, delete / Cancel"). Confirm calls DELETE; on success the page reloads to `/dashboard`.

### Key Discoveries

- `ConfigCard:1` — currently a named export pure-render function; must become stateful (useState for mode + edit fields)
- `dashboard.astro:52` — `<ConfigList configs={configs} />` has no `client:*`; adding `client:load` hydrates ConfigList and all ConfigCard children automatically
- `src/types/database.types.ts` — `equipment_configs.Update` already has all fields optional, making PATCH semantically correct
- HTML forms can only POST — `fetch()` from the React component is the only way to send PATCH and DELETE without method-override hacks
- Supabase RLS enforces `auth.uid() = user_id` on UPDATE and DELETE; adding `.eq('user_id', user.id)` in the query doubles the guard and prevents any 0-rows-silently-succeeding confusion
- `23505` Postgres duplicate-key code applies to PATCH just as it does to POST; the PATCH handler must map it to a user-readable message

## What We're NOT Doing

- No optimistic UI (no removing the card before the DELETE response arrives)
- No client-side config list state (after any mutation, full SSR reload via `window.location.href = '/dashboard'`)
- No soft-delete (`deleted_at` column) — hard delete only
- No rename-only or number-only partial edit — all four fields are editable
- No separate edit page at `/dashboard/edit/[id]`
- No `equipment_type` field in the edit form (hardcoded `'dumbbell'` in S-01, not changed here)

## Implementation Approach

Two-phase: API first (testable in isolation with browser console fetch), then UI (ConfigCard + one-line dashboard.astro change). The API returns JSON with `{ success: true }` or `{ error: "message" }` — no redirects. React handles navigation after success via `window.location.href`.

## Critical Implementation Details

**JSON response shape:** All new endpoints return `Content-Type: application/json`. The React component reads `res.ok` + `data.error` — keep the shape consistent: `{ success: true }` on OK, `{ error: string }` on failure.

**RLS + explicit user filter:** Supabase RLS silently returns 0 affected rows (no error) when a user tries to mutate someone else's record. Always add `.eq('user_id', user.id)` to PATCH and DELETE queries so ownership is enforced at two layers and the query is clearly scoped.

**ConfigCard mode state initialization:** When the card enters edit mode, initialize the edit fields from the `config` prop at that moment (`useState(config.name)` etc.). Do not reinitialize on subsequent renders — use the initial prop value only once.

**Client validation before fetch:** Run the same validation logic as `ConfigForm` (name required, handle_weight > 0, plate_weight ≥ 0, plate_count ≥ 0) before calling `fetch`. If validation fails, set field-level errors and do not call the API.

---

## Phase 1: JSON API endpoints

### Overview

Create `src/pages/api/equipment/configs/[id].ts` exporting `PATCH` and `DELETE` handlers that return JSON. The existing `src/pages/api/equipment/configs.ts` (POST) is unchanged.

### Changes Required

#### 1. Dynamic API route

**File**: `src/pages/api/equipment/configs/[id].ts`

**Intent**: Handle PATCH (update all four editable fields of one config) and DELETE (hard-delete one config). Both verify auth via `context.locals.user`, apply the Supabase operation scoped to `id` AND `user_id`, and return JSON.

**Contract**: Exports `PATCH: APIRoute` and `DELETE: APIRoute`. PATCH reads `context.request.json()` for `{ name, handle_weight, plate_weight, plate_count }`, validates with the same rules as the POST handler (name required, handle_weight > 0, plate_weight ≥ 0, plate_count integer ≥ 0), then calls `.update(...).eq('id', id).eq('user_id', user.id)`. DELETE calls `.delete().eq('id', id).eq('user_id', user.id)`. Both return `new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })` on success. On `error.code === '23505'`, PATCH returns status 409 with `{ error: 'A configuration with this name already exists' }`. On any other Supabase error, both return status 500. On missing auth, both return status 401. On missing or malformed body fields, PATCH returns status 400.

### Success Criteria

#### Automated Verification

- `npx astro sync && npm run lint` passes

#### Manual Verification

- PATCH valid data via browser console → config row updated in Supabase Studio
- PATCH with duplicate name → response status 409, body `{ error: 'A configuration with this name already exists' }`
- PATCH with empty name → response status 400, body `{ error: 'Name is required' }`
- DELETE existing config → row removed from Studio
- PATCH/DELETE in incognito (no session) → response status 401

**Implementation Note**: After all automated checks pass, pause for manual verification before proceeding to Phase 2.

---

## Phase 2: Interactive ConfigCard and dashboard wiring

### Overview

Rewrite `ConfigCard` as a stateful React component with three render modes, and add `client:load` to `<ConfigList>` in `dashboard.astro`.

### Changes Required

#### 1. Interactive ConfigCard

**File**: `src/components/equipment/ConfigCard.tsx`

**Intent**: Give each card three modes — `view` (current read-only display + Edit/Delete buttons), `edit` (pre-filled inputs with live calc, Save/Cancel), and `confirm-delete` (confirmation text with Yes/Cancel). Edit save calls PATCH; delete confirm calls DELETE; both redirect to `/dashboard` on success.

**Contract**: Adds `import React, { useState } from "react"`. State: `mode: 'view' | 'edit' | 'confirm-delete'`, `name`, `handleWeight`, `plateWeight`, `plateCount` (strings, initialized from `config` prop), `errors` (field-level, same shape as ConfigForm), `serverError: string | null`, `loading: boolean`.

View mode renders: config name, handle/plates/total as before, plus two icon buttons — Edit (`Pencil` icon) sets mode to `'edit'`; Delete (`Trash2` icon) sets mode to `'confirm-delete'`.

Edit mode renders: four `FormField` inputs (pre-filled, same icons as ConfigForm), live total panel (same formula), `ServerError` for `serverError`, Save button (`SubmitButton`, `disabled={loading}`) and Cancel button. Save runs client validation; if valid, calls `fetch(\`/api/equipment/configs/${config.id}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, handle_weight, plate_weight, plate_count }) })`. On `data.success`: `window.location.href = '/dashboard'`. On `data.error`: set `serverError`.

Confirm-delete mode renders: "Are you sure you want to delete "{config.name}"?" text, `ServerError`, "Yes, delete" button (calls DELETE fetch, same pattern), Cancel button (sets mode back to `'view'`).

#### 2. Dashboard wiring

**File**: `src/pages/dashboard.astro`

**Intent**: Hydrate ConfigList (and therefore ConfigCard) on the client so the React state and event handlers work in the browser.

**Contract**: Change `<ConfigList configs={configs} />` to `<ConfigList configs={configs} client:load />`. No other change to dashboard.astro.

### Success Criteria

#### Automated Verification

- `npx astro sync && npm run lint` passes
- `npm run build` exits 0

#### Manual Verification

- Sign in → click Edit on a card → card expands with pre-filled values
- Change numeric values → live total updates in real time
- Click Save → redirect to `/dashboard`, card shows updated values
- Click Edit → change name to an existing config's name → click Save → error shown inside card, card stays open
- Click Delete on a card → confirm step appears
- Click "Yes, delete" → config disappears from list after redirect
- Click Edit then Cancel → card returns to view mode
- Click Delete then Cancel → card returns to view mode

**Implementation Note**: After all automated checks pass, pause for manual verification before closing the phase.

---

## Testing Strategy

### Manual Testing Steps

1. Sign in and open `/dashboard`
2. Click **Edit** on any card — verify it expands with correct pre-filled values and live calc works
3. Change the name to match another config — click Save — verify error appears inside the card without collapsing
4. Change values legitimately — click Save — verify redirect and updated card on reload
5. Click **Delete** — verify confirm step appears; click Cancel — verify card is unchanged
6. Click **Delete** again — confirm — verify config is gone from list
7. Open Studio and verify the row was actually removed from `equipment_configs`
8. Test in incognito: fetch PATCH/DELETE directly — verify 401 response

## References

- Roadmap: `context/foundation/roadmap.md` (S-02)
- PRD: `context/foundation/prd.md` (FR-006, FR-007)
- S-01 plan: `context/archive/2026-06-18-dumbbell-config-calculator/plan.md`
- POST pattern: `src/pages/api/equipment/configs.ts`
- Form pattern: `src/components/equipment/ConfigForm.tsx`
- Types: `src/types/database.types.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: JSON API endpoints

#### Automated

- [x] 1.1 `npx astro sync && npm run lint` passes — e9c2472

#### Manual

- [x] 1.2 PATCH valid data → config updated in Supabase Studio — e9c2472
- [x] 1.3 PATCH duplicate name → 409 with specific error message — e9c2472
- [x] 1.4 PATCH empty name → 400 with validation error — e9c2472
- [x] 1.5 DELETE config → row removed from Studio — e9c2472
- [x] 1.6 PATCH/DELETE unauthenticated → 401 — e9c2472

### Phase 2: Interactive ConfigCard and dashboard wiring

#### Automated

- [x] 2.1 `npx astro sync && npm run lint` passes — 6ca0f74
- [x] 2.2 `npm run build` exits 0 — 6ca0f74

#### Manual

- [x] 2.3 Click Edit → card expands with pre-filled values — 6ca0f74
- [x] 2.4 Change numeric values → live total updates — 6ca0f74
- [x] 2.5 Save valid edit → redirect, card shows updated values — 6ca0f74
- [x] 2.6 Save edit with duplicate name → error inside card, card stays open — 6ca0f74
- [x] 2.7 Click Delete → confirm step appears — 6ca0f74
- [x] 2.8 Confirm delete → config gone from list after redirect — 6ca0f74
- [x] 2.9 Cancel edit → card returns to view mode — 6ca0f74
- [x] 2.10 Cancel delete → card returns to view mode — 6ca0f74
