# Admin module activation + billing cycle — Design Spec

**Date:** 2026-09-09  
**Branch:** `feat/admin-module-activation-billing-cycle`  
**Base:** billing USD `N × 6999` (`shell/billing/pricing.ts`)  
**Related:** `2026-08-30-admin-panel-design.md`, `2026-09-07-billing-pause-on-vencido-design.md`

## Why

Hoy el admin solo tiene `active_modules[]` on/off y un `next_due_at` global al “Marcar pagado”. **No hay fecha de alta ni ancla por módulo**, así que el mes de facturación no arranca desde un acuerdo real.

## What (acceptance)

| # | Criterion |
|---|-----------|
| A | Tabla `business_module_subscriptions` (active/inactive, `activated_at`, `billing_anchor_at`) |
| B | `active_modules` = proyección sorted de subscriptions `active` (sync en cada mutación) |
| C | Admin activa con fecha; ve/edita activación y ancla por módulo |
| D | Fee = `N × 6999` (sin cambio de fórmula) |
| E | Sin pagos: `next_due_at = addOneMonthUTC(min(active.billing_anchor_at))` |
| F | Marcar pagado: payment N×6999, `al_dia`, `next_due_at = addOneMonthUTC(paid_at)` |
| G | 2º módulo mid-cycle: sube monthly; **no** mueve `next_due_at` existente; sin prorrateo |
| H | Desactivar → inactive + fuera de array; no borra dominio ni fila |
| I | Mora tenant sigue a nivel negocio (`hasModuleAccess`); no overdue por módulo |
| J | Seed + backfill coherentes; tests cycle + API + access verdes |

## Non-goals (v1)

- Prorrateo mid-cycle  
- Overdue / precio por módulo  
- Cobro adelantado el día de activación (Alternativa B)  
- Pasarela / cron / PDF / multi-currency  
- UI tenant  

## Decisions (locked)

### AD-1 Schema

```sql
business_module_subscriptions (
  id UUID PK DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  activated_at TIMESTAMPTZ NOT NULL,
  deactivated_at TIMESTAMPTZ,
  billing_anchor_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, module_id)
)
```

Migración `015_business_module_subscriptions.sql`. No editar `010`.

**Backfill:** por cada id en `active_modules`:

`activated_at = billing_anchor_at = COALESCE(bb.last_payment_at, b.created_at, now())`, `status='active'`.

### AD-2 Fechas al activar

- UI date-only → persist **UTC 12:00** del día elegido (evita off-by-one AR).
- Default: `activated_at = billing_anchor_at = now` (si no mandan fecha).
- Checkbox “misma ancla” (default on). Advanced: ancla distinta.
- Re-activar fila inactive: nuevas fechas; `deactivated_at = null`, `status=active`.

### AD-3 Ciclo negocio (un `next_due_at`)

Helpers en `shell/billing/cycle.ts`:

- `addOneMonthUTC(d)`
- `businessAnchor(subs)` → `MIN(billing_anchor_at)` de active; null si vacío
- `initialNextDue(anchor)` → `addOneMonthUTC(anchor)`
- `nextDueAfterPayment(paidAt)` → `addOneMonthUTC(paidAt)`
- `parseDateOnlyToUtcNoon(yyyy-mm-dd)` 

**Algoritmo:**

1. `business_anchor = MIN(active.billing_anchor_at)`; 0 activas → monthly=0, `next_due_at=null`.
2. Sin `last_payment_at`: al activar primer módulo (o recalc), `next_due_at = initialNextDue(anchor)`, status `pendiente` si no había row.
3. **Marcar pagado:** `last_payment_at=paid_at`, `next_due_at = nextDueAfterPayment(paid_at)`, monthly=N×6999, `al_dia`.
4. **Activar módulo con ciclo ya existente** (`last_payment_at` o `next_due_at` ya set): solo recalc monthly; **no** empujar ni atrasar `next_due_at`.
5. **Editar ancla** con `last_payment_at` presente: **no** mueve `next_due_at`. Sin pagos: regenera `next_due_at = initialNextDue(new min anchor)`.
6. **Desactivar:** monthly baja; `next_due_at` intacto (salvo 0 módulos → null).

**Ejemplos (tests = verdad):**

| Caso | Expect |
|------|--------|
| Activa loyalty 2026-09-01, sin pago | next_due=2026-10-01T12:00Z, monthly=6999, pendiente |
| Marca pagado 2026-09-15 | last=09-15, next_due=10-15, al_dia, payment 6999 |
| Activa orders 2026-09-20 | monthly=13998; next_due **sigue 10-15** |
| Desactiva loyalty 2026-09-25 | monthly=6999; next_due intacto |
| 0 módulos | monthly=0; next_due=null |

### AD-4 API

| Method | Path | Body |
|--------|------|------|
| POST | `/api/admin/businesses/:id/modules/:moduleId/activate` | `{ activatedAt?, billingAnchorAt? }` ISO o `YYYY-MM-DD` |
| POST | `.../deactivate` | `{ deactivatedAt? }` |
| PATCH | `.../modules/:moduleId` | `{ activatedAt?, billingAnchorAt? }` |
| PUT | `.../modules` legacy | bulk: activa faltantes con now; desactiva sobrantes |

Handlers: `modules/admin/api/module-subscriptions.ts`.  
`getBusinessAdmin` incluye `module_subscriptions[]` + `billing.business_anchor_at`.

### AD-5 UI `/admin/businesses/[id]`

Por módulo registry: badge, Activo/Inactivo, fechas si active, Activar… (dialog date) / Desactivar / Editar fechas.  
Billing: monthly USD, next_due, last_payment, línea “Ancla negocio: …”.

### AD-6 Mora

Sin cambio: `hasModuleAccess` = en `active_modules` AND negocio no overdue.

### AD-7 Seed

Insert subscriptions para cada id en `active_modules` del demo (anchor = business created o fixed).

## Tests

- `tests/billing-cycle.test.ts` — helpers + tabla D3  
- `tests/admin-module-subscriptions.test.ts` — activate/deactivate/patch/sync  
- Actualizar `admin-modules`, `admin-billing`, `admin-businesses`  
- `billing-module-access` intacto  

## Verify

```bash
bun test tests/billing-cycle.test.ts tests/admin-module-subscriptions.test.ts \
  tests/admin-modules.test.ts tests/admin-billing.test.ts \
  tests/admin-businesses.test.ts tests/billing-module-access.test.ts
```
