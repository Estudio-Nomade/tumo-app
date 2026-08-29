# Auditoría Tumo — Arquitectura para agentes (módulo Turnos y siguientes)

**Fecha:** 2026-08-29  
**Repo:** `Estudio-Nomade` / Tumo (`tumo-app`)  
**Branch de referencia al escribir:** `feat/orders-ux-polish` (orders MVP + post-MVP avanzado; `main` tiene orders ABM mergeado)  
**Audiencia:** otro agente que deba entender el monorepo y sumar un módulo nuevo (p. ej. **Turnos**) sin freestyle.

---

## 0. TL;DR (qué es Tumo)

Tumo es una **plataforma multi-módulo multi-tenant para comercios** (food trucks, locales, etc.). Un negocio se identifica por `slug` y elige qué módulos tiene activos en `businesses.active_modules` (array de strings: `"loyalty"`, `"orders"`, futuro `"turnos"`).

**Paradigma:** modular monolith por dominio.

| Capa | Path | Rol |
|------|------|-----|
| Thin adapters | `app/**` | Rutas Next.js (pages + API). Auth cookie, map HTTP ↔ dominio. Casi sin lógica. |
| Dominio | `modules/<id>/**` | API pura + lib + UI dashboard/public del módulo. **Dueño del negocio.** |
| Shell compartido | `shell/**` | Auth, DB pool, business, layouts, storage, UI de producto simple. |
| Primitivos UI | `components/ui/**` | shadcn/ui (calendar, dialog, sheet, popover…). |
| Utils cross | `lib/**` | Registry de módulos, phone, countries, utils. |
| Docs / BMAD | `docs/`, `_bmad-output/`, `.agents/skills/` | Specs, planes, spines. |

**Regla de oro:** un módulo **nunca importa de otro módulo**. Solo comparte `shell/`, `lib/`, `components/ui/`. La tabla `customers` es del **shell** (compartida); orders/loyalty la reutilizan sin acoplarse entre sí.

---

## 1. Stack técnico

| Pieza | Tecnología | Notas |
|-------|------------|--------|
| Runtime / package manager | **Bun** | Scripts: `bun run dev\|build\|lint\|test` |
| Framework web | **Next.js 16.2.12** App Router | Leer `node_modules/next/dist/docs/` — APIs distintas a Next “clásico”. `params` es `Promise`. |
| UI | **React 19.2.4** | Server Components por default; client con `"use client"`. |
| Estilos | **Tailwind CSS 4** + `app/globals.css` | Tokens brand vía CSS vars (`--color-primary`, `--primary`). |
| Componentes | **shadcn/ui** (style `base-nova`, `@base-ui/react`) + `shell/ui/*` | Complejos → shadcn; simples (Button, Input, MetricCard) pueden quedar en shell. |
| Iconos | **lucide-react** | |
| Backend “servidor” | **Route Handlers** `app/api/**` en el mismo proceso Next | No hay Nest/Express aparte. |
| DB | **PostgreSQL** vía `postgres` (porsager) `^3.4.9` | `shell/db/pool.ts` → tagged template `sql\`...\``. |
| Hosting DB típico | **Supabase Postgres** (cloud o local Docker) | Migraciones duales: `shell/db/migrations/*` (script bun) y `supabase/migrations/*` (CLI). |
| Storage | Supabase Storage (logos) | `shell/storage/supabase.ts` + `SUPABASE_SECRET_KEY`. |
| Realtime | Supabase Realtime (orders) | Client anon; graceful no-op si falta env. |
| Auth empleados | OTP WhatsApp vía **Authyo** + cookie `session_token` | No Supabase Auth para empleados. |
| Pagos (orders) | MercadoPago API | Credenciales **por negocio** en `orders_settings`. |
| Tests | **`bun test`** | TDD obligatorio. Domain en `tests/*.test.ts`; UI en `tests/ui/*.test.tsx`. |
| Lint | ESLint 9 + `eslint-config-next` | |
| TypeScript | 5, `strict`, path alias `@/*` → `./*` | |
| Diseño | Pencil `design-artifacts/*.pen` | Orders: `orders-mvp.pen`, `orders-ui-ux.pen`. |

