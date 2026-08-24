# Orders Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el Módulo de Pedidos para Carri (food truck): catálogo público + carrito wizard 3 pasos + confirmación + panel de empleado, siguiendo el spec `docs/superpowers/specs/2026-08-12-orders-module-design.md`.

**Architecture:** Modular monolith por dominio (mismo paradigma que `modules/loyalty`). `modules/orders/api/*` = funciones puras dep-inyectadas que devuelven `{ status, body }`; `app/api/*` y `app/(public|dashboard)/...` = thin adapters; `modules/orders/lib/*` = types + helpers puros; `modules/orders/public/*` y `dashboard/*` = componentes client. `customers` es tabla del shell: Orders hace upsert `(phone, business_id)` **sin alterar** la tabla ni importar de loyalty.

**Tech Stack:** Next.js 16.2.12 (App Router), React 19, `postgres` ^3.4.9, bun test (TDD), shadcn/ui (`components/ui/*`) + `shell/ui/*`, `@/lib/phone` + `libphonenumber-js`.

**Spec:** `docs/superpowers/specs/2026-08-12-orders-module-design.md`
**Branch:** trabajo sobre `main` (mismo patrón que loyalty). `active_modules` de Carri suma `"orders"`.

**Commits:** `git commit -S` (GPG). Si el agente no puede firmar, stagea los archivos e imprime el one-liner para el humano.

---

## Global Constraints (verbatim del spec — aplican a TODAS las tareas)

- **Precios en centavos INT.** Nunca float. Display es-AR con separador de miles (`$ 12.500`).
- **Totales siempre server-side.** Los totales del cliente son informativos; el server recalcula.
- **Snapshot total:** nombre/precio al momento de la compra se guardan en el pedido.
- **`customers` NO se altera.** Orders hace upsert por `(phone, business_id)` y genera `code` de 4 dígitos si el cliente es nuevo. Reusa el row sin pisar el nombre.
- **Dos ejes ortogonales:** `status` (la comida) y `payment_status` (el dinero).
- **`order_number` correlativo global por negocio** (`UNIQUE(business_id, order_number)`, no resetea por día).
- **Idempotencia anti doble-tap:** `idempotency_key UNIQUE`; segundo POST devuelve el mismo order.
- **Tope cantidad 20 por ítem** (stepper + server).
- **Comprobantes BYTEA en Postgres**; compresión client-side (max 1600px → JPEG ~400KB); mime `image/jpeg|png|webp|heic`; tope 3MB post-compresión.
- **Horarios** en `orders_settings.hours` JSONB (días 0–6, 0=domingo; `close < open` = cruza medianoche). `is_paused` = kill switch.
- **Elderly-UX:** body ≥16px, títulos ≥20px, contraste ≥4.5:1; touch targets ≥48px, botones primarios ≥56px; una acción clara por pantalla; iconos siempre con label; CTA primario = fill `var(--color-primary)` + texto blanco; campos ≥52px; lenguaje llano; "Volver" en toda sub-pantalla.
- **Regla de módulos:** un módulo nunca importa de otro. Solo comparte shell. SQL solo en `api/*` vía `sql` inyectado y en `shell/db`/migraciones.
- **Auth:** `session_token` cookie → `validateSession` → `{ id, name, phone, role, businessId }`.

---

## File map

