---
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
---

## Why this stack

A solo developer shipping a small home-gym weight calculator in one week, with email-and-password authentication as the only technology-forcing feature, needs a starter that handles auth and database out of the box without configuration overhead. 10x Astro Starter (Astro 6 + React 19 + TypeScript + Tailwind + Supabase + Cloudflare Pages) is the recommended default for `(web-app, js)`, clears all four agent-friendly quality gates, and ships Supabase auth and PostgreSQL on day one — matching FR-001 and FR-002 directly. The 1-week timeline and small user base favour a batteries-included edge deployment over a self-managed server; Cloudflare Pages is the starter's default deploy target and the cheapest operational path for a project at this scale. CI runs on GitHub Actions with auto-deploy-on-merge — the right shape for a solo, shipping-first project.