### Scripts package.json

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "eslint",
"test": "bun test"
```

### Env (ver `.env.example`)

- `DATABASE_URL` — Postgres. Pooler Supabase (`.pooler.supabase.com`) → SSL require + `prepare: false` (ya en pool). Local → `?sslmode=disable`, ssl false.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` (server only; logos)
- `AUTHYO_CLIENT_ID` / `AUTHYO_CLIENT_SECRET`

**No commitear** `.env.local` ni credenciales. `docker-compose.yml` existe para Postgres local de dev (no asumir que está en git limpio).

---

## 2. Mapa de carpetas (lo que importa)

```
Tumo/
├── app/                          # Next App Router (adapters)
│   ├── layout.tsx                # Root: fonts Geist, globals.css
│   ├── page.tsx                  # Landing marketing → modules/landing
│   ├── globals.css
│   ├── admin/page.tsx            # Stub
│   ├── (public)/[slug]/          # Superficie cliente del comercio
│   │   ├── layout.tsx            # getBusiness + PublicLayout (brand tokens)
│   │   ├── login/ + login/verify/
│   │   ├── loyalty/ + loyalty/c/[code]/
│   │   └── orders/ + cart + producto/[id] + [id]
│   ├── (dashboard)/[slug]/
│   │   ├── layout.tsx            # session_token + DashboardLayout
│   │   └── dashboard/
│   │       ├── page.tsx          # Home owner: itera HomeSection de módulos
│   │       ├── activity/
│   │       ├── modules/          # Hub de módulos activos
│   │       ├── settings/
│   │       ├── loyalty/...
│   │       └── orders/...
│   └── api/
│       ├── auth/                 # send-code, verify-code, me, logout
│       ├── business/             # brand + logo
│       ├── loyalty/...
│       └── orders/...
├── modules/
│   ├── landing/                  # Marketing tumo.com.ar (aislado)
│   ├── loyalty/                  # Fidelización
│   │   ├── index.ts              # manifiesto Module
│   │   ├── api/                  # pure handlers {status,body}
│   │   ├── lib/                  # types, default-deps, helpers
│   │   ├── dashboard/            # UI empleado/dueño
│   │   └── public/               # UI cliente
│   └── orders/                   # Pedidos (mismo shape)
├── shell/
│   ├── auth/                     # Authyo, session, rate-limit, login UI
│   ├── brand/                    # public CSS tokens
│   ├── business/                 # logo upload, update brand
│   ├── context/business.tsx      # React context del business
│   ├── dashboard/dashboard-home.tsx
│   ├── db/                       # pool, migrate, seed, business, employee
│   ├── layouts/                  # dashboard-layout, public-layout
│   ├── storage/supabase.ts
│   └── ui/                       # Button, Input, MetricCard, phone, date-picker, settings-form…
├── lib/
│   ├── modules.ts                # Module interface + registry + getActiveModules
│   ├── phone.ts, countries.ts, utils.ts, loyalty-url.ts, download-qr.ts
├── components/ui/                # shadcn
├── tests/ + tests/ui/
├── docs/
│   ├── superpowers/specs/        # Specs de diseño (orders, loyalty…)
│   ├── superpowers/plans/        # Planes story-by-story
│   └── pedidos/
├── _bmad-output/                 # Spines, specs BMAD, brainstorms
├── design-artifacts/             # *.pen + previews
├── supabase/migrations/          # Mirror / cloud push
├── shell/db/migrations/          # Source of truth del schema app (001–008)
├── AGENTS.md                     # BMAD + TDD + shadcn OBLIGATORIOS
└── proxy.ts                      # Guard cookie para /:slug/dashboard/*
```

---

## 3. Cómo se conectan los módulos

### 3.1 Registry (`lib/modules.ts`)

```ts
export interface Module {
  id: string
  name: string
  icon: string                 // key lucide en dashboard-layout (gift, receipt…)
  dashboardPath?: string       // default = id
  publicRoutes?: ...           // poco usado hoy; rutas van en app/
  dashboardRoutes?: ...
  apiRoutes?: ...
  dashboardWidgets?: Widget[]
  getRecentActivity?: (businessId, limit) => Promise<ActivityEvent[]>
  HomeSection?: ComponentType<{ slug; business }>  // bloque en home del dueño
}

const registry = {
  loyalty: loyaltyModule,
  orders: ordersModule,
  // turnos: turnosModule,  ← AQUÍ se registra un módulo nuevo
}
```