| File | Role |
|------|------|
| `shell/db/migrations/004_orders.sql` | **Create** — 9 tablas + índices + CHECKs |
| `shell/db/migrate.ts` | **Modify** — registrar `004_orders.sql` |
| `modules/orders/lib/types.ts` | **Create** — tipos + `initialPaymentStatus` + `formatCents` |
| `modules/orders/index.ts` | **Create** — manifiesto `ordersModule` |
| `lib/modules.ts` | **Modify** — registrar `orders: ordersModule` |
| `shell/db/seed.ts` | **Modify** — `active_modules` = `{loyalty,orders}` |
| `modules/orders/lib/hours.ts` | **Create** (S2) — `isOpenNow(hours, now)` |
| `modules/orders/lib/cart.ts` | **Create** (S2) — carrito `tumo_cart_<slug>` + totales informativos |
| `modules/orders/lib/default-deps.ts` | **Create** (S2) — deps reales (sql, getBusiness, generateCode) |
| `modules/orders/api/catalog.ts` | **Create** (S2) — `getCatalog` |
| `app/api/orders/catalog/route.ts` | **Create** (S2) — adapter |
| `modules/orders/public/catalog.tsx` | **Create** (S2) — chips + cards + barra carrito |
| `app/(public)/[slug]/orders/page.tsx` | **Create** (S2) — página catálogo |
| `modules/orders/api/orders.ts` | **Create** (S3) — `createOrder` + `getOrder` |
| `app/api/orders/route.ts` | **Create** (S3) — adapter POST |
| `modules/orders/public/cart.tsx` | **Create** (S3) — wizard 3 pasos |
| `app/(public)/[slug]/orders/cart/page.tsx` | **Create** (S3) — página wizard |
| `modules/orders/public/product-detail.tsx` | **Create** (S3) — detalle con variantes |
| `app/(public)/[slug]/orders/producto/[id]/page.tsx` | **Create** (S3) — página detalle |
| `modules/orders/public/order-confirmation.tsx` | **Create** (S4) — confirmación + comprobante |
| `app/(public)/[slug]/orders/[id]/page.tsx` | **Create** (S4) — página confirmación |
| `modules/orders/api/orders.ts` (ext) | **Modify** (S4) — `uploadReceipt`, `changePaymentMethod` |
| `app/api/orders/[id]/route.ts` + `[id]/receipt/route.ts` | **Create** (S4) — adapters |
| `modules/orders/dashboard/panel.tsx` + `order-detail.tsx` | **Create** (S5) — panel + detalle |
| `modules/orders/api/orders.ts` (ext) | **Modify** (S5) — `listOrders`, `transitionStatus`, `verifyPayment` |
| `modules/orders/dashboard/products-availability.tsx` | **Create** (S6) — toggles |
| `modules/orders/api/products.ts` | **Create** (S6) — `setAvailability` |
| `modules/orders/api/metrics.ts` + `dashboard/widgets.tsx` + `home-section.tsx` | **Create** (S6) — widgets + actividad |
| `modules/orders/api/mercadopago.ts` | **Create** (S7) — preference + webhook |

---

## Stories (orden de implementación)

| # | Story | Alcance | Entregable verificable |
|---|-------|---------|------------------------|
| **S1** | Base: migración + types + manifiesto | `004_orders.sql`, `types.ts`, `index.ts`, registro + seed | `bun test` verde; schema aplicable |
| **S2** | Catálogo público | `hours.ts`, `cart.ts`, seed datos, `api/catalog`, `catalog.tsx`, ruta | catálogo renderiza con estado abierto/cerrado |
| **S3** | Crear pedido (checkout) | `createOrder` + wizard 3 pasos + detalle producto | pedido creado con snapshot + idempotencia |
| **S4** | Confirmación + comprobante | `getOrder`, `uploadReceipt`, alias/CBU | subir comprobante → `pending_verification` |
| **S5** | Panel empleado | lista + detalle + transiciones + verificar pago | empleado mueve hasta `completed` |
| **S6** | Toggle disponibilidad + home | `api/products`, `api/metrics`, widgets | widgets + "Comprobantes para revisar" |
| **S7** | MercadoPago | preference + webhook + reintento | MP aprobado → `paid`+`confirmed` |
| **S8** | Seed completo + pulido | seed catálogo/variantes/horarios + órdenes demo | flujo end-to-end en dev |

> **Nota de adaptación:** el spec escribe "migración `003_orders.sql`" de forma ilustrativa, pero `003` ya está tomado por `003_loyalty_points_native.sql`. Este plan usa **`004_orders.sql`**.

---

## Story 1 — Base: migración 004 + types + manifiesto  *(implementada en este plan)*

### Interfaces (produce)

