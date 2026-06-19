# Config Management — Plan Brief

> Full plan: `context/changes/config-management/plan.md`

## What & Why

Add edit and delete to existing equipment config cards (S-02). Users currently can only create configs — they can't fix a typo in a name or remove a config they no longer need, which means they're stuck deleting and recreating every time anything changes.

## Starting Point

`ConfigCard` is a static HTML component with no buttons or state. `ConfigList` has no `client:*` directive. Only a POST handler exists at `/api/equipment/configs.ts` — no PATCH, DELETE, or dynamic `[id]` routes.

## Desired End State

Each card on the dashboard has an Edit button (inline form expansion with live calc, pre-filled values, Save/Cancel) and a Delete button (inline confirm step, Yes/Cancel). Both communicate via `fetch()` to new JSON API endpoints. On success, the page reloads to `/dashboard` to pick up fresh SSR data.

## Key Decisions Made

| Decision               | Choice                               | Why (1 sentence)                                                         | Source |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------ | ------ |
| Edit UI location       | Inline card expansion                | No navigation needed; faster UX                                          | Plan   |
| Delete confirmation    | Inline toggle on the card            | Lightweight, no modal component needed                                   | Plan   |
| API communication      | `fetch()` from React (PATCH/DELETE)  | HTML forms can't send PATCH/DELETE; ConfigCard already needs React state | Plan   |
| After mutation         | Full redirect to `/dashboard`        | Consistent with S-01; SSR data is always fresh                           | Plan   |
| Duplicate name on edit | Error inside card, card stays open   | User doesn't lose in-progress edit state                                 | Plan   |
| Edit scope             | All 4 fields editable including name | FR-006 requires editing any field                                        | Plan   |
| Live calc in edit      | Yes, same as create form             | Core product value prop; consistency                                     | Plan   |

## Scope

**In scope:** PATCH endpoint, DELETE endpoint, interactive ConfigCard (edit + confirm-delete modes), `client:load` on ConfigList

**Out of scope:** soft-delete, optimistic UI, separate edit page, equipment_type editing, client-side list state management

## Architecture / Approach

New file `src/pages/api/equipment/configs/[id].ts` exports `PATCH` and `DELETE` — both return JSON (`{ success: true }` or `{ error: string }`), no redirects. ConfigCard gains React state (`mode`, edit fields, errors, loading). `dashboard.astro` adds `client:load` to `<ConfigList>` — one line change that hydrates the entire card grid.

## Phases at a Glance

| Phase                                        | What it delivers                                | Key risk                                                              |
| -------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| 1. JSON API endpoints                        | PATCH + DELETE at `/api/equipment/configs/[id]` | RLS must scope mutations to owner; 23505 must map to readable message |
| 2. Interactive ConfigCard + dashboard wiring | Edit/delete UX, `client:load` on ConfigList     | ConfigCard state initialization from prop must only run once          |

**Prerequisites:** S-01 implemented (equipment_configs table + ConfigCard exist)
**Estimated effort:** ~1 session across 2 phases

## Open Risks & Assumptions

- `window.location.href` reload after mutation is acceptable latency (no optimistic removal)
- No undo after delete — hard delete is intentional per plan scope
