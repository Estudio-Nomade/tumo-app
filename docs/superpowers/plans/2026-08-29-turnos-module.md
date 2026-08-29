# Turnos Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship multi-tenant Turnos module wired into the same admin shell as Loyalty/Orders, matching Pencil flows and AUDITORIA architecture.

**Architecture:** Manifest in `modules/turnos` + registry; domain APIs with DI; thin `app/api` and RSC pages; single-calendar availability; transfer/cash payments with receipt BYTEA; brand via shell CSS vars only.

**Tech Stack:** Next 16 App Router, React 19, Bun, Postgres (`shell/db/pool.ts`), cookie `session_token`, Tailwind 4, shadcn.

**Spec:** `docs/superpowers/specs/2026-08-29-turnos-module-design.md`  
**Pencil:** `design-artifacts/turnos-mvp.pen`

## Global Constraints

- BMAD + TDD: failing test before prod code
- Money in INT cents; duration INT minutes
- No `modules/turnos` → `modules/orders|loyalty` imports
- No MercadoPago in turnos v1
- No brand editor inside turnos
- Elderly-UX: body≥16, CTA≥52–56, `var(--color-primary)`
- Package manager: `bun`
- Commits: `feat(turnos): ...` — no push unless asked

---

### Task 1: Module registry + manifest

**Files:**
- Create: `modules/turnos/index.ts`
- Create: `modules/turnos/dashboard/home-section.tsx` (stub OK until metrics)
- Modify: `lib/modules.ts`
- Modify: `shell/layouts/dashboard-layout.tsx` (`MODULE_ICONS.calendar`)
- Test: `tests/turnos-module.test.ts`

**Produces:** `turnosModule` with id `turnos`, name `Turnos`, icon `calendar`, dashboardPath `turnos`

- [ ] **Step 1: Failing test** — `tests/turnos-module.test.ts` expects id/name/path and `getActiveModules` with three modules
- [ ] **Step 2: Run** `bun test tests/turnos-module.test.ts` → FAIL
- [ ] **Step 3: Implement** manifest + registry + Calendar icon
- [ ] **Step 4: Run** tests → PASS
- [ ] **Step 5: Commit** `feat(turnos): register module in multi-module registry`

---

### Task 2: Migration 009_turnos.sql

**Files:**
- Create: `shell/db/migrations/009_turnos.sql`
- Modify: `shell/db/migrate.ts` (append 008 if missing + 009)
- Test: `tests/turnos-migration.test.ts` (SQL file contains required tables/constraints)

- [ ] Failing test on migration contents
- [ ] Write SQL (services, settings, bookings, payments + CHECKs + indexes)
- [ ] Register in migrate.ts
- [ ] Commit `feat(turnos): add 009_turnos migration`

---

### Task 3: Types + default-deps + services API

**Files:**
- `modules/turnos/lib/types.ts`, `default-deps.ts`
- `modules/turnos/api/services.ts`
- `tests/turnos-services.test.ts`
- Thin: `app/api/turnos/services/route.ts` (after domain green)

- [ ] TDD list/create/update service (price_cents, duration_minutes, is_active)
- [ ] Commit `feat(turnos): services domain API`

---

### Task 4: Settings API

**Files:** `modules/turnos/api/settings.ts`, `tests/turnos-settings.test.ts`, `app/api/turnos/settings/route.ts`

- [ ] get/upsert alias, cbu, holder, is_paused, hours
- [ ] Commit `feat(turnos): settings domain API`

---

### Task 5: Availability pure lib

**Files:** `modules/turnos/lib/availability.ts`, `tests/turnos-availability.test.ts`

- [ ] Generate slots for day given duration + existing bookings + hours
- [ ] Paused / closed day → empty
- [ ] Commit `feat(turnos): slot availability engine`

---

### Task 6: Bookings create + list + get

**Files:** `modules/turnos/api/bookings.ts`, `tests/turnos-bookings.test.ts`, routes under `app/api/turnos/bookings`

- [ ] Create with idempotency, snapshots, customer upsert by phone
- [ ] Conflict if slot overlap
- [ ] List filters: today / upcoming / pending payment
- [ ] Commit `feat(turnos): bookings domain API`

---

### Task 7: Payments (transfer receipt + cash + approve/reject)

**Files:** `modules/turnos/api/payments.ts`, `tests/turnos-payments.test.ts`, API routes

- [ ] Submit receipt → pending_verification
- [ ] Cash path → unpaid / at_location
- [ ] Approve/reject
- [ ] Commit `feat(turnos): payments and receipts`

---

### Task 8: Metrics + HomeSection + getRecentActivity

**Files:** `modules/turnos/api/metrics.ts`, update `home-section.tsx`, `index.ts`, `tests/turnos-metrics.test.ts`

- [ ] turnosToday, pendingPayment counts
- [ ] Activity events from recent bookings
- [ ] Commit `feat(turnos): home section and activity feed`

---

### Task 9: Public UI flow (P1–P8)

**Files:** `modules/turnos/public/*`, `app/(public)/[slug]/turnos/**`

- [ ] Entry, wizard (service→day→time→data→pay), confirmation
- [ ] Gate active_modules
- [ ] UI tests smoke where project already tests UI with bun
- [ ] Commit `feat(turnos): public booking flow`

---

### Task 10: Dashboard UI (D1–D4)

**Files:** `modules/turnos/dashboard/panel.tsx`, `detail.tsx`, `services-manager.tsx`, `settings-form.tsx`, pages under `app/(dashboard)/[slug]/dashboard/turnos/**`

- [ ] Owner-only ajustes page
- [ ] Commit `feat(turnos): dashboard panel and config`

---

### Task 11: Seed + icons hub + verify

**Files:** `shell/db/seed.ts` (and seed-defe if needed), modules hub icons optional

- [ ] `bun test` full suite relevant
- [ ] `bun run lint` / `bun run build`
- [ ] Commit `feat(turnos): seed active_modules and polish wiring`

---

## Execution notes

- Prefer vertical slices if blocked: Task 1–2 first always
- Mark checkboxes in this file when done
- Do not commit `.pen.bak*` or secrets
