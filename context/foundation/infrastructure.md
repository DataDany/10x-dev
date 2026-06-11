---
project: 10xStronger
researched_at: 2026-06-11
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 + React 19
  runtime: Cloudflare Workers (workerd)
  database: Supabase (external)
---

## Recommendation

**Deploy on Cloudflare Workers.**

Cloudflare Workers to jedyna platforma w zbadanym zbiorze, która jednocześnie spełnia wszystkie twarde kryteria (CLI-first, managed/serverless, agent-readable docs, stable deploy API), kosztuje $0 na poziomie ruchu solo projektu (100k req/dzień gratis, ~3M/miesiąc), i jest już osadzona w tech stacku — `@astrojs/cloudflare` v13+ oraz `wrangler.jsonc` z `nodejs_compat` są w repo. Jedyna wymagana korekta to zmiana `deployment_target` z `cloudflare-pages` na `cloudflare-workers` (adapter v13 usunął Pages SSR) i weryfikacja ścieżki `main` w `wrangler.jsonc`.

## Platform Comparison

| Platforma              | CLI-first | Managed / Serverless | Agent docs | Stable deploy | MCP                              | Koszt @ 100k req/mies.         |
| ---------------------- | --------- | -------------------- | ---------- | ------------- | -------------------------------- | ------------------------------ |
| **Cloudflare Workers** | **Pass**  | **Pass**             | **Pass**   | **Pass**      | Partial (open beta)              | **$0**                         |
| Vercel                 | Pass      | Pass                 | Pass       | Pass          | Partial (public beta, read-only) | $0 (non-commercial)            |
| Netlify                | Partial   | Pass                 | Pass       | Pass          | **Pass** (GA)                    | $0 (credit-based, pause risk)  |
| Railway                | Pass      | Partial              | Pass       | Pass          | Partial (beta)                   | ~$5/miesiąc (Hobby min.)       |
| Render                 | Partial   | Partial              | Pass       | Partial       | Pass (GA)                        | $0 (cold starts) lub $7/mies.  |
| Fly.io                 | Pass      | Partial              | Partial    | Pass          | Partial (experimental)           | ~$2–5/miesiąc (brak free tier) |

### Shortlisted Platforms

#### 1. Cloudflare Workers (Rekomendacja)

Najlepsze dopasowanie do stacku: adapter `@astrojs/cloudflare` v13 celuje w Workers (nie Pages), `wrangler.jsonc` jest już w repo z prawidłowymi flagami, docs są dostępne jako `llms.txt` i `llms-full.txt`. Free tier (100k req/dzień) nie zostanie przekroczony przy solo użytkowaniu. Cztery pełne passy z pięciu kryteriów; jedynym partial jest MCP w open beta — nie jest blokujące dla MVP. Jedyna platforma, na której zmiana `deployment_target` w `tech-stack.md` jest kosmetyczna, nie architektoniczna.

#### 2. Vercel

Cztery passy z pięciu (tyle samo co Cloudflare), free Hobby plan, dojrzałe CLI, docs w `llms.txt`. Dwa ograniczenia istotne dla decyzji: (a) Hobby plan jest non-commercial — projekt z płatną warstwą premium wymaga Pro ($20/mies.); (b) rollback na Hobby jest ograniczony do jednego poprzedniego deploymentu. Dla projektu bez planów monetyzacji w MVP to akceptowalne. Gdyby Cloudflare Workers nie było w stacku, Vercel byłby naturalnym wyborem.

#### 3. Netlify

Cztery passy, MCP już GA (jedyny z trójki na poziomie GA), free tier oparty na kredytach. Dwa ryzyka: (a) credit-based model od września 2025 powoduje pełne wstrzymanie strony (503) po wyczerpaniu kredytów — bez graceful degradation; (b) adapter 6.5.x miał regresję łamiącą SSR API routes (zidentyfikowane, naprawione w patchu, ale historia powtarzalnych problemów z adapterem). MCP GA jest realnym atutem dla agent-driven workflows, ale reszta profilu przegrywa z Cloudflare i Vercel przy priorytycie kosztu i stabilności.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Słabości

1. **Dokumentacja Cloudflare nadal pokazuje stary flow Pages SSR.** GitHub issue #30405 (2026-04-29, open) — oficjalne docs wskazują `wrangler pages deploy` dla Astro, podczas gdy adapter v13 wymaga `wrangler deploy` (Workers). Agent czytający stare docs wykona deploy statyczny bez SSR, bez błędu exit code, bez widocznego symptomu poza brakiem server-side renderowania.

