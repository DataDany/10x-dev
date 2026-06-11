# Plan: Cloudflare Workers — First Deploy Integration

## Context

`10xStronger` to aplikacja Astro 6 + React 19 + Supabase. Decyzja infrastrukturalna
(infrastructure.md) wybrała Cloudflare Workers. Deploy jest obsługiwany przez
**Cloudflare Workers Builds** (Git integration) — Cloudflare łączy się z repo GitHub,
buduje i deployuje automatycznie na każdy push do `main`. GitHub Actions robi wyłącznie
CI (lint + build check), bez kroku deploy.

Podejście eliminuje potrzebę `CLOUDFLARE_API_TOKEN` w GitHub Secrets i daje
Cloudflare pełną kontrolę nad cyklem build→deploy.

**Zasada**: każdy krok z checkboxem `[ ]` jest wykonywalny atomowo. Fazy 4–5 wymagają
ręcznych akcji w Cloudflare Dashboard i terminalu. Fazy 1, 3 i 6 to zmiany w kodzie.

---

## Phase 0 — Store plan `[code]`

- [x] Utwórz `context/changes/deployment/deployment-plan.md` jako kopię tego planu

---

## Phase 1 — wrangler.jsonc corrections `[code]`

> **Dlaczego**: `main: "@astrojs/cloudflare/entrypoints/server"` to entry point adaptera
> dla `wrangler dev`. Przy produkcyjnym deploy po `astro build` wrangler deployuje
> skompilowany artefakt — oficjalny Cloudflare + Astro Workers guide podaje
> `dist/_worker.js/index.js` jako wartość `main`.
> `name: "10x-astro-starter"` to nazwa szablonu, nie projektu — zmiana ustawia
> właściwą nazwę Workera na Cloudflare.

**Plik**: `wrangler.jsonc`

- [x] Zmień `name` z `"10x-astro-starter"` na `"10x-stronger"`
- [x] Zmień `main` z `"@astrojs/cloudflare/entrypoints/server"` na `"./dist/_worker.js/index.js"`

Wynik końcowy:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "10x-stronger",
  "main": "./dist/_worker.js/index.js",
  "compatibility_date": "2026-05-08",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist",
    "not_found_handling": "404-page",
  },
  "observability": {
    "enabled": true,
  },
}
```

> **Edge case**: wrangler 4+ automatycznie wyklucza `_worker.js/` z ASSETS binding,
> więc `assets.directory: "./dist"` i `main: "./dist/_worker.js/index.js"` współistnieją
> bez konfliktu.

---

## Phase 2 — .dev.vars creation `[code + manual fill]`

> Cloudflare używa `.dev.vars` (nie `.env`) jako źródła sekretów dla `wrangler dev`.
> Plik nie istnieje w repo. Bez niego `wrangler dev` nie ma dostępu do Supabase.

- [x] Utwórz `.dev.vars` jako kopię `.env.example`, uzupełnij realnymi wartościami
- [x] Zweryfikuj, że `.dev.vars` jest w `.gitignore`:
  ```bash
  git check-ignore -v .dev.vars
  ```
  Jeśli nie ma — dodaj `.dev.vars` do `.gitignore` przed commitem.

```
SUPABASE_URL=http://127.0.0.1:54321      # lub cloud URL
SUPABASE_KEY=<anon key>
```

---

## Phase 3 — Build & output verification `[manual]`

> Weryfikacja, że build produkuje oczekiwany artefakt przed setup Cloudflare.

- [x] Uruchom build:
  ```bash
  npx astro sync && npm run build
  ```
- [x] Zweryfikuj artefakt:
  ```bash
  test -f dist/server/entry.mjs && echo "OK" || echo "MISSING"
  ls -la dist/server/
  ```

> **Korekta — rzeczywista struktura dist**: adapter `@astrojs/cloudflare` produkuje
> `dist/server/entry.mjs` + `dist/server/wrangler.json` + `dist/client/` — nie
> `dist/_worker.js/index.js`. `dist/server/wrangler.json` to pełna konfiguracja deploy
> wygenerowana przez adapter; `npm run deploy` używa jej przez
> `wrangler deploy --config dist/server/wrangler.json`.

> **Edge case — brak `dist/server/entry.mjs`**: Sprawdź wersję adaptera
> (`npm ls @astrojs/cloudflare` — musi być ≥ 12.0.0) i `output: "server"` w
> `astro.config.mjs`.

> **Edge case — `astro dev` vs `wrangler dev`**: `npm run dev` używa `astro dev` z
> `platformProxy` (dobra aproksymacja workerd). Dla pełnej wierności produkcyjnej użyj
> `npx wrangler dev` po buildzie — przydatne przy debugowaniu limitów CPU i Web API.

---

## Phase 4 — Cloudflare one-time setup `[manual — human action]`

### 4a — Zaloguj wrangler lokalnie

- [x] ````````````bash
                                          npx wrangler login
                                          ```
                                      (OAuth flow w przeglądarce. Wymagane do ustawienia sekretów Workera.)
                                      ````
                                  `````
                              ``````
                          ```````
                      ````````
                  `````````
              ``````````
          ```````````
      ````````````