- `modules/orders/lib/types.ts`:
  - `type OrderStatus`, `type PaymentMethod`, `type PaymentStatus`, `type Fulfillment`
  - `const ORDER_STATUSES`, `const PAYMENT_METHODS`, `const PAYMENT_STATUSES`, `const FULFILLMENT_OPTIONS` (readonly arrays, orden canónico)
  - `initialPaymentStatus(method: PaymentMethod): PaymentStatus`
  - `formatCents(cents: number): string` (es-AR, separador de miles `.`)
- `modules/orders/index.ts`: `export const ordersModule: Module` con `id:"orders"`, `name:"Pedidos"`, `icon:"receipt"`, `dashboardPath:"orders"`.
- `shell/db/migrations/004_orders.sql`: 9 tablas (§1 del spec) + índices + CHECKs.

### Task 1.1 — Tests RED

**Files:** `tests/orders-types.test.ts`, `tests/orders-migration.test.ts`, `tests/orders-module.test.ts` (creados en este plan).

### Task 1.2 — Implementación GREEN

**Files:** `modules/orders/lib/types.ts`, `shell/db/migrations/004_orders.sql`, `shell/db/migrate.ts`, `modules/orders/index.ts`, `lib/modules.ts`, `shell/db/seed.ts`.

**Aplicar migración (ops):** `DATABASE_URL=<...> bun shell/db/migrate.ts` (requiere env exportado; bun no carga `.env.local` por defecto).

---

## Story 2 — Catálogo público ✅ Completada (2026-08-21)

> Implementada con TDD (Red → Green). Tests: `tests/orders-hours.test.ts`, `tests/orders-cart.test.ts`, `tests/orders-catalog.test.ts`, `tests/ui/orders-catalog.test.tsx` (42 asserts, verdes). Nota: `nextOpening` devuelve `{ dayLabel, time } | null` (no string) para que el banner componga "Abrimos hoy a las 19:00". Catálogo devuelve TODOS los productos con `isAvailable` (el agotado se deshabilita en el cliente, no se filtra).

**Interfaces (produce):**
- `modules/orders/lib/hours.ts`: `isOpenNow(hours: OrdersHours, now?: Date): boolean` — día `getDay()` (0=domingo); día sin entrada = cerrado; `close < open` = cruza medianoche (ventana abarca día actual hasta `close` del día siguiente). `nextOpening(hours, now): string` para el banner "Abrimos hoy a las 19:00".
- `modules/orders/lib/cart.ts`: `CartItem`, `loadCart(slug)`, `saveCart(slug, items)`, `addItem`, `removeItem`, `setQuantity`, `cartSummary(items)` → `{ count, subtotalCents }` (informativos, precio = base + deltas × qty).
- `modules/orders/api/catalog.ts`: `getCatalog(deps, { slug })` → `{ status, body }` con `{ categories, products (con variantGroups), settings: { isOpen, isPaused, deliveryFeeCents, nextOpening } }`. Solo productos `is_available`. Producto agotado se omite de "Agregar" directo pero se muestra.
- `app/api/orders/catalog/route.ts` (pública), `modules/orders/public/catalog.tsx`, `app/(public)/[slug]/orders/page.tsx`.

**Seed (S2):** `shell/db/seed.ts` — insertar para Carri: categorías, ~8 productos con foto (assets `/public`), variantes (Tamaño/Extras), `orders_settings` con `hours` real (ej. lun–sáb 19:00–01:00, dom cerrado) + `transfer_alias/cbu/holder` + `delivery_fee_cents`.

**Tests:** `tests/orders-hours.test.ts` (cruza medianoche, domingo cerrado, día sin entrada), `tests/orders-cart.test.ts`, `tests/orders-catalog.test.ts`, `tests/ui/orders-catalog.test.tsx` (source-contract elderly-UX).

---

## Story 3 — Crear pedido (checkout) ✅ Completada (2026-08-21)