2. **10ms CPU limit na free tierze jest ciasny przy rozbudowie.** Kalkulator wag mieści się w limicie. Ale `Promise.all()` z kilkoma zapytaniami Supabase liczy CPU sumując czas wszystkich Promise. Każde przyszłe rozszerzenie (listy konfiguracji z DB, sortowanie server-side) może trafić w limit i zwrócić `1101 Worker threw exception` bez stack trace. Naprawa: Workers Paid ($5/mies.) lub Hyperdrive.

3. **`wrangler deploy` zwraca exit 0 przy złej ścieżce `main`.** Jeśli `wrangler.jsonc` wskazuje na nieaktualny output path (zmienił się między wersjami adaptera), deploy kończy się sukcesem, Worker serwuje pustą odpowiedź. Brak pre-deploy validation w CI jest ślepą plamą.

4. **`wrangler dev` ≠ `astro dev`.** `astro dev` używa Node.js runtime, `wrangler dev` używa workerd. Kod działający przez `astro dev` może cicho failować na Workers (CommonJS modules, `process.env` zamiast env bindings). Testowanie musi odbywać się przez `npm run dev` (z wranglerem).

5. **Zmiana sposobu dostępu do env vars między wersjami adaptera.** `Astro.locals.runtime.env` usunięte w v13 — env vars dostępne przez bezpośredni import. Upgrade adaptera bez tej zmiany daje `undefined` dla `SUPABASE_URL` w produkcji bez żadnego build-time error.

### Pre-Mortem — Jak to się może posypać

Deploy na Cloudflare Workers działał przez pierwsze dwa tygodnie bez zarzutu. Kalkulator wag renderował się błyskawicznie. Pierwsze problemy zaczęły się przy rozszerzaniu aplikacji.

Deweloper dodał server-side rendering listy konfiguracji z Supabase — trzy zapytania na załadowanie strony dashboard. `Promise.all()` z trzema fetch calls do Supabase liczyło CPU burst addytywnie. Zimne połączenie do Supabase (connection pool rebuild) trwało 180ms, z czego ~80ms to CPU time Workera. Dashboard zaczął sporadycznie zwracać `1101` pod obciążeniem. Deweloper nie wiedział o addytywnym sumowaniu CPU w Promise.all. Stracił dwa wieczory zanim znalazł przyczynę i dodał Hyperdrive.

Trzy miesiące później CI wykonało automatyczny upgrade `@astrojs/cloudflare` z v13 na v14. Build przeszedł, `wrangler deploy` zwrócił exit 0, ale adapter v14 zmienił ścieżkę outputu (`_worker.js/index.js` → nowa), `main` w `wrangler.jsonc` był nieaktualny. Przez 6 godzin aplikacja serwowała 500 errors. Brak walidacji pre-deploy w pipeline (sprawdzenie czy plik pod `main` istnieje) był ślepą plamą w CI.

Lekcja: Cloudflare Workers to doskonała platforma, ale wymaga świadomego zarządzania zależnością adapter-wersja ↔ `wrangler.jsonc` konfiguracja. Ta zależność musi być checked w CI.

### Unknown Unknowns

- **Propagacja po `wrangler deploy` trwa 15–30 sekund.** Agent weryfikujący od razu po deployu może zobaczyć starą wersję i uznać deploy za nieudany.
- **`compatibility_date` w `wrangler.jsonc` musi być aktualizowana przy upgrade adaptera.** Stara data = stary runtime Workers API mode; maskuje błędy nowego adaptera.
- **Supabase z Workera = HTTP (fetch), nie TCP.** `@supabase/supabase-js` działa natywnie. Bezpośrednie połączenie Postgres (drizzle-kit, pg) wymaga `cloudflare:sockets` — nie ma go domyślnie w `wrangler.jsonc`.
- **Free tier 100k req/dzień dotyczy całego konta Cloudflare, nie projektu.** Inne Workers na tym samym koncie współdzielą pulę.
- **`wrangler tail` to real-time stream, nie persistent logging.** Retrospektywna analiza błędów po incydencie jest niemożliwa bez zewnętrznego loggera (Logpush, Sentry).

## Operational Story

