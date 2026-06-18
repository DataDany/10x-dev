# Plan Brief: Dumbbell Config Calculator (S-01)

## What we're building

A form on `/dashboard` where a logged-in user creates dumbbell configurations (name, handle weight, plate weight, plate count) and sees saved configs as cards. A live "Total: X.X kg" panel updates with every keystroke using `handle_weight + (plate_weight × plate_count)`.

## 3 phases

| #   | Name                  | Key deliverable                                                                                                                                                 |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | POST API route        | `src/pages/api/equipment/configs.ts` — validates inputs, inserts into Supabase, redirects; handles duplicate name (Postgres code 23505) with a specific message |
| 2   | React components      | `ConfigForm.tsx` (live calc, `client:load`), `ConfigCard.tsx` (static), `ConfigList.tsx` (static grid or empty state)                                           |
| 3   | Dashboard integration | `src/pages/dashboard.astro` — SSR config fetch, mounts form + list, reads `?error` query param                                                                  |

## Key constraints

- `equipment_type` hardcoded to `'dumbbell'` — not a user input in S-01
- `user_id` must be passed explicitly in the INSERT payload (`context.locals.user.id`)
- `ConfigList` and `ConfigCard` render without `client:*` (static HTML); only `ConfigForm` needs `client:load`
- No GET API route — configs fetched server-side in the Astro page

## Patterns to follow

- API route: `src/pages/api/auth/signup.ts`
- Form component: `src/components/auth/SignUpForm.tsx`
- Reuse: `FormField`, `SubmitButton`, `ServerError` from `src/components/auth/`
- Types: `Database['public']['Tables']['equipment_configs']['Row']` from `src/types/database.types.ts`