> Implementada con TDD (Red → Green). Tests: `tests/orders-create.test.ts` (12) + `tests/ui/orders-cart.test.tsx` (11). `CartVariant` ganó `optionId` para que el server revalide precios; `cart.tsx` usa `idempotencyKey` estable vía `crypto.randomUUID()` (una sola vez) y el fee de envío lo lee del catálogo. Confirmación navega a `/${slug}/orders/[id]` (S4).

**Interfaces (produce):**
- `modules/orders/api/orders.ts`:
  - `createOrder(deps, input)` donde `input` = `{ slug, idempotencyKey, name, phone, notes, fulfillment, deliveryAddress?, paymentMethod, items: [{ productId, quantity, variantOptionIds: string[], notes? }] }`.
  - Reglas server (revalida todo): negocio válido + módulo activo; `is_paused`/horario → `409` "Cerramos hace un rato…"; revalidar `is_available` y precios (base + deltas); cantidad cap 20; upsert customer `(phone,business_id)` con code 4 dígitos si nuevo (sin pisar nombre); `order_number` = `max+1` por negocio en transacción (`FOR UPDATE` sobre settings/fila de negocio); snapshot de items + variantes; `subtotal_cents`/`total_cents` server-side; `payment_status = initialPaymentStatus(method)`; idempotencia por `idempotency_key` (si existe → devolver el mismo).
  - `getOrder(deps, { id, clientId? })` — lectura para confirmación (match cookie `client_id` o UUID opaco).
- `modules/orders/public/cart.tsx` (wizard 3 pasos, `tumo_cart_<slug>`), `modules/orders/public/product-detail.tsx`, rutas `orders/cart` y `orders/producto/[id]`.
- `app/api/orders/route.ts` (POST).

**Tests:** `tests/orders-create.test.ts` (revalida agotado/cerrado, snapshot, idempotencia, order_number, centavos), `tests/ui/orders-cart.test.tsx`.

---

## Story 4 — Confirmación + comprobante (transfer) ✅ Completada (2026-08-21)

> Implementada con TDD (Red → Green). Tests: `tests/orders-confirmation.test.ts` (10) + `tests/ui/orders-confirmation.test.tsx` (7). `uploadReceipt` valida mime (jpeg/png/webp/heic) y ≤3MB, inserta `order_payments` (intento) y pasa a `pending_verification` (permite re-subida desde `rejected`). `changePaymentMethod` solo con `status=pending`. Compresión client-side a max 1600px → JPEG. MP ("Reintentar") queda deshabilitado hasta S7.

- `getOrder` público por UUID opaco/cookie; `uploadReceipt` (valida mime/tope, `payment_status → pending_verification`); `changePaymentMethod` (solo si `status=pending`).
- `order-confirmation.tsx` (Variantes A/B/C del spec §7.4) + ruta `/orders/[id]`; alias/CBU con Copiar por campo.
- Adapters `app/api/orders/[id]/route.ts`, `[id]/receipt/route.ts`.

---

## Story 5 — Panel empleado ✅ Completada (2026-08-21)

> Implementada con TDD (Red → Green). Tests: `tests/orders-panel.test.ts` (16) + `tests/ui/orders-panel.test.tsx` (11). `getOrder` ahora devuelve `payment` (último intento con comprobante en base64) para el detalle. `changePaymentMethod` se movió a `PATCH /api/orders/[id]/payment-method` (spec §1); `PATCH /api/orders/[id]` quedó para acciones de empleado (transition/verify/cancel). Icono `receipt` en `dashboard-layout`. El switch "Recibiendo pedidos" refleja `is_paused` (el toggle persiste en S6/pulido).

- `listOrders` (filtro `status` + chips Nuevos/En preparación/Listos/Entregados/Todos), `transitionStatus` (un solo CTA próximo estado), `verifyPayment` (aprobar pago y confirmar / rechazar), `cancelOrder`.
- `dashboard/panel.tsx` (poll 20s + focus, zona de atención comprobantes), `dashboard/order-detail.tsx`, ruta `/dashboard/orders` + `/dashboard/orders/[id]`; link "Sumar compra en Fidelización →" (`?highlight=`).
- Icono `receipt` en `shell/layouts/dashboard-layout.tsx` (`MODULE_ICONS`).

