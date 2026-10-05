# SaaS MP — Admin subscription display (slice 1)

> **For Hermes:** TDD vertical; full MP checkout later.

**Goal:** Que el panel admin de Tumo muestre plan, fecha de suscripción, estado y módulos cuando un tenant self-serve tiene `tenant_subscriptions` (y quede listo el schema para provision MP).

**Architecture:** Catálogo en `shell/billing/plan-catalog.ts`. Tabla `tenant_subscriptions` (mig 017). `getBusinessAdmin` / `listBusinesses` adjuntan `saas_subscription`. UI en `BusinessDetailClient` + badge en tabla.

**Tech Stack:** Bun test, Next 16, postgres.js, dual migrations.

**Sources:**  
- spine `architecture-tumo-app-2026-10-05-saas-mp-subscriptions`  
- `docs/superpowers/specs/2026-10-05-self-service-plans-mercadopago-design.md`

---

## Epic A — Foundation admin-visible SaaS sub

### Story A1 — Plan catalog
- `shell/billing/plan-catalog.ts` + `tests/billing-plan-catalog.test.ts`
- basico/pro/full, cupo, USD cents, ARS placeholder cents, labels ES

### Story A2 — Schema tenant_subscriptions
- `017_saas_tenant_subscriptions.sql` + supabase mirror + migrate.ts
- columns: business_id, plan_id, interval, module_ids, amounts, status, provider, dates

### Story A3 — Admin API surfaces saas_subscription
- `getBusinessAdmin` LEFT JOIN / query tenant_subscriptions
- `listBusinesses` optional summary (plan_id, status, subscribed_at)
- amount display: if saas sub → cycle amount; else N×6999

### Story A4 — Admin UI detail + list
- Sección “Suscripción” en business-detail
- Columna/badge plan en businesses-table
- tests UI static markup

### Later (out of this PR if time)
- checkout_sessions, provider_events, provision, MP adapter, signup UI

---

## Tasks (execute now) — DONE slice 1

- [x] A1 plan-catalog + tests
- [x] A2 mig 017 tenant_subscriptions + supabase mirror + migrate.ts
- [x] A3 getBusinessAdmin + listBusinesses saas_subscription
- [x] A4 UI detail section + table Plan column + UI tests

**Verify:** `bun test tests/admin-businesses.test.ts tests/billing-plan-catalog.test.ts tests/ui/admin-saas-subscription.test.tsx tests/admin-billing.test.ts tests/admin-module-subscriptions.test.ts tests/admin-subscription-state.test.ts` → 40 pass

**Ops:** Postgres local down al implementar — correr `bun shell/db/migrate.ts` cuando :54322 esté up.

### Later
- checkout_sessions, provider_events, provision, MP adapter, signup UI