Activación por negocio: `business.active_modules: string[]` (Postgres `TEXT[]`).  
`getActiveModules(business)` filtra el registry.  
Home owner y hub `/dashboard/modules` solo muestran módulos activos.

### 3.2 Manifiesto de ejemplo (`modules/orders/index.ts`)

```ts
export const ordersModule: Module = {
  id: "orders",
  name: "Pedidos",
  icon: "receipt",
  dashboardPath: "orders",
  HomeSection: OrdersHomeSection,
  getRecentActivity: (businessId, limit) =>
    getRecentActivity(metricsDeps, { businessId, limit }),
}
```

### 3.3 Flujo request típico

```
Browser
  → app/(public|dashboard)/[slug]/…/page.tsx   (RSC: getBusiness, auth, gate active_modules)
  → modules/<mod>/{public|dashboard}/*.tsx     (UI; fetch a /api/…)
  → app/api/<mod>/…/route.ts                   (cookie session, parse body)
  → modules/<mod>/api/*.ts                     (deps inyectados → SQL)
  → shell/db/pool.ts → Postgres
```

**Contrato de dominio:** funciones async `(deps, input) => { status: number, body: Record }`.  
Routes: `NextResponse.json(result.body, { status: result.status })`.  
Errores: `{ error: string, code?: string }`.

### 3.4 Dependency injection

Cada módulo tiene `modules/<id>/lib/default-deps.ts` que cablea:

- `sql` de `shell/db/pool`
- `getBusiness` de `shell/db/business`
- generators, notifiers, MP clients, etc.

En tests se pasan **mocks** de `Deps` sin pegarle a la DB real (ideal).

### 3.5 Dirección de imports (invariante)

```
app/api  →  modules/*/api + default-deps + shell/auth
app/pages → modules/*/public|dashboard + shell/db/business + shell/auth
modules/*/api  →  lib del módulo + shell vía deps (NO React)
modules/*/dashboard|public → lib del módulo + components/ui + shell/ui + fetch
modules/A  ✗→  modules/B
UI  ✗→  shell/db directo (salvo pages RSC que leen business)
SQL solo en api/* (inyectado) y shell/db + migrations
```

### 3.6 Multi-tenant y brand

- Todo cuelga de `businesses.id` / `slug`.
- Layouts inyectan CSS vars del color del negocio.
- Empleados: `employees.business_id` + `role` (`owner` | `employee`) + `is_active`.
- Sesión: cookie httpOnly-ish `session_token` → tabla `sessions` → `validateSession`.
- Clientes finales (loyalty/orders): filas en `customers` (phone+business unique). Orders setea cookie `client_id` no httpOnly al crear pedido.

### 3.7 Nav dashboard

`shell/layouts/dashboard-layout.tsx`:

- **Owner:** Panel · Actividad · Módulos · Ajustes.
- **Employee:** un item por módulo activo (`/{slug}/dashboard/{mod.id}`). Label especial: loyalty → “Clientes”.
- Iconos: mapa local `MODULE_ICONS` — al agregar módulo, **hay que sumar el icono** si no está (`receipt` ya está; para turnos p.ej. `calendar` hay que wirearlo).

`proxy.ts` (Next middleware-style export): sin `session_token` redirige `/:slug/dashboard/*` → login.

---

## 4. Frontend web — cómo está armada la UI

### 4.1 Superficies

| URL | Quién | Qué |
|-----|-------|-----|
| `/` | Público Tumo | Landing marketing (`modules/landing`) |
| `/{slug}/login` | Empleado/dueño | OTP WhatsApp |
| `/{slug}/loyalty` … | Cliente | Alta + tarjeta puntos + QR |
| `/{slug}/orders` … | Cliente | Catálogo, carrito wizard, confirmación |
| `/{slug}/dashboard` | Owner | Home multi-módulo |
| `/{slug}/dashboard/loyalty` | Empleado | Scanner QR + sheet puntos |
| `/{slug}/dashboard/orders` | Empleado | Panel pedidos + productos + horarios |