### 4b — Ustaw sekrety Workera

> Sekrety muszą być ustawione PRZED pierwszym deploy — Cloudflare Workers Builds
> je załaduje. `wrangler secret put` działa nawet gdy Worker jeszcze nie istnieje.

- [x] ````````````bash
                                          npx wrangler secret put SUPABASE_URL
                                          # prompt: wklej URL Supabase (cloud, nie localhost)
                                          npx wrangler secret put SUPABASE_KEY
                                          # prompt: wklej anon key
                                          ```
                                      ````
                                  `````
                              ``````
                          ```````
                      ````````
                  `````````
              ``````````
          ```````````
      ````````````
- [x] Zweryfikuj: `npx wrangler secret list` — powinny pojawić się nazwy obu sekretów

> **Edge case — lokalny Supabase w produkcji**: `http://127.0.0.1:54321` jest
> nieosiągalny z Cloudflare. Dla produkcji wymagany cloud Supabase project
> (supabase.com → nowy projekt → skopiuj URL i anon key z Settings → API).

### 4c — Podłącz repo do Cloudflare Workers Builds

> Cloudflare Workers Builds to Git integration: Cloudflare buduje i deployuje
> automatycznie na każdy push do wybranego brancha.

- [x] Cloudflare Dashboard → **Workers & Pages** → **Create** → **Import an existing repository** (lub "Connect to Git")
- [x] Autoryzuj Cloudflare GitHub App dla tego repo
- [x] Wybierz repo `10x-dev` (lub właściwą nazwę), branch: **`main`**
- [x] Skonfiguruj build settings:
  - **Build command**: `npm run deploy` _(nie `npm run build` — patrz korekta poniżej)_
  - **Build output directory**: `dist`
  - **Root directory**: `/` (root repo)
  - **Node.js version**: `22`
- [x] Potwierdź — Cloudflare wykona pierwszy deploy automatycznie

> **Korekta — build command musi być `npm run deploy`**: Workers Builds używa root
> `wrangler.jsonc` do deploymentu, ale `main` tam wskazuje na adapter dev entry
> (`@astrojs/cloudflare/entrypoints/server`), nie na zbudowany artefakt. Poprawne
> podejście: `npm run deploy` uruchamia `astro build && wrangler deploy --config
dist/server/wrangler.json`, używając konfiguracji wygenerowanej przez adapter.
> Workers Builds działa w autoryzowanym środowisku Cloudflare — `wrangler deploy`
> w build command nie wymaga osobnego `CLOUDFLARE_API_TOKEN`.
> **Jeśli Workers Builds jest już skonfigurowany z `npm run build`, zmień build
> command w Dashboard → Worker → Build settings.**

> **Edge case — Cloudflare Workers Builds vs Cloudflare Pages**: Upewnij się, że
> tworzysz **Worker** (Workers & Pages → Workers), nie Pages project. Dla Astro SSR
> na Workers adapter jest `@astrojs/cloudflare` celujący w Workers runtime.
> Cloudflare Pages z SSR używa innego adaptera i innego flow — nie mieszaj.

> **Edge case — build command z astro sync**: Jeśli deploy failuje z błędem
> "Cannot find module 'astro:env'", zmień build command na:
> `npx astro sync && npm run deploy`.

> **Edge case — SUPABASE_URL/KEY w Workers Builds env**: Cloudflare Workers Builds
> używa secretów ustawionych przez `wrangler secret put` (z Phase 4b) dla runtime
> Workera. Dla **build-time** env vars (jeśli `astro build` potrzebuje tych wartości):
> Dashboard → Worker → Settings → Variables and Secrets → dodaj `SUPABASE_URL` i
> `SUPABASE_KEY` jako encrypted variables. Sprawdź: `astro.config.mjs` ma je jako
> `optional: true` — build przejdzie bez nich; runtime je potrzebuje.

---

## Phase 5 — Verify first Cloudflare deploy `[manual]`

