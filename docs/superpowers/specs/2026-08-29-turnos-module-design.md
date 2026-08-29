# Turnos Module — Design Spec

**Date:** 2026-08-29  
**Status:** Approved for implementation  
**Visual SSOT:** `design-artifacts/turnos-mvp.pen` (frames P*, D*, B*)  
**Architecture:** `docs/AUDITORIA-TUMO-ARQUITECTURA.md`  
**Pattern reference:** Orders module (`modules/orders/**`)

---

## 1. One-liner

Multi-tenant Tumo module: business publishes `/{slug}/turnos` so a client books **one service + one time slot**, confirms via **transfer (alias/CBU + receipt)** or **cash at location**. Owner/employee manage agenda in `/{slug}/dashboard/turnos`. Same admin shell as Loyalty + Orders.

---

## 2. Product defaults (locked for v1)

| Topic | Default |
|-------|---------|
| Day picker | Variante A: list next 7–14 days with availability |
| Slot size | = service `duration_minutes` |
| Resources | Single global calendar (no multi-chair) |
| Cash | Booking created with payment pending at location; business confirms attendance |
| Amount | 100% of service price (no partial deposit) |
| WhatsApp notify | Stub no-op (same debt as orders) |
| MercadoPago | **Out of scope** v1 |
| Cross-module checkout | Independent of Orders (no food cart coupling) |

---

## 3. Domain model

### 3.1 Tables (`009_turnos.sql`)

**`turnos_services`**
- `id UUID PK`, `business_id UUID NOT NULL → businesses`
- `name TEXT NOT NULL`, `price_cents INT NOT NULL`, `duration_minutes INT NOT NULL`
- `is_active BOOLEAN DEFAULT true`, `sort_order INT DEFAULT 0`
- `created_at TIMESTAMPTZ`

**`turnos_settings`**
- `business_id UUID PK → businesses`
- `transfer_alias TEXT`, `transfer_cbu TEXT`, `transfer_holder TEXT`
- `is_paused BOOLEAN DEFAULT false`
- `hours JSONB` — same shape spirit as orders hours (weekday windows), e.g.  
  `{ "mon":[["09:00","18:00"]], ... }` or simplified v1 `{ "weekdays":"mon-fri", "open":"09:00", "close":"18:00", "sat": ... }`  
  Spec implementation: JSONB map `dow → [{start, end}]` like orders if already exists; else minimal open/close mon–sat.

**`turnos_bookings`**
- `id UUID PK`, `business_id`, `customer_id → customers`, `service_id → turnos_services`
- `starts_at TIMESTAMPTZ NOT NULL`, `ends_at TIMESTAMPTZ NOT NULL`
- `status TEXT` CHECK: `pending | confirmed | completed | cancelled`
- `payment_method TEXT` CHECK: `transfer | at_location`
- `payment_status TEXT` CHECK: `unpaid | pending_receipt | pending_verification | paid | rejected`
- Snapshots: `service_name TEXT`, `price_cents INT`, `duration_minutes INT`
- `idempotency_key TEXT UNIQUE`
- `notes TEXT`, `created_at`, `updated_at`
- Index: `(business_id, starts_at)`, `(business_id, payment_status)`, `(business_id, status)`

**`turnos_payments`** (one row per attempt; booking.payment_status denormalized)
- `id UUID PK`, `booking_id → turnos_bookings ON DELETE CASCADE`
- `method TEXT`, `status TEXT`, `amount_cents INT`
- `receipt_bytes BYTEA`, `receipt_mime TEXT`, `receipt_filename TEXT`
- `rejection_reason TEXT`, `created_at`

### 3.2 Money / time
- Money: **integer cents only**
- Duration: **integer minutes**
- No floats

### 3.3 Customer
- Upsert `customers` by `(phone, business_id)` with name — same pattern as orders. Do not alter customers schema beyond existing columns.

### 3.4 Availability
- Pure function in `modules/turnos/lib/availability.ts`
- Inputs: settings hours, service duration, existing non-cancelled bookings, day
- Output: free start times (slots) that fit duration without overlap on the single calendar
- Paused settings → public shows empty/paused state