### 4.2 Patrones UI

- Mobile-first, **elderly-UX** fuerte en orders: body ≥16px, touch ≥48px, CTA primario fill `var(--color-primary)`, “Volver” en subpantallas, lenguaje llano ES-AR.
- Brand: no hardcodear hex de marca; usar CSS vars del layout.
- shadcn para sheet/dialog/calendar/popover/command.
- Carrito orders: `localStorage` key `tumo_cart_<slug>` (`modules/orders/lib/cart.ts`).
- Totales **siempre server-side**; client es informativo.
- Precios: **enteros en centavos**; display `formatCents` es-AR (`$ 12.500`).

### 4.3 RSC vs client

- `app/**/page.tsx` y layouts: Server Components (cookies, DB, redirects).
- Formularios, scanners, carrito, paneles interactivos: `"use client"` en `modules/**`.

---

## 5. Backend — API surface actual

### Auth (`app/api/auth/*` → `shell/auth/handlers.ts`)

| Method | Path | Notas |
|--------|------|--------|
| POST | `/api/auth/send-code` | phone + slug → Authyo OTP |
| POST | `/api/auth/verify-code` | set cookie `session_token` 30d |
| GET | `/api/auth/me` | sesión actual |
| POST | `/api/auth/logout` | borra sesión |

### Business

| Method | Path | Notas |
|--------|------|--------|
| GET/PATCH | `/api/business` | brand |
| POST | `/api/business/logo` | Supabase storage |

### Loyalty

| Method | Path | Dominio |
|--------|------|---------|
| * | `/api/loyalty/customers` | alta/listado |
| POST | `/api/loyalty/points` | earn por `rangeIndex` |
| POST | `/api/loyalty/redemptions` | canje |
| PATCH | `/api/loyalty/program` | points_needed, ranges |
| GET | `/api/loyalty/metrics` | |
| * | `/api/loyalty/redemptions` | |

### Orders

| Method | Path | Dominio |
|--------|------|---------|
| GET | `/api/orders/catalog?slug=` | catálogo público |
| POST | `/api/orders` | createOrder (público, idempotency) |
| GET | `/api/orders` | list (sesión) |
| GET/PATCH | `/api/orders/[id]` | detalle / status / etc. |
| POST | `/api/orders/[id]/receipt` | comprobante BYTEA |
| POST | `/api/orders/[id]/payment-method` | |
| POST | `/api/orders/[id]/mp-preference` | |
| POST | `/api/orders/mercadopago/webhook/[businessId]` | |
| * | `/api/orders/products`… | ABM + availability + variants + categories |
| * | `/api/orders/settings` + `/hours` | |
| GET | `/api/orders/metrics` | |

---

## 6. Modelo de datos (Postgres)

Migraciones app (orden en `shell/db/migrate.ts`):

1. `001_initial.sql` — businesses, employees, sessions, customers, (legacy purchases/redemptions)
2. `002_business_surface_tagline.sql` — surface_color, tagline
3. `003_loyalty_points_native.sql` — points, point_ranges, point_movements; drop redemptions
4. `004_orders.sql` — catálogo, orders, payments, settings
5. `005_orders_mp_credentials.sql` — mp_access_token, mp_webhook_secret por negocio
6. `006_orders_products_abm.sql` — unique name, price≥0, ON DELETE SET NULL items
7. `008_employees_is_active.sql` — is_active en employees  
   (no hay 007 en el tree actual)

También existe `supabase/migrations/*` para push a cloud / realtime publication.

### Entidades shell (compartidas)

```
businesses
  id, name, slug UNIQUE, logo, primary_color, secondary_color,
  surface_color, tagline,
  active_modules TEXT[] DEFAULT {loyalty},
  points_needed, reward_name, point_ranges JSONB,
  created_at

employees
  id, name, phone, role ('employee'|'owner'), business_id, is_active, created_at

sessions
  id, employee_id, token UNIQUE, expires_at

customers          ← COMPARTIDA loyalty + orders
  id, name, phone, birthday, code UNIQUE (4 dígitos),
  points, total_points, business_id,
  UNIQUE(phone, business_id)
```

