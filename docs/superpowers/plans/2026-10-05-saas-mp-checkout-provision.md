# SaaS MP — Checkout apply-event + provision (slice 3)

> **For Hermes:** TDD vertical; fake provider only (real MP later).

**Goal:** Tras `payment_succeeded` verificado: idempotencia en `provider_events`, session `awaiting_payment→paid→provisioned`, y alta tenant (business + owner_account + employee + módulos + `tenant_subscriptions` + billing `al_dia`).

**Architecture:** `shell/billing/checkout/{apply-event,provision}.ts`. No importar `modules/admin`. Fake provider tests. Mig 019 `owner_accounts`.

**Sources:** spine AD-7/8/9/10 · spec 2026-10-05 MP · handoff `SAAS-MP-DB-LOCAL-Y-REAL.md`

---

## Stories

### B1 — applyProviderEvent
- Insert `provider_events` UNIQUE → replay no re-side-effect
- `payment_succeeded` + session `awaiting_payment` → `paid` + provision
- `payment_failed` → `failed`
- session missing / illegal transition → error sin romper unique event

### B2 — provisionTenant (idempotent)
- Solo desde `paid` (o re-entry si ya `provisioned`)
- business + slug único temporal
- `owner_accounts` + employee owner link (`owner_account_id`)
- modules via `business_module_subscriptions` + `active_modules`
- `tenant_subscriptions` active + amount snapshot
- `business_billing` al_dia + next_due = addOneMonthUTC(paidAt)
- session → provisioned + business_id
- 2× same session → 1 business

### B3 — Schema owner_accounts
- 019 + supabase mirror + migrate.ts

---

## Tasks

- [x] B1 tests + apply-event
- [x] B2 tests + provision
- [x] B3 mig 019
- [x] handoff checklist update
- [x] verify bun test + eslint + commit

**Verify:** 36 pass (apply-event + provision + prior billing/admin SaaS). Mig 019 local OK (`owner_accounts`).
