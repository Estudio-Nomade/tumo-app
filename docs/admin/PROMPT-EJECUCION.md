# PROMPT — Panel admin interno Tumo (ejecutar / implementar)

Pegá **solo este archivo** al agente (o: leé `docs/admin/PROMPT-EJECUCION.md` y ejecutá).  
**NO** pegues la auditoría completa, ni chats, ni `.pen` → límite de contexto.

---

## 0. Kickoff (30 segundos)

| | |
|--|--|
| **Repo** | `/home/marti/Documentos/Estudio Nomade/Tumo` |
| **Package** | `tumo-app` · Bun · Next 16 App Router · React 19 · Postgres |
| **Base branch** | `main` (actual: merge PR #15 turnos). Partí de `origin/main` actualizado. |
| **Nueva branch** | `feat/admin-panel` |
| **Qué es** | Panel **interno del equipo Tumo** para ver/gestionar **todos** los negocios. **No** es el dashboard de un dueño (`/{slug}/dashboard`). |
| **Estado hoy** | `app/admin/page.tsx` = stub `"Admin — Panel interno"`. Sin auth admin, sin billing, sin APIs. |
| **Runtime** | `export PATH="$HOME/.bun/bin:$PATH"` |

### Lectura obligatoria (en orden, paths — no re-pegar contenido)

1. `AGENTS.md` — BMAD + TDD + shadcn obligatorios  
2. `docs/AUDITORIA-TUMO-ARQUITECTURA.md` — SoT arquitectura (en especial §0 capas, §3 multi-tenant, §4 registry, §7 schema, §8 auth staff-negocio, §11 checklist módulo)  
3. Este prompt (decisiones v1 **ya cerradas** abajo — no reabrir salvo blocker real)

Specs de loyalty/orders/turnos: **no** duplicar ni “mejorar”; este trabajo no es de esos módulos.

---

## 1. Objetivo v1 (acceptance criteria)

Al terminar, un **staff Tumo autenticado** puede:

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| A | Entrar a `/admin` solo con sesión admin; sin cookie → login/redirect | curl + test gate |
| B | Listar **todos** los `businesses` (conectados = **toda fila** en `businesses`) con: nombre, slug, `active_modules` (badges), fecha alta, estado billing (`al_dia` \| `pendiente` \| `vencido`) | UI + test list |
| C | Abrir detalle `/admin/businesses/[id]` (o por slug): módulos on/off vs registry, empleados (nombre/rol/activo), contacto si hay datos, billing | UI + test detail |
| D | **Toggle módulo** con dialog confirmación → escribe `businesses.active_modules` solo con ids del registry `lib/modules.ts` | test toggle inválido 400; válido persiste |
| E | **Marcar pago** manual (sin pasarela) → actualiza billing + inserta movimiento | test mark-paid |
| F | Métricas globales simples en home admin: #negocios, #por módulo (count con ese id en array), #vencidos | test metrics opcional pero sí UI mínima |
| G | `bun test` verde (suite + nuevos `tests/admin-*.test.ts`), `bun run lint`, `bun run build` | comandos reales |
| H | Spec + plan en `docs/superpowers/`; auditoría actualizada (§5 stub→real, §7 billing, auth admin); PR a `main` branch `feat/admin-panel` | paths en PR |

### Explicitamente OUT de v1

- Pasarela / cobro automático del fee Tumo  
- Roles finos admin (un solo rol: staff)  
- Audit log de acciones admin  
- Impersonate “entrar como dueño”  
- Editar brand/catálogo/agenda del tenant desde admin (solo lectura + toggle módulos + billing)  
- Meter admin en `lib/modules.ts` / `active_modules`  
- Pencil / rediseño marketing landing  

---

## 2. Decisiones de diseño v1 — CERRADAS (implementar así)

Si algo choca con el código real al inventariar, documentá la desviación en la spec en 5 líneas y seguí el espíritu KISS.

### 2.1 Auth staff Tumo (NO reusar `session_token` de negocio)

El auth actual (Authyo OTP + cookie `session_token` + `employees`/`sessions` + match `businessId`) es **por-tenant**. No alcanza y **no** lo mezcles.

**v1 elegido:**

| Pieza | Detalle |
|-------|---------|
| Allowlist | Env `TUMO_ADMIN_PHONES` = lista E.164 separada por comas (normalizar con `lib/phone` igual que el resto). Opcional alias `TUMO_ADMIN_PHONE` singular. |
| Login UI | `/admin/login` — input teléfono + OTP. Reusar **infra** Authyo (`shell/auth`) si es limpio (send/verify), pero la sesión resultante **no** es `session_token` de employee. |
| Cookie | Nombre distinto: **`admin_session_token`** (httpOnly, path `/`, same-site lax, TTL ~7–30d). |
| Tablas | `admin_users` (id, phone UNIQUE, name, created_at) + `admin_sessions` (id, admin_user_id, token UNIQUE, expires_at). Al verificar OTP: si phone ∈ allowlist → upsert `admin_users` + crear sesión. Si no ∈ allowlist → 403. |
| Dev | Si `SKIP_AUTHYO=true`, permitir código fijo de dev **solo** para phones allowlist (misma convención que staff negocio si existe; documentá en spec). |
| Guard | Extender `proxy.ts` (o el mecanismo Next 16 equivalente que ya use el repo): matcher **`/admin` + `/admin/:path*`** excluyendo `/admin/login` (y estáticos). Sin cookie admin → redirect `/admin/login`. **No** redirigir a `/{slug}/login`. |
| APIs | `app/api/admin/**` validan cookie admin en cada route; 401 si falta/inválida. |
| Seed | Insertar al menos 1 `admin_users` demo **solo si** phone está en env de ejemplo documentado; o documentar “sin seed user: el primer login allowlist crea el row”. Preferí: seed no hardcodea phones reales; `.env.example` documenta `TUMO_ADMIN_PHONES`. |

**Prohibido:** promover un `employees.role = 'owner'` a superadmin cross-tenant.

### 2.2 Billing mensual negocio → Tumo

Sin pasarela. Solo estado + marca manual.

```text
business_billing  (1:1 con businesses)
  business_id UUID PK → businesses ON DELETE CASCADE
  monthly_amount_cents INT NOT NULL DEFAULT 1990000   -- $19.900,00 ARS en centavos (ajustable)
  status TEXT NOT NULL CHECK (status IN ('al_dia','pendiente','vencido'))
  last_payment_at TIMESTAMPTZ NULL
  next_due_at TIMESTAMPTZ NULL
  notes TEXT NULL
  updated_at TIMESTAMPTZ DEFAULT now()

business_billing_payments  (movimientos)
  id UUID PK
  business_id UUID NOT NULL → businesses
  amount_cents INT NOT NULL CHECK (>=0)
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
  marked_by_admin_id UUID NULL → admin_users
  note TEXT NULL
  created_at TIMESTAMPTZ DEFAULT now()
```

**Reglas dominio:**

- Al crear business (seed): row billing default `pendiente` o `al_dia` según seed demo.  
- **Marcar pagado:** insert payment + `status='al_dia'` + `last_payment_at=now()` + `next_due_at = now() + 1 month` (UTC o AR documentado).  
- **Marcar vencido** (acción admin opcional v1): `status='vencido'`.  
- Job automático de vencimiento: **out of v1** (no cron). Seed puede dejar un negocio `vencido` a propósito.  
- Dinero siempre **INT centavos**.

Migración: `shell/db/migrations/010_admin_billing.sql` (o `010_tumo_admin.sql` si metés auth+billing juntas — preferí **un solo archivo 010** con admin_users, admin_sessions, business_billing, business_billing_payments). Registrar en `shell/db/migrate.ts`.  
Señalar en spec/PR: `supabase/migrations/*` puede quedar atrasado (igual que 009).

### 2.3 “Negocio conectado”

= **toda fila** en `businesses`, tenga o no módulos activos. Contadores y listado usan esa definición.

### 2.4 Toggle `active_modules`

- Función de dominio en `modules/admin` (nombre carpeta fijo: **`modules/admin`**): valida que cada id ∈ keys del registry exportado desde `lib/modules.ts` (importar **solo** el registry/ids públicos, no UI de loyalty/orders/turnos).  
- Escribe el array completo normalizado (unique, sorted opcional).  
- Apagar módulo **no** borra datos del módulo (solo quita el gate público/dashboard).  
- UI: shadcn Dialog confirmación “¿Desactivar turnos para carri?”.

### 2.5 Forma de código (pseudo-módulo, no tenant-module)

```
modules/admin/
  index.ts          # NO registrar en lib/modules.ts
  api/              # listBusinesses, getBusinessAdmin, setModules, getBilling, markPaid, metrics, …
  lib/              # types, default-deps, billing-status helpers
  dashboard/        # UI: businesses-table, business-detail, metrics-cards, login si aplica
app/admin/
  layout.tsx        # shell visual admin (simple, no DashboardLayout de tenant)
  login/page.tsx
  page.tsx          # home métricas + tabla o link
  businesses/page.tsx
  businesses/[id]/page.tsx
app/api/admin/
  session|login|…   # thin
  businesses/…
  billing/…
```

Contrato: `(deps, input) => Promise<{ status, body }>` igual que orders/turnos.  
Queries cross-tenant: SQL vía deps sobre `businesses`, `employees`, tablas billing.  
**Resúmenes por módulo:** counts simples (`active_modules @> ARRAY['orders']` o `= ANY`) — **no** importar `modules/orders/api/*`.

UI: shadcn Table/Badge/Dialog; look sobrio (no brand del food truck). Elderly-friendly no es prioridad acá, pero touch targets decentes sí.

### 2.6 proxy.ts hoy

```ts
// matcher actual SOLO:
matcher: ["/:slug/dashboard", "/:slug/dashboard/:path*"]
```

Tenés que **agregar** guard admin sin romper el de dashboard. Testeá ambos.

---

## 3. Proceso (obligatorio, orden)

1. **Inventario** (5 min): listar `app/admin`, `proxy.ts`, `shell/auth/*`, `lib/modules.ts`, última migración `009_turnos.sql`, seed. Confirmar que no hay `modules/admin` ya.  
2. **BMAD:**  
   - Spec: `docs/superpowers/specs/2026-08-30-admin-panel-design.md` (o fecha del día)  
   - Plan stories checkbox: `docs/superpowers/plans/2026-08-30-admin-panel.md`  
   - Skills: `.agents/skills/bmad-*` (create-spec / create-architecture / create-epics-and-stories / dev-story según lo que haya). No freestyle.  
   - La spec **repite las decisiones cerradas de §2** (no las reabre).  
3. **TDD por story:** `tests/admin-*.test.ts` primero (auth gate, list, toggle modules, mark paid, allowlist reject).  
4. Migración `010_…` + migrate.ts + seed billing demo:  
   - `carri` → `al_dia`  
   - `test-mart` (si existe) o second business → `vencido`  
5. Implementación mínima green.  
6. UI thin pages.  
7. Actualizar `docs/AUDITORIA-TUMO-ARQUITECTURA.md`: admin ya no stub; § auth admin; § billing tables; URLs `/admin`.  
8. Verify:

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd "/home/marti/Documentos/Estudio Nomade/Tumo"
bun shell/db/migrate.ts
bun shell/db/seed.ts   # si tocaste seed
bun test
bun run lint
bun run build
```

9. Git: branch `feat/admin-panel`, commits `feat(admin): …` / `test(admin): …`, **add por paths**, PR → `main`. No force main. No `.env.local`. No `git add -A`.

---

## 4. Stories sugeridas (plan — ajustar IDs, no saltear)

| Story | Entrega |
|-------|---------|
| 1 | Spec+plan committed; decisiones §2 copiadas |
| 2 | Migración 010 + tests schema/migration smoke |
| 3 | Admin auth: allowlist, sessions, login API, cookie `admin_session_token`, tests 401/403 |
| 4 | proxy/matcher `/admin/*` + test o smoke documentado |
| 5 | `listBusinesses` + `getBusiness` admin + metrics domain + tests |
| 6 | `setActiveModules` validate registry + tests |
| 7 | billing markPaid / setStatus + tests |
| 8 | UI login + list + detail + dialogs (shadcn) |
| 9 | Seed demo billing + `.env.example` `TUMO_ADMIN_PHONES` |
| 10 | Auditoría update + PR |

---

## 5. Pitfalls (leé antes de codear)

- **Cookie clash:** jamás reutilizar `session_token` para admin. Un owner logueado en `/carri/dashboard` **no** debe entrar a `/admin` solo por eso.  
- **proxy matcher:** si metés `/admin` mal, podés romper login admin (redirect loop) o dejar `/admin` abierto.  
- **Cross-module:** no `import` desde `modules/orders` para “reusar types de OrderStatus”. Types de admin propios o columnas SQL literales.  
- **Registry:** `lib/modules.ts` es la whitelist de ids togglables; admin **no** se agrega ahí.  
- **Next 16:** `params` Promise; no APIs Next 13 de memoria; docs en `node_modules/next/dist/docs/` si hace falta.  
- **Bun path en Kali:** sin `~/.bun/bin` en PATH fallan los scripts.  
- **DB local:** Supabase típico `127.0.0.1:54322`; migrate+seed si tablas no existen.  
- **No leer** `design-artifacts/*.pen` enteros.  
- Tree sucio: hay untracked `*.pen.bak*` y planes WIP — **no** los agregues al commit.

---

## 6. URLs esperadas al final

| URL | Quién |
|-----|-------|
| `http://localhost:3000/admin/login` | Staff Tumo |
| `http://localhost:3000/admin` | Home métricas + atajo listado |
| `http://localhost:3000/admin/businesses` | Tabla negocios |
| `http://localhost:3000/admin/businesses/[id]` | Detalle + toggles + billing |

Tenant demo sigue en `/carri/...` (no mezclar).

---

## 7. Definition of Done (checklist copiable al PR)

- [ ] Spec + plan en `docs/superpowers/`  
- [ ] `010_*.sql` + `migrate.ts`  
- [ ] `modules/admin/**` con API pura + deps  
- [ ] `app/admin/**` + `app/api/admin/**` thin  
- [ ] Cookie `admin_session_token` + allowlist env  
- [ ] Guard `/admin/*` sin romper `/:slug/dashboard/*`  
- [ ] Toggle módulos con confirm + validación registry  
- [ ] Billing manual al_dia/pendiente/vencido + mark paid  
- [ ] Tests admin (auth, list, toggle, billing)  
- [ ] Seed/demo + `.env.example`  
- [ ] Auditoría actualizada  
- [ ] `bun test` · `lint` · `build` verdes  
- [ ] PR `feat/admin-panel` → `main`, commits conventional, paths explícitos  

---

## 8. Report al humano al cerrar

1. Paths de spec/plan/migración  
2. Cómo loguearse en local (env + pasos)  
3. Screenshot o lista de URLs probadas  
4. Output real de `bun test` / lint / build (últimas líneas)  
5. Desviaciones vs este prompt (si hubo)

---

*Handoff admin panel v1 — 2026-08-30. Si el usuario pide cambios de producto, actualizar ESTE archivo y la spec; no improvisar en código.*