### Loyalty

```
point_movements
  customer_id, employee_id, business_id,
  points, amount_cents, range_label, kind ('earn'|'redeem'), created_at
```

Program config vive **en la fila businesses** (no tabla aparte).

### Orders

```
product_categories, products, product_variant_groups, product_variant_options
orders (status comida ⊥ payment_status dinero)
order_items + order_item_variants  (snapshots de nombre/precio)
order_payments (intentos; receipt BYTEA)
orders_settings (delivery_fee, transfer_*, mp_*, is_paused, hours JSONB, tokens MP)
```

Estados pedido: `pending|confirmed|preparing|ready|completed|cancelled`  
Pago method: `transfer|mercadopago|at_pickup`  
Pago status: `unpaid|pending|pending_receipt|pending_verification|paid|rejected`  
Fulfillment: `pickup|delivery`

---

## 7. Auth en detalle

1. Empleado pre-cargado en seed (phone E.164 normalizado con `lib/phone`).
2. `send-code`: rate limit in-memory → Authyo → `maskId`.
3. `verify-code`: OTP OK → `createSession` → cookie `session_token`.
4. Dashboard layout y APIs sensibles: `validateSession(token)` + match `businessId`.
5. Owner vs employee: home multi-módulo solo owner; employee redirige a loyalty por default hoy (`dashboard/page.tsx`).
6. Clientes de loyalty se registran por formulario público (no OTP empleado).
7. Orders puede crear/upsert customer por phone en checkout.

**No hay** roles finos por módulo todavía: si el módulo está activo y hay sesión del business, el employee entra al panel del módulo.

---

## 8. Cómo se implementó un módulo real (plantilla Orders)

Doc canónico:

- Spec: `docs/superpowers/specs/2026-08-12-orders-module-design.md`
- PRD: `docs/superpowers/specs/2026-08-18-orders-prd-final.md`
- Plan stories: `docs/superpowers/plans/2026-08-21-orders-module.md`
- Spine loyalty (paradigma): `_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md`

### Checklist para un módulo nuevo (Turnos)

1. **BMAD + TDD** (AGENTS.md): spec → plan con stories checkbox → red/green por story. Skills en `.agents/skills/bmad-*`.
2. Spec en `docs/superpowers/specs/YYYY-MM-DD-turnos-module-design.md`.
3. Plan en `docs/superpowers/plans/YYYY-MM-DD-turnos-module.md`.
4. Migración `shell/db/migrations/009_turnos.sql` + registrar en `migrate.ts` (+ mirror supabase si cloud).
5. Crear árbol:
   ```
   modules/turnos/
     index.ts
     api/…
     lib/types.ts, default-deps.ts, …
     dashboard/…
     public/…
   ```
6. Registrar en `lib/modules.ts`.
7. Sumar icono en `dashboard-layout.tsx` `MODULE_ICONS`.
8. Thin routes:
   - `app/api/turnos/.../route.ts`
   - `app/(public)/[slug]/turnos/...`
   - `app/(dashboard)/[slug]/dashboard/turnos/...`
9. Gate público: `business.active_modules.includes("turnos")` o `notFound()`.
10. Seed: `active_modules` incluye `"turnos"` para el business piloto.
11. Tests: `tests/turnos-*.test.ts` + `tests/ui/turnos-*.test.tsx`.
12. **No importar** `modules/orders` ni `modules/loyalty`. Si necesitás customer: upsert vía shell/sql en tu api como orders.
13. Settings del módulo: preferir tabla `turnos_settings (business_id PK, …)` como orders (no ensuciar `businesses` salvo campos realmente cross-module).
14. Copy UI en español; identificadores en inglés.

### Patrones a copiar de Orders/Loyalty

