---
title: 'Orders: Photon dirección envío + quitar MercadoPago'
type: 'feature'
created: '2026-09-05'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: '50bb69f8073ad08eee8cbe868d0c110f0589a636'
context:
  - '{project-root}/docs/handoffs/PROMPT-feat-orders-photon-delivery-remove-mp.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En envío el cliente escribe la dirección a mano sin sugerencias; MercadoPago sigue en wizard/API/webhook aunque el producto solo quiere Transferencia y Efectivo.

**Approach:** (1) Autocomplete Photon server-side en paso 2 “Me lo envían”, con fallback texto libre. (2) Eliminar MercadoPago de verdad (código, rutas, tests, CHECK); UI solo Transferencia + Efectivo (`at_pickup`). Dos commits en ese orden.

## Boundaries & Constraints

**Always:**
- BMAD + TDD (RED → GREEN). Bun PATH. Stage paths explícitos (no `git add -A`).
- Photon: `lang=default` (nunca `es`); User-Agent `TumoOrders/1.0`; bias Villa Dolores lat `-31.9456` lon `-65.1896`; `limit=5`; browser solo llama `/api/orders/geocode`.
- `delivery_address` sigue TEXT legible; no exigir lat/lon en DB v1.
- Continuar con texto libre si no elige sugerencia / Photon cae.
- `PaymentMethod = "transfer" | "at_pickup"`; UI Efectivo = código `at_pickup`.
- createOrder / changePaymentMethod rechazan `mercadopago` con 400.
- Migration: backfill filas MP → transfer; recrear CHECK sin mercadopago; columnas `mp_*` pueden quedar huérfanas.
- Commits: (1) Photon (2) quitar MP. No push/PR hasta OK localhost.

**Ask First:**
- Si GPS reverse se complica → omitir GPS (solo autocomplete).
- Si dropear columnas `mp_*` complica migration → dejarlas muertas.

**Never:**
- Reintroducir MP detrás de flag; llamar Photon desde client; Google/Mapbox; zonas de envío; cambiar fee; tocar Turnos/Loyalty/landing; editar Tubi; mezclar handoff logo/carrito; secrets en commit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Suggest OK | GET geocode `q`≥3 + slug | `{ results: [{ label, lat, lon }] }` bias VD | N/A |
| q corta | `q` &lt; 3 chars | `{ results: [] }` sin llamar Photon | N/A |
| Photon down | fetch falla / non-OK | `{ results: [] }` + log server | UI: texto libre OK |
| Elegir suggest | click listbox option | input = `label`; lista cierra | N/A |
| Texto libre | address manual, Continuar | POST create con ese string | trim vacío → “Escribí la dirección.” |
| Pay UI | paso 3 | solo Transferencia + Efectivo | sin texto MercadoPago |
| MP create | `paymentMethod: mercadopago` | 400 | mensaje claro |
| MP routes | `/mp-preference`, webhook | 404 (rutas borradas) | N/A |
| Migration | filas `mercadopago` | → `transfer`; CHECK sin MP | documentar regla |

</frozen-after-approval>

## Code Map

### Photon (commit 1)
- `modules/orders/lib/photon.ts` — buildUrl (`lang=default`, bias, limit), parseFeatures → label (street+housenumber, city)
- `modules/orders/api/geocode.ts` — `getSuggestions(deps, { q, bias })`; q&lt;3 → []
- `app/api/orders/geocode/route.ts` — GET `q`+`slug`; public; thin route
- `modules/orders/public/address-autocomplete.tsx` — combobox (input + `ul[role=listbox]`), debounce 300–400ms, min 3, fetch proxy
- `modules/orders/public/cart.tsx` — paso 2 delivery: usar autocomplete; overflow-visible / lista no clippeada por footer fixed
- `modules/orders/lib/geo-bias.ts` o const en photon — `ORDERS_GEO_BIAS` Villa Dolores
- Tests: `tests/orders-photon.test.ts`, `tests/orders-geocode.test.ts`, update `tests/ui/orders-cart.test.tsx` (geocode/listbox)

