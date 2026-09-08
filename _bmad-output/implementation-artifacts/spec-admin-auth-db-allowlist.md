---
title: 'Admin auth allowlist via admin_users'
type: 'feature'
created: '2026-09-08'
status: 'done'
baseline_commit: 'faacdbdc3d6d5762bdac61ce1e61c52c51498cac'
route: 'plan-code-review'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El acceso a `/admin` se decide con `TUMO_ADMIN_PHONES` en env, aunque ya existe la tabla `admin_users`. Gestionar admins por redeploy/env es frágil.

**Approach:** Autorizar solo phones que ya existan en `admin_users`. El bootstrap del primer admin es un `INSERT` manual en DB (SQL). Se deja de usar `TUMO_ADMIN_PHONES` / `TUMO_ADMIN_PHONE` en el runtime de auth.

## Boundaries & Constraints

**Always:**
- Send-code y verify-code consultan `admin_users` (vía `deps.sql`) antes de OTP / sesión.
- Match de phone con la misma normalización que el resto (`normalizePhone` / `phonesMatch`).
- Tras OTP OK: crear sesión sobre el row existente (no auto-crear admins nuevos desde login).
- Tests unitarios del handler cubren 403 sin row y 200 con row.

**Ask First:**
- UI en panel para dar de alta/baja admins (fuera de scope salvo que el humano lo pida).
- Mantener fallback env “por si acaso”.

**Never:**
- Auto-upsert de un phone desconocido en login (eso reabre el agujero de “cualquiera que pase OTP”).
- Cambiar cookie / Authyo / rate-limit salvo lo mínimo para el gate DB.
- Documentación histórica en `docs/` como trabajo obligatorio de este cambio.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Phone en `admin_users` | send-code + OTP OK | 200 + cookie sesión | N/A |
| Phone no en tabla | send-code o verify | 403 mensaje acceso | No llama OTP en send |
| Tabla vacía | cualquier phone | 403 | Bootstrap solo por SQL |
| Phone con formato distinto pero match | `+54 9…` vs digits en DB | permitido si `phonesMatch` | N/A |

</frozen-after-approval>

## Code Map

- `modules/admin/api/auth.ts` -- handlers send/verify; gate DB
- `modules/admin/lib/session.ts` -- `findAdminUserByPhone`
- `modules/admin/lib/default-deps.ts` -- wiring findAdminByPhone
- `tests/admin-auth.test.ts` -- contratos DB allowlist
- `.env.example` -- bootstrap SQL

## Tasks & Acceptance

**Execution:**
- [x] `tests/admin-auth.test.ts` -- RED: gate por existencia en DB (mock sql), no env CSV
- [x] `modules/admin/lib/session.ts` -- `findAdminUserByPhone(phone, sql)` con match digits
- [x] `modules/admin/api/auth.ts` -- send/verify usan find async; verify crea sesión sin insert de phone nuevo
- [x] `modules/admin/lib/allowlist.ts` -- eliminado
- [x] `.env.example` -- documentar bootstrap SQL

**Acceptance Criteria:**
- Given un row en `admin_users` con mi phone, when login OTP, then obtengo cookie admin.
- Given phone sin row, when send-code, then 403 y no se envía OTP.
- Given login exitoso, when no había row previo, then no se crea admin nuevo.

## Verification

**Commands:**
- `bun test tests/admin-auth.test.ts` -- expected: pass (13)

## Suggested Review Order

**Gate DB**

- Lookup + match flexible.
  [`session.ts:5`](../../modules/admin/lib/session.ts#L5)

- Send/verify usan find; sesión sin upsert.
  [`auth.ts:46`](../../modules/admin/api/auth.ts#L46)

- Wiring production deps.
  [`default-deps.ts:23`](../../modules/admin/lib/default-deps.ts#L23)

**Tests**

- Contratos 403 / 200 / no insert.
  [`admin-auth.test.ts:89`](../../tests/admin-auth.test.ts#L89)
