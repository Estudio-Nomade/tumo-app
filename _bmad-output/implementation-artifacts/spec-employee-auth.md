---
title: 'Auth de empleados (Fase 2)'
type: 'feature'
created: '2026-08-04'
status: 'done'
review_loop_iteration: 0
baseline_commit: '6e41f882b067a281b5f06c4b22e93d4c706d67af'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El shell de Tumo existe pero el login de empleados es stub: no hay OTP real, sesiones, cookies ni protección del dashboard.

**Approach:** Auth WhatsApp OTP vía Authyo existente + sesiones en Postgres + cookie `session_token` + API routes + proxy de Next 16 + forms de login/verify + sidebar según rol.

## Boundaries & Constraints

**Always:**
- TDD: test fallando primero; mockear `sql`/Authyo; `bun:test`; tests en español.
- Reusar `sendOtp`/`verifyOtp`, `sql`, `getBusiness`, `Button`, `Input`, `useBusiness`.
- Next 16: protección en `proxy.ts` (no `middleware.ts` — deprecado). Matcher sobre paths de dashboard (route group `(dashboard)` no aparece en la URL).
- Cookie: `httpOnly`, `sameSite=lax`, `path=/`, `maxAge=30d`, `secure` solo en production.
- Rate limits en memoria (Map): send 60s; verify 5 intentos / 5 min; reset contador verify al send ok.
- Código EN; UI/mensajes ES. `@/` = raíz.

**Ask First:**
- Dependencias nuevas no listadas en package.json.
- Cambios a schema/migraciones o a Authyo/pool/UI existentes.

**Never:**
- Reescribir Authyo, pool, business.ts, UI components, PublicLayout, migraciones, `lib/modules.ts`.
- Tests de UI de forms; llamadas reales a DB/Authyo; tocar `.env.local`.
- Librerías de auth de terceros.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| send-code feliz | phone+slug válidos | 200 `{ maskId }` + timestamp rate | N/A |
| negocio inexistente | slug bad | 404 "Negocio no encontrado" | JSON error |
| empleado no registrado | phone no en business | 404 "Ese número no está registrado en este negocio." | JSON error |
| Authyo falla | sendOtp error | 500 `{ error }` | JSON error |
| send rate limit | <60s desde último | 429 "Esperá un minuto antes de pedir otro código." | JSON error |
| verify-code feliz | OTP ok | 200 + cookie + `{ success, redirect, role }` | N/A |
| OTP inválido | verifyOtp fail | 401 `{ error }` | JSON error |
| verify rate limit | >5 en 5 min | 429 "Demasiados intentos. Pedí un código nuevo." | JSON error |
| logout | con/sin cookie | 200 `{ success: true }`, cookie borrada | idempotente |
| me feliz | cookie válida | 200 `{ name, role }` | N/A |
| me sin/invalid | sin cookie o sesión bad | 401 | JSON/status |
| createSession | employeeId | UUID token; row expires +30d | N/A |
| validateSession | token ok / exp / missing | employee data / null / null | N/A |
| proxy sin cookie | GET `/{slug}/dashboard/*` | redirect `/{slug}/login` | N/A |
| sidebar employee | role=employee | sin ítem Dashboard | N/A |
| sidebar owner | role=owner | Dashboard + módulos | N/A |

</frozen-after-approval>

## Code Map

- `shell/auth/authyo.ts` — sendOtp/verifyOtp (no tocar)
- `shell/db/pool.ts` — `sql` postgres.js
- `shell/db/business.ts` — getBusiness(slug)
- `shell/db/migrations/001_initial.sql` — employees, sessions
- `shell/layouts/dashboard-layout.tsx` — sidebar (agregar role)
- `app/(dashboard)/[slug]/layout.tsx` — server layout
- `app/(public)/[slug]/login/page.tsx` — stub → LoginForm
- `shell/ui/Button.tsx`, `shell/ui/Input.tsx` — forms
- `tests/authyo.test.ts` — estilo de mocks a copiar
- Next 16: `proxy.ts` (no middleware) — docs locales + Context7 v16.2.9