| Patrón | Dónde mirar |
|--------|-------------|
| API pura + deps | `modules/orders/api/orders.ts`, `modules/loyalty/api/points.ts` |
| default-deps | `modules/orders/lib/default-deps.ts` |
| Adapter route | `app/api/orders/route.ts`, `app/api/loyalty/points/route.ts` |
| Página pública gate | `app/(public)/[slug]/orders/page.tsx` |
| Página dashboard sesión | `app/(dashboard)/[slug]/dashboard/orders/page.tsx` |
| Home section owner | `modules/orders/dashboard/home-section.tsx` |
| Activity feed | `getRecentActivity` en metrics + `collectRecentActivity` |
| Horarios JSONB | `modules/orders/lib/hours.ts` + `orders_settings.hours` |
| Realtime opcional | `modules/orders/lib/realtime.ts` (no-op sin env + poll fallback) |
| Money cents | `formatCents`, nunca float |
| Idempotencia | `idempotency_key UNIQUE` en create |

---

## 9. Landing y producto comercial

- `modules/landing/*`: página de venta Tumo, CSS propio `landing.css`, media en `public/landing/`.
- Herramientas listadas hoy: Fidelización + “a medida”; pedidos como nota.
- Precio desde en config: `$19.900` ARS/mes.
- WhatsApp CTA: placeholder en `modules/landing/config.ts`.

---

## 10. Proceso de desarrollo del repo

### Obligatorio (AGENTS.md)

1. **BMAD** antes de tocar código de app (skills del proyecto).
2. **TDD:** test que falla → mínimo código → refactor.
3. **shadcn** para widgets complejos.
4. Conventional Commits: `feat(turnos): …`, `fix(orders): …`.
5. Branches cortas `feat/…`; no `git add -A`; no force main.
6. Verify: `bun test` · `bun run lint` · `bun run build`.

### DB local

```bash
# Si usás docker-compose local
docker compose up -d
# .env.local: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable
bun run shell/db/migrate.ts   # o el path exacto que usen: bun shell/db/migrate.ts
bun run shell/db/seed.ts
bun run dev
```

Pool: si URL contiene `.pooler.supabase.com` → `ssl: 'require'`; si no → `ssl: false`.

### Git / org

- Org GitHub: Estudio-Nomade (contexto historial).
- Piloto histórico orders: **El Auténtico Carri** (food truck).
- Branch actual de trabajo orders polish: `feat/orders-ux-polish`.

---

## 11. Diagrama contenedores

```mermaid
flowchart TB
  subgraph client [Browser]
    Pub["/{slug}/loyalty|orders|turnos"]
    Dash["/{slug}/dashboard/*"]
    Land["/"]
  end

  subgraph next [Next.js 16 App - Bun]
    Pages["app/(public|dashboard) pages"]
    API["app/api/* route handlers"]
    Mods["modules/* domain"]
    Shell["shell/* auth layouts db ui"]
  end

  subgraph data [Data]
    PG[(PostgreSQL)]
    SB[(Supabase Storage + Realtime)]
    AY[Authyo OTP]
    MP[MercadoPago]
  end

  Land --> Pages
  Pub --> Pages
  Dash --> Pages
  Pages --> Mods
  Pages --> Shell
  API --> Mods
  API --> Shell
  Mods --> PG
  Shell --> PG
  Shell --> SB
  Shell --> AY
  Mods --> MP
  Mods --> SB
```

```mermaid
flowchart LR
  subgraph registry [lib/modules.ts]
    L[loyaltyModule]
    O[ordersModule]
    T[turnosModule futuro]
  end
  Biz["businesses.active_modules"]
  Biz --> registry
  registry --> Home[Dashboard HomeSection]
  registry --> Hub[Modules hub]
  registry --> Nav[Employee nav]
```

---

## 12. Qué NO hacer al armar Turnos

- No meter lógica de negocio en `app/api` o en page.tsx.
- No importar `modules/orders` o `modules/loyalty` “para reusar un tipo”.
- No float para dinero/duración facturable si hay plata (usar int).
- No hardcodear horarios/colores de un negocio en código.
- No skipear tests ni BMAD “porque es chico”.
- No asumir Next 13/14 APIs: `params`/`searchParams` son async; middleware file aquí es `proxy.ts`.
- No poner SQL en componentes client.
- No dual-write ledgers ni tablas legacy de purchases.
- No commitear secretos / `.env.local`.

---

## 13. Puntos de extensión concretos para Turnos

Archivos mínimos a tocar (además del módulo nuevo):