- [ ] Poczekaj na zakończenie pierwszego buildu w Cloudflare Dashboard
- [ ] Sprawdź URL Workera (format: `https://10x-stronger.<subdomain>.workers.dev`)
- [ ] Poczekaj ~30s po deployment complete (propagacja):
  ```bash
  sleep 30 && curl -I https://10x-stronger.<subdomain>.workers.dev/
  ```
- [ ] Przetestuj flow auth w przeglądarce:
  - Strona główna ładuje się
  - `/dashboard` redirectuje na `/auth/signin`
  - Signup / login / logout działają end-to-end

> **Edge case — 500 errors po deploy**: Sprawdź logi w Cloudflare Dashboard →
> Worker → Logs (lub `npx wrangler tail`). Najczęstsze przyczyny:
>
> 1. Sekrety nie ustawione → `SUPABASE_URL` undefined → `wrangler secret list`
> 2. `wrangler deploy` użył złego config → sprawdź `dist/server/wrangler.json` i ścieżkę `main`

> **Edge case — build fail w Cloudflare**: Jeśli build failuje w Workers Builds ale
> przechodzi lokalnie, sprawdź: (a) wersja Node.js (Dashboard → Worker → Build settings
> → Node version = 22), (b) czy `npm ci` jest używany (Cloudflare domyślnie go używa —
> `package-lock.json` musi być w repo).

---

## Phase 6 — GitHub Actions CI update `[code]`

> CI w GitHub Actions robi wyłącznie lint + build check. Brak deploy step — deploy
> obsługuje Cloudflare. Jedyna zmiana: naprawa brancha z `master` na `main`.

**Plik**: `.github/workflows/ci.yml`

- [x] Zmień branch target z `master` na `main` (repo jest na `main`, CI dotychczas
      triggerowało na nieistniejący branch `master`)
- [x] Dodaj krok weryfikacji artefaktu build (pre-deploy safety net)
- [x] Brak kroku deploy — obsługuje Cloudflare Workers Builds

Wynik końcowy `ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npx astro sync

      - run: npm run lint

      - name: Build
        run: npm run build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}

      - name: Verify build artifact
        run: test -f dist/server/entry.mjs || (echo "ERROR: dist/server/entry.mjs missing" && exit 1)
```

> **Uwaga**: `SUPABASE_URL` i `SUPABASE_KEY` w GitHub Secrets są potrzebne tylko
> jeśli `astro build` ich wymaga w trakcie budowania (np. pre-rendering stron).
> Przy `optional: true` w `astro.config.mjs` build przejdzie nawet bez nich.
> Dodaj je do GitHub Secrets jako ostrożność (Settings → Secrets → Actions).

---

## Phase 7 — End-to-end verification `[manual]`

- [ ] Zrób commit i push zmian (ci.yml):
  ```bash
  git add .github/workflows/ci.yml
  git commit -m "deploy: configure Cloudflare Workers build integration"
  git push origin main
  ```
- [ ] GitHub Actions CI: przechodzi zielono (lint + build + artifact check)
- [ ] Cloudflare Workers Builds: triggeruje automatycznie, build i deploy kończą się sukcesem
- [ ] Worker URL: odpowiada poprawnie
- [ ] Auth flow: signup → login → dashboard → logout działa end-to-end

---

## Critical files

| Plik                       | Zmiana                                         |
| -------------------------- | ---------------------------------------------- |
| `wrangler.jsonc`           | `name` (już był poprawny; `main` bez zmian)    |
| `.github/workflows/ci.yml` | branch `master` → `main`, artifact verify step |
| `.dev.vars`                | nowy plik (gitignored, wypełniony ręcznie)     |

## Manual-only steps (nie wchodzą do kodu)

| Krok                                     | Gdzie                |
| ---------------------------------------- | -------------------- |
| `wrangler login`                         | terminal             |
| `wrangler secret put SUPABASE_URL/KEY`   | terminal             |
| Podłączenie repo do Workers Builds       | Cloudflare Dashboard |
| Build command: `npm run deploy`, Node 22 | Cloudflare Dashboard |

## Verification checklist

- [ ] `npm run build` → `dist/server/entry.mjs` istnieje
- [ ] `npx wrangler secret list` → oba sekrety widoczne
- [ ] Cloudflare Workers Builds → build i deploy bez błędów
- [ ] Worker URL → HTTP 200 na stronie głównej
- [ ] Auth flow działa end-to-end na Worker URL
- [ ] GitHub Actions CI → zielony na push do `main`
