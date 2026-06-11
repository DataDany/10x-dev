---
project: "10xStronger"
context_type: greenfield
created: 2026-06-08
updated: 2026-06-08
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1
  hard_deadline: "2026-06-15"
  after_hours_only: false
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain category"
      decision: "missing capability — no tool exists for adjustable plate dumbbells without weight markings"
    - topic: "persona scope"
      decision: "primarily the user himself (MVP); broader niche secondary"
    - topic: "insight"
      decision: "niche home gym problem — few people own this equipment type, so no dedicated app exists"
    - topic: "access model"
      decision: "login (email+password or OAuth); flat user model for MVP — each user sees only their own data; premium tiers post-MVP"
    - topic: "MVP scope"
      decision: "v1 = weight calculator only (handle + screws + plates); funny comparisons, stats, training plan are v2+"
    - topic: "timeline"
      decision: "1–2 weeks after hours"
  frs_drafted: 8
  quality_check_status: accepted
---

## Vision & Problem Statement

When someone asks a home gym user with adjustable plate dumbbells "how much can you lift?", they cannot answer — because their plates have no weight markings and they don't know the total weight on the bar. The same problem surfaces when trying to log a workout or assess strength progress: the data simply doesn't exist.

The insight: adjustable plate dumbbells without markings are a niche home gym product. Few people own them, so no dedicated tool has been built. The gap is real but small — which makes it a good fit for a focused solo-use MVP.

## User & Persona

**Primary persona:** Daniel — home gym owner with adjustable plate dumbbells that carry no weight markings. Trains after hours, alone. When he wants to know how much he lifted in a session or answer "how much do you press?" he currently either counts plates mentally or says "I don't know."

## Success Criteria

### Primary
- Użytkownik konfiguruje hantle (uchwyt + 2 śruby + płytki × liczba) i widzi poprawną łączną wagę w kg.

### Secondary
- Użytkownik może skonfigurować inne sprzęty (sztanga, kettle) tym samym mechanizmem.

### Guardrails
- Obliczenie wagi musi być zawsze arytmetycznie poprawne — błąd tutaj podważa cały sens aplikacji.
- Aplikacja musi być responsywna i działać na mobilnej przeglądarce (użytkownik korzysta przy treningu).
- Dane jednego użytkownika nie mogą być dostępne dla innego (izolacja kont).

## Functional Requirements

### Authentication

- FR-001: User can register an account with email and password. Priority: must-have
- FR-002: User can log in to their account. Priority: must-have

### Equipment configuration

- FR-003: User can create multiple equipment configurations (e.g. left dumbbell, right dumbbell), each with a name, handle weight, plate weight, and plate count. Priority: must-have
  > Socrates: Counter-argument considered: "too many fields — user may not know screw weight and abandon the form." Resolution: screw weight field removed entirely; mass is marginal, simplicity wins. Additionally clarified: user needs at least two separate configurations (one per dumbbell), so multi-config support is must-have, not nice-to-have.
- FR-004: User can set the number of plates on one equipment configuration. Priority: must-have
- FR-005: User can view the calculated total weight of any configuration (handle + plate × count). Priority: must-have
- FR-006: User can edit an existing equipment configuration. Priority: must-have
  > Socrates: Counter-argument considered: "redundant — user can just create a new config." Resolution: kept; weight changes as user gets stronger, so editing is a core recurring action, not polish.
- FR-007: User can delete an equipment configuration or individual components. Priority: must-have
  > Socrates: No counter-argument; kept. Needed to correct mistakes and keep the config list clean.

### Extended equipment

- FR-008: User can configure other equipment types (barbell, kettlebell) using the same component mechanism. Priority: nice-to-have
  > Socrates: Counter-argument considered: "expands scope before core works." Resolution: stays nice-to-have; if the config form is generic (equipment + components), other types cost near-zero to add and don't block MVP.

## Non-Goals

- No integrations with external sports platforms (Garmin, Strava, MyFitnessPal) — out of scope for v1; no external dependencies.
- No native mobile app — responsive web browser is sufficient for v1.
- No exercise technique coaching — the app calculates weight only, it does not instruct how to train.
- No funny comparisons, training statistics, or strength progression plans — these are v2+ features established during MVP scoping.

## User Stories

### US-01: User configures dumbbells and sees total weight

- **Given** a logged-in user who has not yet configured their dumbbells
- **When** they enter handle weight, screw weight, plate weight, and number of plates
- **Then** they see the total dumbbell weight calculated as: handle + (plate × count)

#### Acceptance Criteria
- All four inputs are required before a result is shown
- Result is displayed in kg with one decimal place
- Changing any input immediately recalculates the result

## Business Logic

The application calculates the actual total weight of a configured piece of equipment so the user never has to compute it mentally during training.

Inputs (user-facing): equipment name, handle weight (kg), plate weight (kg), plate count. Output: total weight in kg, displayed immediately on input change. The user encounters this result on the configuration panel — the number they can quote when asked "how much do you lift?" or use to track progression over time.

## Non-Functional Requirements

- Weight calculation result is visible to the user without any perceptible delay — the result updates as inputs change, with no server round-trip required for the calculation itself.
- The application is usable on the current and previous major version of Chrome, Safari, Firefox, and Edge on both desktop and mobile.
- A user's equipment configurations and weight data are never accessible to any other user — data is owned by and visible only to the account that created it.
- The application is responsive and fully usable on a mobile browser screen (user accesses it during training from a phone).

## Access Control

Login required (email + password or OAuth). Flat user model — every registered user sees only their own weights and statistics. No roles in MVP. Post-MVP note: premium subscription tier planned; will require adding a `subscription_tier` field to the user model, with no structural rework needed.