### Remove MP (commit 2)
- DELETE: `modules/orders/api/mercadopago.ts`, `mercadopago.test.ts`, `lib/mp-timeout.ts`, `tests/orders-mp-timeout.test.ts`
- DELETE dirs: `app/api/orders/[id]/mp-preference/`, `app/api/orders/mercadopago/`
- `modules/orders/lib/types.ts` — PaymentMethod, PAYMENT_METHODS, initialPaymentStatus
- `modules/orders/lib/default-deps.ts` — sin MP_API / mercadopagoDeps
- `modules/orders/api/orders.ts` — reject mercadopago; sin mpEnabled público si aplica
- `modules/orders/api/catalog.ts` — sin branch MP+pending
- `pending-order.ts`, `realtime.ts` — sin ramas MP
- `cart.tsx`, `order-confirmation.tsx` — 2 radios; sin mpWaiting/retry/preference
- `panel.tsx`, `order-detail.tsx` — sin “Pago en proceso” MP
- `shell/db/seed-data.ts`, `shell/db/seed.ts` — demo sin MP; mp_enabled false/omit
- `shell/db/migrations/011_orders_drop_mercadopago.sql` + mirror supabase timestamped
- Tests: types, pending-order, realtime, ui cart/confirmation, seed-data, orders-migration

## Tasks & Acceptance

**Execution (TDD por story):**

### Story 1 — Photon
- [ ] `modules/orders/lib/photon.ts` + test — parse fixture; URL `lang=default` + bias
- [ ] `modules/orders/api/geocode.ts` + test — q corta []; mock fetch OK/fail
- [ ] `app/api/orders/geocode/route.ts` — GET público
- [ ] `address-autocomplete.tsx` + wire `cart.tsx` paso 2 — listbox ≥48px; free-text fallback
- [ ] `tests/ui/orders-cart.test.tsx` — contract geocode/listbox

### Story 2 — Quitar MP
- [ ] RED tests: types/cart/confirmation sin mercadopago; createOrder 400
- [ ] types + orders API + catalog + pending + realtime + default-deps
- [ ] UI cart/confirmation/panel/detail
- [ ] borrar archivos/rutas MP
- [ ] migration 011 + seed + tests migration/seed
- [ ] verify paths inexistentes + bun test lista handoff

**Acceptance Criteria:**
- Given delivery en paso 2, when tipeo ≥3 chars, then sugerencias vía `/api/orders/geocode` (no komoot directo)
- Given elijo sugerencia, when Continuar+crear, then `delivery_address` = label
- Given Photon vacío/error, when escribo a mano, then puedo confirmar
- Given paso 3, when veo pagos, then solo Transferencia y Efectivo; sin “MercadoPago”
- Given POST con mercadopago, when createOrder, then 400
- Given migration, when apply, then no CHECK mercadopago; filas previas transfer
- Given transfer/efectivo flows, when pago+comprobante/cobrado, then intactos

## Design Notes

**Photon label:** prefer `street housenumber, city/town/village` from feature properties; fallback `name` o geocoding name.

**URL Photon:** `https://photon.komoot.io/api/?q=...&lat=...&lon=...&limit=5&lang=default` + header User-Agent. Si bbox se usa y vacía → retry sin bbox.

**Copy pago (elderly):**
- Transferencia — “Pasás la plata y subís la foto del comprobante”
- Efectivo — “Pagás en efectivo al retirar o cuando te lo llevan”

**GPS:** omitir en v1 salvo que reverse quede trivial tras autocomplete.

**Migration regla:** `UPDATE orders SET payment_method='transfer' WHERE payment_method='mercadopago'`; same para `order_payments.method`. Preferir dejar cols `mp_*` huérfanas.

## Verification

**Commands:**
```bash
export PATH="$HOME/.bun/bin:$PATH"
bun test tests/orders-photon.test.ts tests/orders-geocode.test.ts \
  tests/orders-cart.test.ts tests/orders-create.test.ts tests/orders-types.test.ts \
  tests/orders-pending-order.test.ts tests/orders-realtime.test.ts \
  tests/orders-confirmation.test.ts tests/seed-data.test.ts tests/orders-migration.test.ts \
  tests/ui/orders-cart.test.tsx tests/ui/orders-confirmation.test.tsx
test ! -f modules/orders/api/mercadopago.ts
test ! -f modules/orders/lib/mp-timeout.ts
test ! -d app/api/orders/mercadopago
test ! -d 'app/api/orders/[id]/mp-preference'
bunx eslint modules/orders/public/cart.tsx modules/orders/public/order-confirmation.tsx \
  modules/orders/lib/types.ts modules/orders/api/orders.ts modules/orders/api/catalog.ts \
  modules/orders/lib/pending-order.ts modules/orders/lib/realtime.ts \
  modules/orders/lib/default-deps.ts modules/orders/dashboard/panel.tsx \
  modules/orders/dashboard/order-detail.tsx
```

**Manual:** `/carri/orders` → item → carrito → Me lo envían → “San Martin” → suggest → Efectivo o Transferencia. Sin MP. Empleado ve dirección.