- **Preview deploys**: Każdy push do brancha tworzy preview URL przez `wrangler versions deploy --experimental-versions`. W praktyce dla solo MVP: wdrożenie bezpośrednio na production przez `wrangler deploy` jest akceptowalne. Cloudflare Pages (statyczne) miało automatyczne preview per PR — Workers wymaga jawnego skryptu CI dla preview.
- **Secrets**: `SUPABASE_URL` i `SUPABASE_KEY` przechowywane jako Workers Secrets (`npx wrangler secret put SUPABASE_URL`). Lokalne dev: `.dev.vars` (już w projekcie). Sekrety widoczne wyłącznie dla właściciela konta; nie są eksponowane w kodzie ani logach.
- **Rollback**: `npx wrangler rollback [version-id]` — lista wersji przez `npx wrangler versions list`. 100 ostatnich wersji dostępnych (zwiększone z 10 we wrześniu 2025, GA). Rollback tworzy nowy deployment w ciągu kilku sekund. Uwaga: migracje DB w Supabase nie rollbackują się automatycznie.
- **Approval**: Deploy produkcyjny przez `wrangler deploy` — może być wykonany przez agenta po akceptacji planu. Rotacja sekretów, zmiana planów billing, usuwanie projektów — wymagają ręcznej akcji właściciela konta. Agent nie może wykonać tych akcji bez dostępu do Cloudflare dashboard lub tokenu API z odpowiednimi uprawnieniami.
- **Logs**: `npx wrangler tail` — real-time streaming logów runtime. `npx wrangler deployments list` — historia deploymentów. Brak persistent log storage na free tierze; dla retrospektywnej analizy wymagany zewnętrzny provider (Logpush na Paid tierze lub Sentry).

## Risk Register

| Ryzyko                                                                                                  | Źródło           | Prawdopodobieństwo | Wpływ | Mitygacja                                                                                                                     |
| ------------------------------------------------------------------------------------------------------- | ---------------- | ------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| `wrangler.jsonc` main path niezgodny z wersją adaptera — deploy sukces, Worker serwuje puste odpowiedzi | Devil's advocate | M                  | H     | Dodać do CI pre-deploy check: `test -f dist/_worker.js/index.js` przed `wrangler deploy`                                      |
| Upgrade adaptera zmienia sposób dostępu do env vars (locals.runtime.env usunięte w v13)                 | Research finding | M                  | H     | Dodać integration test sprawdzający `SUPABASE_URL` w runtime przed każdym release; dokumentować breaking changes adaptera     |
| 10ms CPU limit na free tierze trafiony przy rozbudowie (Promise.all + Supabase queries)                 | Devil's advocate | L                  | M     | Benchmarkować każdą nową server-side stronę przez `wrangler dev`; przy przekroczeniu limit przejść na Workers Paid ($5/mies.) |
| Propagacja po deploy (~15–30s) — agent weryfikuje zbyt wcześnie i redeploys                             | Unknown unknowns | L                  | L     | Dodać `sleep 30` lub sprawdzanie wersji (`wrangler deployments list`) po deploy zamiast curl                                  |
| Stara docs Cloudflare nadal pokazuje Pages SSR flow                                                     | Research finding | M                  | M     | Zawsze używać `wrangler deploy` (Workers), nigdy `wrangler pages deploy` dla SSR; zweryfikować po każdym upgrade wranglera    |
| Brak persistent logging na free tierze — incydent trudny do zdiagnozowania po fakcie                    | Unknown unknowns | M                  | M     | Dodać Sentry SDK do projektu dla error tracking; rozważyć Cloudflare Logpush na Paid tierze przy wzroście ruchu               |
| `compatibility_date` nieaktualna po upgrade adaptera — błędy maskowane przez stary runtime mode         | Unknown unknowns | L                  | M     | Aktualizować `compatibility_date` w `wrangler.jsonc` przy każdym upgrade adaptera; trzymać datę w ciągu ostatnich 6 miesięcy  |

## Getting Started

1. **Zaktualizuj `wrangler.jsonc`** — upewnij się, że `main` wskazuje na `./dist/_worker.js/index.js` (output adaptera v13) i że `compatibility_date` jest z ostatnich 6 miesięcy.

2. **Skonfiguruj sekrety produkcyjne:**

   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_KEY
   ```

3. **Zbuduj i deployuj:**

   ```bash
   npx astro sync
   npm run build
   npx wrangler deploy
   ```

   Użyj `wrangler deploy`, **nie** `wrangler pages deploy` — Pages SSR nie jest wspierane przez adapter v13+.

4. **Zweryfikuj deployment** (poczekaj ~30 sekund po deployu przed weryfikacją):

   ```bash
   npx wrangler deployments list   # sprawdź status
   npx wrangler tail               # obserwuj logi w real-time
   ```

5. **Dodaj pre-deploy check do CI** (`.github/workflows/ci.yml`):
   ```bash
   # Po npm run build, przed wrangler deploy:
   test -f dist/_worker.js/index.js || (echo "Build output missing" && exit 1)
   ```

## Out of Scope

Następujące kwestie nie były oceniane w tym badaniu:

- Konfiguracja Dockerfile i obrazy kontenerowe
- Konfiguracja pipeline CI/CD (poza podstawowym pre-deploy check)
- Architektura produkcyjna (multi-region, HA, disaster recovery)
- Konfiguracja Cloudflare Logpush ani zewnętrznego monitoringu
