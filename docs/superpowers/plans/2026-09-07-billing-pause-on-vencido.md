# Billing pause on vencido — Implementation Plan

> **For Hermes:** Execute task-by-task with TDD. Checkboxes track progress.

**Goal:** Pausar acceso a módulos del tenant cuando el billing está vencido (status o `next_due_at` pasado), sin borrar `active_modules`.

**Architecture:** Helper puro de acceso + campos billing en `Business` vía JOIN en `getBusiness`/`getBusinessById` + lazy UPDATE a `vencido` + reemplazo de gates tenant `active_modules.includes` → `hasModuleAccess`.

**Tech Stack:** Bun test, Next App Router, Postgres (`business_billing`), módulos admin existentes.

## Global constraints

- BMAD + TDD (RED → GREEN por slice)
- No cron; no wipe `active_modules`
- Admin staff no gated
- Dinero/billing statuses existentes sin nuevos enums
- Commits conventional en `feat/billing-pause-on-vencido`

---

### Task 1: Spec + plan

- [x] Spec `docs/superpowers/specs/2026-09-07-billing-pause-on-vencido-design.md`
- [x] This plan

### Task 2: Helper puro (TDD)

- [x] Test `tests/billing-module-access.test.ts`
- [x] Impl `shell/billing/access.ts` (`isBillingOverdue`, `hasModuleAccess`)
- [x] Export types billing en Business (`lib/modules.ts`)

### Task 3: Carga billing + lazy expire en shell/db

- [x] `shouldPersistVencido` en access helper
- [x] `getBusiness` / `getBusinessById` JOIN + optional UPDATE
- [x] `getActiveModules` respeta overdue

### Task 4: Wire gates tenant

- [x] Páginas public/dashboard orders+turnos+loyalty
- [x] APIs `modules/orders`, `modules/turnos`, `modules/loyalty`, routes `app/api/turnos/*`
- [x] Settings preview vía `getActiveModules`

### Task 5: Verify

- [x] `bun test` (728 pass)
- [ ] Smoke manual: defe vencido / mark paid (opcional humano)

### Task 6: Docs skill pitfall (opcional post-merge)

- [ ] Nota en tumo-dev-pitfalls si hace falta
