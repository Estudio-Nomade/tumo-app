# Admin panel interno Tumo — Design Spec

**Date:** 2026-08-30  
**Branch:** `feat/admin-panel`  
**Source of truth (decisions):** `docs/admin/PROMPT-EJECUCION.md` §2 — **cerradas, no reabrir**.

## Why

El equipo Tumo necesita ver y gestionar **todos** los negocios de la plataforma (módulos, billing manual). Hoy `app/admin/page.tsx` es un stub sin auth.

## What (v1 acceptance)

| # | Criterion |
|---|-----------|
| A | `/admin` solo con cookie `admin_session_token`; sin cookie → `/admin/login` |
| B | Listar todos los `businesses` (nombre, slug, active_modules, alta, billing status) |
| C | Detalle negocio: módulos, empleados, contacto, billing |
| D | Toggle `active_modules` con confirmación; solo ids del registry `lib/modules.ts` |
| E | Marcar pago manual → billing `al_dia` + movimiento |
| F | Métricas home: #negocios, #por módulo, #vencidos |
| G | `bun test` / lint / build verdes |
| H | Spec+plan, auditoría, PR → main |

## Explicit non-goals (v1)

- Pasarela / cobro automático
- Roles finos admin (un solo rol staff)
- Audit log admin
- Impersonate dueño
- Editar brand/catálogo/agenda tenant
- Registrar admin en `lib/modules.ts` / `active_modules`
- Pencil / marketing landing

## Decisions (locked)

### Auth staff Tumo (NO `session_token` tenant)

| Piece | Detail |
|-------|--------|
| Allowlist | `TUMO_ADMIN_PHONES` (E.164 CSV) + alias `TUMO_ADMIN_PHONE` |
| Login | `/admin/login` phone + OTP; Authyo infra; cookie **`admin_session_token`** |
| Tables | `admin_users` (phone UNIQUE) + `admin_sessions` |
| OTP flow | phone ∈ allowlist → upsert user + session; else **403** |
| Dev | `SKIP_AUTHYO=true` → send returns fixed mask; verify accepts code **`000000`** only for allowlist phones |
| Guard | `proxy.ts` matcher `/admin` + `/admin/:path*` excl. `/admin/login` |
| APIs | `app/api/admin/**` validan admin session; 401 si falta |
| Seed | no hardcode phones reales; primer login allowlist crea row |
| Prohibido | promover `employees.role=owner` a superadmin |

### Billing

```
business_billing (1:1 businesses)
  monthly_amount_cents INT DEFAULT 1990000  -- $19.900 ARS
  status IN ('al_dia','pendiente','vencido')
  last_payment_at, next_due_at, notes, updated_at

business_billing_payments
  amount_cents, paid_at, marked_by_admin_id, note
```

- Marcar pagado: insert payment + `al_dia` + `last_payment_at=now()` + `next_due_at=now()+1 month` (UTC)
- Marcar vencido: status only
- Cron vencimiento: out of v1
- Dinero: INT centavos

### Connected business

= **toda fila** en `businesses`.

### Toggle modules

- Domain in `modules/admin` validates ids ∈ registry keys (`getRegisteredModuleIds()`)
- Writes full normalized unique array
- Off does not delete module data
- UI: shadcn Dialog confirm

### Code shape

```
modules/admin/   # NOT in lib/modules registry
app/admin/**
app/api/admin/**
```

Contract: `(deps, input) => Promise<{ status, body }>`  
Cross-tenant SQL via deps. No import from `modules/orders|loyalty|turnos`.

### Migration

Single file `shell/db/migrations/010_tumo_admin.sql` + `migrate.ts`.  
`supabase/migrations/*` may lag (same as 009).

## URLs

| URL | Who |
|-----|-----|
| `/admin/login` | Staff Tumo |
| `/admin` | Metrics + list shortcut |
| `/admin/businesses` | Table |
| `/admin/businesses/[id]` | Detail + toggles + billing |

## Deviations vs inventory

- `SKIP_AUTHYO` existed in docs/env but was **not** implemented in tenant auth TS; admin implements it for admin OTP only.
- `test-mart` not in seed; second business for `vencido` billing = **`defe`** (seed-defe) or create `defe` billing row in main seed path if present.
- shadcn Table/Badge absent → add via CLI or minimal Tailwind table/badge in admin UI.

## Success signal

Staff with allowlisted phone logs in, lists businesses, toggles a module with confirm, marks payment; suite green; PR open.
