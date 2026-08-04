---
title: 'Módulo de fidelización (Fase 3)'
type: 'feature'
created: '2026-08-04'
status: 'done'
review_loop_iteration: 0
baseline_commit: '4ba7c004a90095426e7d2171952a5f97c3c5488a'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El shell y auth existen, pero el módulo loyalty es stub: sin registro de clientes, sumar visitas, canjes, métricas ni UI pública/dashboard.

**Approach:** Handlers DI puros en `modules/loyalty/api/*`, API routes finas, cookie `client_id` para clientes, UI pública (registro+tarjeta) y dashboard (panel empleado + métricas owner), activar `getActiveModules` y sidebar dinámico.

## Boundaries & Constraints

**Always:**
- TDD con `bun:test`; mockear DB; tests en español; código EN; UI ES.
- Patrón DI como `shell/auth/handlers.ts` — handlers sin Next.js; routes wrappers.
- `purchases_needed` y `reward_name` desde el negocio (nunca hardcode).
- Código cliente 4 dígitos único por negocio (`crypto.randomInt(1000,9999)`, max 10 reintentos).
- Mobile-first (375px). Colores: `var(--color-primary/secondary)`.
- Públicas: customers POST/GET sin auth. Dashboard APIs: sesión empleado. Metrics: solo owner.

**Ask First:**
- Dependencias nuevas; cambios a schema/migraciones; tocar `shell/auth/*` o tests existentes.

**Never:**
- Modificar `shell/auth/*`, `shell/db/*`, `shell/ui/*`, `shell/context/*`, migraciones, tests existentes.
- Authyo/OTP de empleados; librerías nuevas.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| register feliz | name+phone+slug | 200 cliente + code 4 dig | N/A |
| register idempotente | phone existente | 200 mismo cliente | N/A |
| register sin name/phone | vacío | 400 | JSON error |
| register negocio bad | slug bad | 404 | JSON error |
| get por code/phone | válido | 200 + purchasesNeeded/rewardName | N/A |
| get no encontrado | bad | 404 | JSON error |
| addPurchase | auth emp | +1 purchases/total, canRedeem | N/A |
| redeem ok | purchases >= needed | purchases=0, row redemptions | N/A |
| redeem short | purchases < needed | 400 | JSON error |
| metrics owner | businessId | counts mes | N/A |
| activity | limit N | merge purchases+redemptions by ts | N/A |
| cookie client | register/login | set `client_id` maxAge 365d | N/A |

</frozen-after-approval>

## Code Map

- `shell/auth/handlers.ts` — patrón DI / JsonResult a copiar
- `shell/db/business.ts` — getBusiness
- `shell/auth/session.ts` — validateSession para APIs dashboard
- `shell/ui/MetricCard.tsx`, `Button.tsx`, `Input.tsx`
- `lib/modules.ts` — Module, getActiveModules stub
- `modules/loyalty/index.ts` — stub manifest
- `app/(public)/[slug]/loyalty/page.tsx` — stub
- `app/(dashboard)/[slug]/dashboard/{page,loyalty/page}.tsx` — stubs
- `shell/layouts/dashboard-layout.tsx` — sidebar hardcode
- `app/(dashboard)/[slug]/layout.tsx` — session + business ya validados
- Schema: customers, purchases, redemptions en `001_initial.sql`

## Tasks & Acceptance

**Execution:**
- [x] TDD `modules/loyalty/api/customers.ts` + `tests/loyalty-customers.test.ts`
- [x] TDD `modules/loyalty/api/purchases.ts` + `tests/loyalty-purchases.test.ts`
- [x] TDD `modules/loyalty/api/redemptions.ts` + `tests/loyalty-redemptions.test.ts`
- [x] TDD `modules/loyalty/api/metrics.ts` + `tests/loyalty-metrics.test.ts`
- [x] `modules/loyalty/lib/client-cookie.ts` + `modules/loyalty/lib/generate-code.ts`
- [x] API routes `app/api/loyalty/{customers,purchases,redemptions,metrics}/route.ts`
- [x] Public UI: registration + card + loyalty page
- [x] Dashboard UI: panel + widgets + pages
- [x] Completar `modules/loyalty/index.ts`; activar `getActiveModules`; sidebar dinámico
- [x] `bun test` + `bun run build` verdes

**Acceptance Criteria:**
- Given cliente nuevo, when se registra, then obtiene code y cookie `client_id` y ve tarjeta con progreso
- Given empleado autenticado, when busca cliente y suma visita, then purchases++ y canRedeem correcto
- Given purchases >= needed, when canjea, then purchases=0 y queda registro en redemptions
- Given owner, when abre dashboard home, then ve métricas y timeline
- Given business.active_modules incluye loyalty, when getActiveModules, then devuelve loyaltyModule y sidebar lo lista

## Design Notes

**SqlTagged DI:** pasar `sql` (tagged template) + `getBusiness` + `generateCode` como deps, igual a employee/session.

**canRedeem:** `purchases >= purchases_needed` tras la compra (post-increment).

**Metrics mes:** `date_trunc('month', now())` o filtro `created_at >= startOfMonth`.

**getCustomer by id:** útil para page pública con cookie — incluir lookup por `id` en getCustomer o helper interno.

**Sidebar:** pasar `modules: Module[]` desde server layout (getActiveModules) como prop al client DashboardLayout.

## Verification

**Commands:**
- `bun test` — 72 pass (55 prev + loyalty)
- `bun run build` — OK

## Suggested Review Order

**Handlers (DI)**

- Register/get customer
  [`customers.ts:1`](../../modules/loyalty/api/customers.ts#L1)

- Add purchase + canRedeem
  [`purchases.ts:1`](../../modules/loyalty/api/purchases.ts#L1)

- Redeem + reset purchases
  [`redemptions.ts:1`](../../modules/loyalty/api/redemptions.ts#L1)

- Metrics + activity merge
  [`metrics.ts:1`](../../modules/loyalty/api/metrics.ts#L1)

**API + shell wiring**

- Public customers cookie
  [`customers/route.ts:1`](../../app/api/loyalty/customers/route.ts#L1)

- Auth-gated purchases/redemptions/metrics
  [`purchases/route.ts:1`](../../app/api/loyalty/purchases/route.ts#L1)

- getActiveModules + sidebar
  [`modules.ts:44`](../../lib/modules.ts#L44)

**UI**

- Public registration/card
  [`registration.tsx:1`](../../modules/loyalty/public/registration.tsx#L1)

- Employee panel
  [`panel.tsx:1`](../../modules/loyalty/dashboard/panel.tsx#L1)

- Owner dashboard widgets
  [`widgets.tsx:1`](../../modules/loyalty/dashboard/widgets.tsx#L1)