### 3.5 Booking status transitions (dashboard)
| Action | Effect |
|--------|--------|
| Create transfer + receipt | status `pending` or `confirmed`, payment `pending_verification` |
| Create cash | status `confirmed` (or `pending`), payment `unpaid` / treat as pending at location |
| Approve payment | payment `paid` |
| Reject payment | payment `rejected` + reason |
| Mark completed / attended | status `completed` |
| Cancel | status `cancelled` (confirm UI) |

Exact labels on badges match Pencil D1 (Reservado/Confirmado/Atendido/Cancelado + pago badges).

---

## 4. Multi-module wiring (must match existing shell)

### 4.1 Registry
- `modules/turnos/index.ts` → `turnosModule`:  
  `id: "turnos"`, `name: "Turnos"`, `icon: "calendar"`, `dashboardPath: "turnos"`, `HomeSection`, `getRecentActivity`
- Register in `lib/modules.ts` registry next to loyalty/orders

### 4.2 Activation
- `businesses.active_modules` includes `"turnos"`
- Seed demo business: `['loyalty','orders','turnos']` (or append turnos to existing pilot seed)
- Public routes: `notFound()` if `!active_modules.includes('turnos')`

### 4.3 Owner shell (unchanged structure)
Nav: Panel | Actividad | Módulos | Ajustes  
- Panel stacks `HomeSection` for each active module  
- Actividad merges `getRecentActivity`  
- Módulos hub cards → `/[slug]/dashboard/turnos`  
- Ajustes = brand only (name/logo/colors) — **no** turnos service ABM here

### 4.4 Employee shell
One nav item per module: Loyalty→“Clientes”, Orders→“Pedidos”, Turnos→“Turnos”  
Add `calendar` to `MODULE_ICONS` in `shell/layouts/dashboard-layout.tsx`

### 4.5 Brand
CSS vars `--color-primary` / `--primary` from business — public + dashboard Turnos inherit. No module-local brand editor.

### 4.6 Independence
- `modules/turnos` never imports `modules/orders` or `modules/loyalty`
- May copy payment/receipt patterns locally
- Share shell: `customers`, session, `sql`, `getBusiness`, phone utils, UI

---

## 5. Routes

### Public
| Path | Pencil | Component |
|------|--------|-----------|
| `/{slug}/turnos` | P1 | Entry |
| `/{slug}/turnos/reservar` | P2–P7 wizard client | Multi-step |
| `/{slug}/turnos/[id]` | P8 | Confirmation / status |

### Dashboard
| Path | Pencil | Who |
|------|--------|-----|
| `/{slug}/dashboard/turnos` | D1 | owner + employee |
| `/{slug}/dashboard/turnos/[id]` | D2 | owner + employee |
| `/{slug}/dashboard/turnos/servicios` | D3 | owner (employee read if needed) |
| `/{slug}/dashboard/turnos/ajustes` | D4 | owner only |

### API (thin → domain)
`app/api/turnos/services`, `.../availability`, `.../bookings`, `.../bookings/[id]`, `.../payments`, `.../settings`  
Domain: `(deps, input) => { status, body }` — SQL only via injected `sql`.

---

## 6. UX / elderly rules
- Body ≥16px, titles ≥20–22, touch ≥48, primary CTA ≥52–56px, `var(--color-primary)`
- One primary CTA; Volver on sub-screens
- Copy ES-AR plain
- Visual fidelity to Pencil frames (not pixel-perfect required day-1, but flow + hierarchy yes)

---

## 7. Out of scope v1
- MercadoPago for turnos
- Multi-resource / multi-chair
- Partial deposit
- Real WhatsApp provider
- Cross-sell Orders in booking flow
- Turnos client brand preview registry (optional debt)

---

## 8. Acceptance (“same admin panel”)

When `active_modules = ['loyalty','orders','turnos']`:

1. Owner Panel shows 3 home sections  
2. Actividad can include turnos events  
3. Módulos lists Turnos → dashboard/turnos  
4. Ajustes remains global brand; primary color flows to public turnos  
5. Services/alias/CBU/pause live under dashboard/turnos/*  
6. Employee nav: Clientes + Pedidos + Turnos  
7. Public /turnos 404 without module  
8. No cross-module imports  
9. Tests + lint + build green  
