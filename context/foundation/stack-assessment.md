---
project: 10xStronger
assessed_at: 2026-06-08T16:30:00Z
agent_readiness: ready
context_type: greenfield
stack_components:
  language: TypeScript 5.9 (strict mode)
  framework: Astro 6.3 + React 19
  build_tool: Vite 7 (managed by Astro)
  styling: Tailwind CSS 4
  data_auth: Supabase (@supabase/ssr + @supabase/supabase-js)
  deployment_target: Cloudflare Pages/Workers
  package_manager: npm
  linter: ESLint 9 + typescript-eslint (strictTypeChecked)
  formatter: Prettier 3
  git_hooks: Husky + lint-staged
  test_runner: null
  ci_provider: GitHub Actions
gates_passed: 4
gates_failed: 0
---

## Stack Components

**Language — TypeScript 5.9 (strict mode)**
The project uses TypeScript with `"extends": "astro/tsconfigs/strict"` (tsconfig.json:2), which activates `strict: true`, `noImplicitAny`, `strictNullChecks`, and additional Astro-specific checks. ESLint is configured with `tseslint.configs.strictTypeChecked` and `tseslint.configs.stylisticTypeChecked` (eslint.config.js:15), adding type-aware linting on top of TypeScript's own checks. Path alias `@/*` resolves to `./src/*` via `compilerOptions.paths` (tsconfig.json:9–11).

**Framework — Astro 6.3 + React 19**
Astro runs in `output: "server"` mode (astro.config.mjs:7) with the Cloudflare adapter, meaning every page is server-rendered by default; React 19 interactive islands are opt-in via `client:*` directives. File-based routing maps `src/pages/*.astro` (and `src/pages/api/*.ts`) directly to URL paths. The scaffold ships `src/pages/`, `src/layouts/`, `src/components/`, `src/lib/`, and `src/middleware.ts` — all conventional Astro locations.

**Build tool — Vite 7 (managed by Astro)**
Vite is Astro's internal bundler; the project overrides to `vite@^7.3.2` (package.json:57–59). Tailwind CSS 4 is integrated via the `@tailwindcss/vite` plugin (astro.config.mjs:13). From a developer perspective, Astro fully owns Vite configuration — there is no standalone `vite.config.*` file.

**Data and auth — Supabase**
`@supabase/ssr@0.10.3` handles server-side Supabase client creation (request-scoped); `@supabase/supabase-js@2.99.1` is the base client. `src/lib/supabase.ts` holds the helper. Auth middleware likely lives in `src/middleware.ts`. Environment variables `SUPABASE_URL` and `SUPABASE_KEY` are typed via Astro's `envField` schema in `astro.config.mjs:17–22`.

**Deployment — Cloudflare Pages/Workers**
`@astrojs/cloudflare` adapter + `wrangler.jsonc` with `compatibility_flags: ["nodejs_compat"]`. The `nodejs_compat` flag enables a subset of Node.js standard library globals in the edge runtime (but not all — see instruction file additions below for the constraint).

**Toolchain**
ESLint 9 (flat config), Prettier 3, Husky pre-commit hook (lint + format), lint-staged targeting `.ts/.tsx/.astro` and `.json/.css/.md`. CI runs on GitHub Actions: `npm ci → npx astro sync → npm run lint → npm run build`. No test runner is configured.

---

## Quality Gate Assessment

| Component   | Typed | Convention | Training Data | Documented | Verdict        |
|-------------|:-----:|:----------:|:-------------:|:----------:|----------------|
| Language    |   ✓   |     —      |       —       |     —      | pass           |
| Framework   |   —   |     ✓      |       ✓       |     ✓      | pass           |
| Build tool  |   —   |     ✓      |       ✓       |     ✓      | pass           |
| Test runner |   —   |     —      |       —       |     —      | not configured |

*Legend: ✓ = pass, ✗ = fail, ~ = partial, — = not applicable*

### Gate Details

**Type safety — PASS**
Evidence: `tsconfig.json:2` `"extends": "astro/tsconfigs/strict"` activates TypeScript's strictest settings. `eslint.config.js:15` `tseslint.configs.strictTypeChecked` adds type-aware lint rules that catch unsafe casts, unhandled promises, and un-narrowed nulls at lint time. The entire `src/` tree — `.astro` files, `.ts` API routes, and `.tsx` React components — is covered by both checks.

**Convention-based — PASS**
Evidence: Astro's file-system router is deterministic: a file at `src/pages/foo/bar.astro` becomes `/foo/bar`. API endpoints live at `src/pages/api/*.ts`. Layouts compose via `src/layouts/*.astro`. The scaffold already populates these directories (src/pages/dashboard.astro, src/pages/auth/, src/components/auth/, src/middleware.ts). An agent navigating this tree can predict where any new page, API route, or layout should live without needing to read the entire codebase.

**Popularity in training data — PASS (assessed within JS family)**
Evidence: Astro, React, TypeScript, Tailwind CSS, and Supabase are all mainstream JS-ecosystem choices with extensive Stack Overflow, GitHub, and documentation coverage in training data. Astro's adoption curve accelerated with v3–v5 (50k+ GitHub stars); React is the dominant JS UI library. Both appear heavily in training data for JS/TypeScript projects.