## Tasks & Acceptance

**Execution:**
- [x] `tests/employee.test.ts` + `shell/db/employee.ts` — TDD getEmployeeByPhone
- [x] `tests/session.test.ts` + `shell/auth/session.ts` — TDD create/validate/deleteSession
- [x] `shell/auth/rate-limit.ts` — Map in-memory send+verify (testable)
- [x] `tests/api-auth.test.ts` + routes send-code/verify-code/logout/me — TDD handlers
- [x] `proxy.ts` — cookie presence → next; missing → `/{slug}/login` (matcher dashboard paths)
- [x] `shell/auth/login/login-form.tsx` + `verify-form.tsx` + pages login/verify
- [x] `dashboard-layout.tsx` + layout — fetch `/api/auth/me`, hide Dashboard si employee
- [x] `bun test` + `bun run build` verdes

**Acceptance Criteria:**
- Given empleado registrado, when send-code + verify-code ok, then cookie session y redirect a `/{slug}/dashboard`
- Given sin cookie, when visita dashboard, then proxy redirige a login
- Given role employee, when carga dashboard shell, then no ve ítem Dashboard
- Given rate limits, when se exceden, then 429 con mensajes ES especificados
- Given tests unitarios nuevos+existentes, when `bun test`, then todos pasan; `bun run build` sin errores

## Design Notes

**Proxy (Next 16):** root `proxy.ts`, export `proxy` o default. Matcher por pathname real (sin route groups), p.ej. paths bajo `/:slug/dashboard`. MVP: solo presencia de cookie `session_token` (sin DB en proxy). Validación real en `/api/auth/me` y session helpers.

**Rate limit:** módulo compartido con clave `${phone}:${slug}`; send guarda lastSent; verify cuenta intentos con ventana 5min; send exitoso resetea intentos verify.

**Cookie set en verify-code:**
```ts
res.cookies.set("session_token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60,
  path: "/",
})
```

**Employee type:** `{ id, name, phone, role, business_id }` alineado a columnas SQL.

## Verification

**Commands:**
- `bun test` — existing (~28) + nuevos en verde
- `bun run build` — sin type/build errors

## Suggested Review Order

**Auth core (handlers + session)**

- Entry point: OTP send/verify orchestration with DI
  [`handlers.ts:34`](../../shell/auth/handlers.ts#L34)

- Session create/validate/delete against Postgres
  [`session.ts:16`](../../shell/auth/session.ts#L16)

- Employee lookup by phone + business
  [`employee.ts:16`](../../shell/db/employee.ts#L16)

- In-memory rate limits (send 60s, verify 5/5min)
  [`rate-limit.ts:1`](../../shell/auth/rate-limit.ts#L1)

**Route + cookie boundary**

- Thin route wrappers + cookie set on verify
  [`verify-code/route.ts:1`](../../app/api/auth/verify-code/route.ts#L1)

- GET /me for session probe
  [`me/route.ts:1`](../../app/api/auth/me/route.ts#L1)

**Protection + multi-tenant**

- Next 16 proxy: cookie presence on dashboard paths
  [`proxy.ts:3`](../../proxy.ts#L3)

- Server layout: validate session + business_id match
  [`layout.tsx:26`](../../app/(dashboard)/[slug]/layout.tsx#L26)

- Sidebar hides Dashboard unless role=owner
  [`dashboard-layout.tsx:16`](../../shell/layouts/dashboard-layout.tsx#L16)

**UI**

- Login form → send-code → verify page
  [`login-form.tsx:1`](../../shell/auth/login/login-form.tsx#L1)

- OTP inputs, timer, shake on error
  [`verify-form.tsx:1`](../../shell/auth/login/verify-form.tsx#L1)

**Tests**

- Handler matrix + session/employee/rate-limit units
  [`api-auth.test.ts:1`](../../tests/api-auth.test.ts#L1)
