---
bootstrapped_at: 2026-06-08T16:17:00Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: 10x-stronger
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: 10x-stronger
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack

A solo developer shipping a small home-gym weight calculator in one week, with email-and-password authentication as the only technology-forcing feature, needs a starter that handles auth and database out of the box without configuration overhead. 10x Astro Starter (Astro 6 + React 19 + TypeScript + Tailwind + Supabase + Cloudflare Pages) is the recommended default for `(web-app, js)`, clears all four agent-friendly quality gates, and ships Supabase auth and PostgreSQL on day one — matching FR-001 and FR-002 directly. The 1-week timeline and small user base favour a batteries-included edge deployment over a self-managed server; Cloudflare Pages is the starter's default deploy target and the cheapest operational path for a project at this scale. CI runs on GitHub Actions with auto-deploy-on-merge — the right shape for a solo, shipping-first project.

## Pre-scaffold verification

| Signal      | Value                                                     | Severity | Notes                                      |
| ----------- | --------------------------------------------------------- | -------- | ------------------------------------------ |
| npm package | not run                                                   | n/a      | cmd_template starts with `git clone`; npm check skipped |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-05-17 | fresh    | from card.docs_url via `gh api`            |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone (clone starter repo without keeping its git history)
**Exit code**: 0
**Engine warnings**: Node.js v21.4.0 in use; starter requires `>=22.12.0`. Install completed with EBADENGINE warnings for astro, vite, wrangler, miniflare, @astrojs/react, and others. Upgrade Node to >=22.12.0 before running the dev server.
**Files moved**: 20 (`.env.example`, `.github/`, `.gitignore`, `.husky/`, `.nvmrc`, `.prettierrc.json`, `.vscode/`, `README.md`, `astro.config.mjs`, `components.json`, `eslint.config.js`, `node_modules/`, `package-lock.json`, `package.json`, `public/`, `src/`, `supabase/`, `tsconfig.json`, `wrangler.jsonc`)
**Conflicts (.scaffold siblings)**: `CLAUDE.md` → `CLAUDE.md.scaffold`
**.gitignore handling**: moved silently (no .gitignore existed in cwd)
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/2/0 direct of total 0/1/9/0

#### HIGH findings

- **devalue** (transitive) — "Svelte devalue: DoS via sparse array deserialization"
  - Advisory: GHSA-77vg-94rm-hx3p · CWE-770
  - CVSS: 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
  - Affected range: 5.6.3 – 5.8.0
  - Fix available: yes (update via transitive parent)

#### MODERATE findings

- **@astrojs/check** (direct, isDirect: true) — via `@astrojs/language-server` → `volar-service-yaml` → `yaml-language-server` → `yaml`. Fix: downgrade to `@astrojs/check@0.9.2` (semver major change).
- **@astrojs/language-server** (transitive) — via `volar-service-yaml`. Range: `>=2.14.0`. Fix tied to `@astrojs/check` downgrade.
- **@cloudflare/vite-plugin** (transitive) — via `miniflare`, `wrangler`, `ws`. Range: `<=0.0.0-fff677e35 || 0.0.7 – 1.37.2`. Fix available.
- **miniflare** (transitive) — via `ws`. Range: `<=0.0.0-fff677e35 || 3.20250204.0 – 4.20260518.0`. Fix available.
- **volar-service-yaml** (transitive) — via `yaml-language-server`. Range: `<=0.0.70`. Fix tied to `@astrojs/check` downgrade.
- **wrangler** (direct, isDirect: true) — via `miniflare` → `ws`. Range: `<=0.0.0-kickoff-demo || 3.108.0 – 4.93.0`. Fix available.
- **ws** (transitive) — "ws: Uninitialized memory disclosure" · GHSA-58qx-3vcg-4xpx · CWE-908 · CVSS 4.4. Range: `8.0.0 – 8.20.0`. Fix available.
- **yaml** (transitive) — "yaml vulnerable to Stack Overflow via deeply nested YAML collections" · GHSA-48c2-rrv3-qjmp · CWE-674 · CVSS 4.3. Range: `2.0.0 – 2.8.2`. Fix tied to `@astrojs/check` downgrade.
- **yaml-language-server** (transitive) — via `yaml`. Fix tied to `@astrojs/check` downgrade.

## Hints recorded but not acted on

| Hint                    | Value              |
| ----------------------- | ------------------ |
| bootstrapper_confidence | first-class        |
| quality_override        | false              |
| path_taken              | standard           |
| self_check_answers      | null               |
| team_size               | solo               |
| deployment_target       | cloudflare-pages   |
| ci_provider             | github-actions     |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true               |
| has_payments            | false              |
| has_realtime            | false              |
| has_ai                  | false              |
| has_background_jobs     | false              |

These fields are preserved in the audit trail. A future M1L4 skill ("Memory Architecture") will act on them to generate CLAUDE.md and AGENTS.md entries.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Upgrade Node.js to >=22.12.0 (the starter's minimum) before running `npm run dev`.
- Review `CLAUDE.md.scaffold` — diff it against the existing `CLAUDE.md` to see what the starter ships vs what you have.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log. Running `npm audit fix` resolves most MODERATE findings; the HIGH `devalue` finding is transitive and will resolve when an upstream update ships.