---

## Story 6 — Toggle disponibilidad + home ✅ Completada (2026-08-21)

> Implementada con TDD (Red → Green). Tests: `tests/orders-products.test.ts` (7) + `tests/orders-metrics.test.ts` (9) + `tests/ui/orders-availability.test.tsx` (3). `setPaused` vive en `api/metrics.ts` (endpoint simple `PATCH /api/orders/settings`). Se agregó `GET /api/orders/products` (list) + página `/dashboard/orders/productos` (no listadas en el plan pero requeridas por el spec §7.5/§7.7 para exponer `listProducts` y el toggle). El switch del panel ahora persiste `is_paused`.

- `api/products.ts`: `setAvailability` (PATCH) + `listProducts`; `dashboard/products-availability.tsx` (toggle 48px, "Disponible"/"Agotado", buscador).
- `api/metrics.ts`: pedidos hoy, ingresos hoy (solo `paid`), comprobantes para revisar, `getRecentActivity`, `setPaused`.
- `dashboard/widgets.tsx` (Pedidos hoy / Ingresos hoy / Comprobantes para revisar con highlight y link al panel) + `home-section.tsx` + `getRecentActivity`; manifiesto actualizado.

---

## Story 7 — MercadoPago ✅ Completada (2026-08-21)

> Implementada con TDD (Red → Green). Test: `modules/orders/api/mercadopago.test.ts` (8). `createPreference` dep-inyectado (payload: items, `external_reference`, `back_urls`, `notification_url`, `auto_return=approved`) + inserta `order_payments` (intento). `handleWebhook` valida `x-signature` (HMAC-SHA256 `ts.body`), GET a MP (nunca confía en el body), dedupe `mp_payment_id`, y actualiza `paid`+`confirmed` (approved) o `rejected`. Cliente MP real (fetch + `createHmac`) cableado en `default-deps`. Botón "Reintentar con MercadoPago" habilitado (redirect a `init_point`). Env vars `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` documentadas en `.env.example` (también arregla el test preexistente de supabase).

- `api/mercadopago.ts`: `createPreference` (POST `/api/orders/[id]/mp-preference`) + webhook (`POST /api/orders/mercadopago/webhook`, valida `x-signature`, GET a MP, dedupe `mp_payment_id`). `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` env vars (una sola cuenta MVP).

---

## Story 8 — Seed completo + pulido ✅ Completada (2026-08-22)

> Implementada con TDD (Red → Green). Test: `tests/seed-data.test.ts` (12 asserts). Se extrajo el seed a un módulo tipado puro `shell/db/seed-data.ts` (catálogo 20 productos + 14 grupos / 31 opciones de variantes + 6 clientes y 6 órdenes demo con ítems/variantes/pagos snapshot). `seed.ts` consume el módulo, siembra `customers` + órdenes demo (upsert idempotente por id determinista) y activa `mp_enabled=true` (antes estaba en `false`, dejando MercadoPago apagado pese a S7). Invariantes testeadas: ≥20 productos, precios en centavos enteros, refs válidas, totales demo consistentes (`total = subtotal + fee`, `subtotal = Σ unit×qty`), cantidades 1–20 y estados dentro del dominio. Verificado: `bun test` 425 pass, `bun run build` ✓, seed idempotente sobre `supabase db reset`.

---

## Spec coverage self-check

| Sección spec | Story |
|---|---|
| §1 modelo + migración | S1 |
| §2 flujo catálogo → wizard → confirmación | S2, S3, S4 |
| §3 estados + labels | S5 (+ types S1) |
| §4 MercadoPago | S7 |
| §5 loyalty (reuse customers + link) | S3, S5 |
| §6 edge cases (agotado, doble-tap, cerrado, comprobante) | S3, S4 |
| §7 pantallas + elderly-UX | S2–S6 |
| §8 decisiones abiertas | documentadas en spec; defaults MVP respetados |