**Documentation quality — PASS**
Evidence: All major components have official, versioned documentation: Astro (https://docs.astro.build), React (https://react.dev), Tailwind CSS v4 (https://tailwindcss.com/docs), Supabase (https://supabase.com/docs), Cloudflare Pages (https://developers.cloudflare.com/pages/), Vite (https://vitejs.dev). No scattered or out-of-sync community wikis relied upon.

---

## Gaps & Compensation

All four quality gates pass. No failed gates require compensation entries.

The one structural gap is the **absence of a test runner**. This is not a quality-gate failure (the matrix only scores configured components), but it means the agent cannot verify changes against tests, and the CI pipeline (`npm ci → lint → build`) provides no behavioral coverage.

**Recommended next step for testing**: Add Vitest for unit/integration tests and/or Playwright for end-to-end tests. Both are natively Vite-aware and well-suited for Astro projects. The ecosystem has strong training data for both. Neither requires changes to `astro.config.mjs`.

**Cloudflare edge runtime constraint (not a gate failure — operational note)**: The `nodejs_compat` flag exposes a Node.js API subset, not the full Node.js runtime. Modules using `fs`, `path`, `crypto` (Node implementation), or `child_process` will fail at runtime on Cloudflare. The agent should use Web APIs or Cloudflare-specific equivalents instead.

---

### Recommended Instruction File Additions

These are ready-to-paste entries for `CLAUDE.md` (or a future `AGENTS.md`). All four gates pass, so these entries are proactive convention documentation rather than gap compensation. They cover the stack-specific idioms most likely to trip an agent on first contact.

```markdown
## Stack conventions

### TypeScript

- `tsconfig.json` extends `astro/tsconfigs/strict`. Do not weaken strict settings.
- All new code must have explicit return types on exported functions and explicit types on public API boundaries.
- Path alias `@/*` resolves to `./src/*`. Use it for all cross-directory imports within `src/`.
- Prefer `type` imports (`import type { Foo } from '...'`) when importing only types.

### Astro routing

- Pages live in `src/pages/`. Each `.astro` file = one route. Dynamic segments use `[param].astro`.
- API endpoints (server functions) live in `src/pages/api/`. They export typed `APIRoute` handlers.
- Layouts live in `src/layouts/`. Compose layouts via `<Layout>` wrapper, not via inheritance.
- Middleware lives in `src/middleware.ts`. It uses Astro's `defineMiddleware` and runs on every server request.
- Utilities and SDK clients live in `src/lib/`. No business logic in pages directly — extract to lib.
- UI components live in `src/components/`. Astro components (`.astro`) for server-rendered content; React components (`.tsx`) for interactive islands only.

### React islands

- React components render on the server by default inside Astro files unless a `client:*` directive is used.
- Use `client:load` only when immediate interactivity is required; prefer `client:idle` or `client:visible` for non-critical islands.
- Do not put Supabase client calls inside React components — use Astro API routes instead and pass data as props.

### Supabase

- Use `@supabase/ssr` for all server-side Supabase access (Astro pages, API routes, middleware). Create a client per request — do not share a global client across requests.
- `src/lib/supabase.ts` holds the Supabase client factory. Import from there; do not construct clients inline.
- Environment variables `SUPABASE_URL` and `SUPABASE_KEY` are accessed via Astro's typed `import.meta.env`; they are never available in client-side code (both are `context: "server"` in `astro.config.mjs`).
- RLS (Row-Level Security) must be enabled on every Supabase table that holds user data. Never rely on application-layer checks alone.

### Cloudflare edge runtime

- The `nodejs_compat` flag is enabled in `wrangler.jsonc`, but only a subset of Node.js APIs is available. Do not use `fs`, `path` (Node's), `child_process`, `crypto` (Node's implementation), or `net`.
- Use `globalThis.crypto` (Web Crypto) instead of Node's `crypto`.
- Use `URL`, `fetch`, and `Request`/`Response` (Web APIs) for all HTTP/URL work.
- Do not use long-running timers or synchronous I/O — the edge runtime is request/response scoped.

### Toolchain

- Linting: `npm run lint` (ESLint 9, typescript-eslint strictTypeChecked). Fix all type-aware lint errors before committing.
- Formatting: Prettier 3 auto-runs on commit via lint-staged. Do not override Prettier formatting manually.
- CI gate: `npm ci → npx astro sync → npm run lint → npm run build`. A PR must pass all three steps to merge.
- No test runner is configured in v1. Do not add or reference test files until Vitest or Playwright is added to the project.
```

---

## Summary

The 10xStronger stack — TypeScript (strict) + Astro 6 + React 19 + Supabase + Cloudflare Pages — passes all four agent-friendly quality gates with no compensating entries required.

**Key strengths for agent workflows:**
- TypeScript in strict mode with type-aware ESLint gives the agent strong static signals about code shape and intent.
- Astro's file-system router eliminates routing ambiguity — the agent knows where any page or API route lives from its path alone.
- All major components (Astro, React, Supabase, Cloudflare, Vite) have official, versioned, well-maintained documentation the agent can reason about accurately.
- The pre-commit hook and CI pipeline provide fast feedback loops that catch type and lint issues before they compound.

**One structural gap:**
No test runner is configured. CI covers linting and build correctness, but there is no behavioral test coverage. Adding Vitest (unit/integration) and Playwright (end-to-end) is the recommended next step before implementing features.

**Recommended next step:** `/10x-health-check` — dependency audit, security scan, and CI/config completeness check against this assessed stack.
