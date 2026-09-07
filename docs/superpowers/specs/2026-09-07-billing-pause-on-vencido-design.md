# Billing pause on vencido — Design Spec

**Date:** 2026-09-07  
**Branch:** `feat/billing-pause-on-vencido`  
**Related:** `docs/superpowers/specs/2026-08-30-admin-panel-design.md` (billing v1 manual)

## Why

Hoy `business_billing.status = vencido` es solo badge admin. El tenant sigue usando módulos si están en `active_modules`. Producto: **mora → módulos pausados** (público + dashboard + APIs de dominio), sin borrar el contrato.

## What (acceptance)

| # | Criterion |
|---|-----------|
| A | Helper puro `hasModuleAccess(business, moduleId, now?)` — false si módulo no contratado **o** billing efectivamente vencido |
| B | Efectivamente vencido = `status === 'vencido'` **o** `next_due_at <= now` (lazy, sin cron) |
| C | `pendiente` / `al_dia` con `next_due_at` futuro (o null) → **no** bloquea |
| D | Sin row billing → **no** bloquea (compat seed/legacy) |
| E | **No** mutar `active_modules` al vencer; admin sigue viendo/toggling el array contratado |
| F | Lazy persist opcional: al leer negocio, si `next_due_at <= now` y status ≠ `vencido` → `UPDATE status='vencido'` |
| G | Gates tenant (páginas públicas/dashboard + APIs orders/turnos/loyalty que ya gatean módulo) usan el helper |
| H | Staff `/admin/**` **no** se pausa por billing del tenant |
| I | `markPaid` desbloquea (status `al_dia` + `next_due_at` futuro) sin tocar `active_modules` |
| J | Tests unitarios del helper + billing expire; suite verde |

## Explicit non-goals

- Cron / job programado de vencimiento
- Pasarela de cobro
- Email/WA de mora
- Soft-delete de datos de módulo
- UI de “cuenta suspendida” fancy (404 / 404 API como módulo off alcanza v1)
- Pausar un módulo y dejar otros on (mora = **todo** el tenant de producto)

## Decisions (locked)

### AD-1: Soft pause, not wipe

`active_modules` = contrato. Gate de **runtime** = contrato ∩ billing OK.  
Apagar por mora ≠ `setActiveModules([])`.

### AD-2: Single helper

```ts
// lib/modules.ts o shell/billing/access.ts
hasModuleAccess(business, moduleId, now = new Date()): boolean
isBillingOverdue(billing | null | undefined, now): boolean
```

`Business` gana campos opcionales de billing cargados en `getBusiness` / `getBusinessById`:

- `billing_status?: 'al_dia' | 'pendiente' | 'vencido' | null`
- `billing_next_due_at?: string | Date | null`

Admin APIs no cambian shape pública salvo métricas (siguen contando `status` DB; lazy expire alinea).

### AD-3: Lazy expire on read

En `getBusiness` / `getBusinessById` (shell):

1. JOIN `business_billing`
2. Si `next_due_at <= now` y status ∈ {`al_dia`,`pendiente`} → UPDATE `status='vencido'`, devolver vencido
3. Si ya `vencido`, no-op

Sin cron. Admin “Marcar vencido” sigue existiendo (inmediato).

### AD-4: Replace includes at access sites

Reemplazar checks de acceso tenant:

- `business.active_modules.includes(id)` → `hasModuleAccess(business, id)`
- `getActiveModules(business)` filtra con billing OK (home owner no ofrece módulos en mora)

**No** cambiar listados admin ni `setActiveModules`.

### AD-5: Loyalty gaps

Donde loyalty público no gateaba `active_modules`, al tocar paths de acceso aplicar el mismo helper si el flow es de producto loyalty (mínimo: páginas/APIs que ya asumen módulo).

## URLs / behavior

| Antes | Después (mora) |
|-------|----------------|
| `/{slug}/orders` 200 con flag | 404 (igual que sin módulo) |
| API create order 404 módulo | 404 también por mora |
| `/admin/businesses/[id]` | sigue; badge vencido; toggles OK |
| mark paid | vuelve a 200 en tenant si módulos siguen en array |

## Success

Dueño con `next_due_at` pasado no abre pedidos/turnos/loyalty de producto; al marcar pagado en admin, sin re-toggle, vuelve el acceso; tests del helper cubren matriz status × due.