| Archivo | Cambio |
|---------|--------|
| `lib/modules.ts` | `import { turnosModule }` + `registry.turnos` |
| `shell/db/migrate.ts` | `"009_turnos.sql"` |
| `shell/db/migrations/009_turnos.sql` | schema |
| `shell/db/seed.ts` / `seed-data.ts` | active_modules + datos demo |
| `shell/layouts/dashboard-layout.tsx` | icono lucide |
| `app/api/turnos/**` | adapters |
| `app/(public)/[slug]/turnos/**` | páginas cliente |
| `app/(dashboard)/[slug]/dashboard/turnos/**` | panel |
| `tests/turnos-*.test.ts` | TDD |
| `modules/landing/config.ts` | opcional: listar herramienta |

**Reuso probable del shell:**

- `customers` (si el turno es de un cliente con phone)
- `employees` + session (quién confirma/atiende)
- `hours` pattern de orders (si hay franjas de atención)
- `BusinessProvider` + brand tokens
- shadcn `calendar` + `popover` ya instalados (`components/ui/calendar.tsx`) — ideal DatePicker de turnos
- `shell/ui/date-picker.tsx` ya existe

**Decisiones de producto a definir en el spec de Turnos (no asumas):**

- ¿Reserva pública online vs solo agenda interna empleado?
- ¿Slots fijos vs duración variable?
- ¿Overlap staff / recursos (sillones, mesas)?
- ¿Depósito / seña / MercadoPago o solo hold?
- ¿Relación con orders (turno + pedido) o 100% independiente?
- ¿Notificaciones WhatsApp (mismo stub `sendWhatsApp` que orders)?

---

## 14. Referencias rápidas de código

| Concepto | Path |
|----------|------|
| Module type + registry | `lib/modules.ts` |
| Loyalty manifest | `modules/loyalty/index.ts` |
| Orders manifest | `modules/orders/index.ts` |
| Session | `shell/auth/session.ts` |
| Auth handlers | `shell/auth/handlers.ts` |
| DB pool | `shell/db/pool.ts` |
| getBusiness | `shell/db/business.ts` |
| Dashboard layout nav | `shell/layouts/dashboard-layout.tsx` |
| Public layout brand | `shell/layouts/public-layout.tsx` |
| Dashboard home multi-mod | `app/(dashboard)/[slug]/dashboard/page.tsx` |
| Dashboard shell layout auth | `app/(dashboard)/[slug]/layout.tsx` |
| Example pure API | `modules/loyalty/api/points.ts` |
| Example route | `app/api/loyalty/points/route.ts` |
| Orders create + list route | `app/api/orders/route.ts` |
| Decoupling modules spec | `_bmad-output/implementation-artifacts/spec-dashboard-module-decoupling.md` |
| Agent rules | `AGENTS.md` |

---

## 15. Estado de módulos (snapshot)

| Módulo | Estado | Notas |
|--------|--------|--------|
| landing | Producción marketing | Independiente del tenant |
| loyalty | Maduro | Points-native, QR scan, program ranges, owner IA |
| orders | MVP+ post-MVP | Catálogo, carrito, MP, realtime, ABM productos, horarios, notif stub WA |
| turnos | **No existe** | Objetivo de esta auditoría |

---

## 16. Prompt corto para el agente de Turnos

```
Trabajás en Tumo (Next 16 + React 19 + Bun + Postgres + modular monolith).
Leé docs/AUDITORIA-TUMO-ARQUITECTURA.md completo y AGENTS.md.
Seguí BMAD + TDD estricto. No freestyle.

Para el módulo Turnos:
1) Escribí spec en docs/superpowers/specs/ + plan stories en docs/superpowers/plans/
2) Implementá modules/turnos/ con el mismo shape que orders/loyalty
3) Thin adapters en app/api/turnos y app/(public|dashboard)/[slug]/…/turnos
4) Registrá en lib/modules.ts; migración 009; seed active_modules
5) Un módulo no importa de otro; customers es shell compartido
6) API = (deps, input) => {status, body}; tests con bun test primero
7) UI elderly-friendly; brand via CSS vars; shadcn calendar/dialog/sheet
8) Verify: bun test && bun run lint && bun run build
```

---

*Fin de la auditoría. Mantener este doc actualizado cuando se mergee Turnos o cambie el paradigma de registry.*
