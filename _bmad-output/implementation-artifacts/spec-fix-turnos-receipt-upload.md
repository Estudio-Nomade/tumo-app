---
title: 'fix(turnos): comprobante sin reventar por base64/spread'
type: 'bugfix'
created: '2026-09-07'
status: 'done'
baseline_commit: 'fb1b85f9fb3c3a2194f7145e57234c0c29b558eb'
review_loop_iteration: 0
context:
  - '{project-root}/docs/handoffs/PROMPT-fix-turnos-receipt-upload.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Al confirmar una reserva por transferencia con foto real de comprobante, el wizard tira RangeError por `btoa(String.fromCharCode(...buf))` y el catch genérico miente con “Revisá tu conexión”. Además el POST `/receipt` no chequea `res.ok`.

**Approach:** Copiar el patrón de orders (FileReader + compress imagen + Buffer.from en API) dentro de turnos, sin imports cross-module; validar mime/size en domain; errores útiles sin fingir éxito.

## Boundaries & Constraints

**Always:**
- TDD: test fallando antes de código de producción
- Demo solo en slug `tumo-lab` (no activar turnos en carri)
- Comprobante sigue en BYTEA (`turnos_payments.receipt_bytes`); sin Storage nuevo
- Helper de imagen en `modules/turnos/lib/` (copiar, no importar orders)
- Tras POST receipt fallido: mostrar error útil y no redirigir como éxito
- v1 solo imagen JPG/PNG/WebP (como orders); sacar PDF del accept/label

**Ask First:**
- Si hace falta reintento de comprobante post-create (fuera del mínimo aceptable)
- Si el pencil/UI exige mantener PDF

**Never:**
- MercadoPago, Storage bucket, rewrite del wizard completo
- Imports `modules/turnos` ↔ `modules/orders`
- Solo maquillar el texto del catch sin arreglar el encode
- `git add -A`, push/PR sin OK localhost

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path foto | JPG/PNG >200KB transfer + receipt | Booking + payment `pending_verification`; redirect confirmación | N/A |
| Encode seguro | Buffer grande del receipt | Base64 sin spread de N args; sin RangeError | Encode error → “No pudimos leer el comprobante…” |
| Receipt POST falla | API 400/500 | No redirect; `setError(json.error ?? …)` | No “conexión” genérico |
| Mime inválido | domain mime no allowlist | 400 “Subí una foto del comprobante (JPG o PNG).” | Server reject |
| Bytes vacíos / >3MB | domain | 400 “Subí el comprobante.” / “La foto es muy pesada.” | Server reject |
| Base64 inválido | route atob/Buffer fail | 400 “Imagen inválida.” | No 500 |
| Source contract | booking-wizard source | No `String.fromCharCode(...` sobre buffer del receipt | Test de fuente |

</frozen-after-approval>

## Code Map

- `modules/turnos/public/booking-wizard.tsx` -- createAndMaybePay: btoa spread bug, catch genérico, accept PDF
- `app/api/turnos/bookings/[id]/receipt/route.ts` -- atob frágil → Buffer.from
- `modules/turnos/api/payments.ts` -- submitTransferReceipt sin mime/size caps
- `modules/turnos/lib/receipt-image.ts` -- NUEVO: encode/compress puro (espejo orders)
- `modules/orders/public/order-confirmation.tsx` -- REFERENCIA compress + FileReader
- `app/api/orders/[id]/receipt/route.ts` -- REFERENCIA Buffer.from
- `modules/orders/api/orders.ts` -- REFERENCIA ALLOWED_RECEIPT_MIMES + MAX 3MB
- `tests/turnos-payments.test.ts` -- extender domain
- `tests/turnos-receipt-image.test.ts` -- NUEVO helper + source contract

## Tasks & Acceptance

**Execution:**
- [x] `tests/turnos-receipt-image.test.ts` -- RED: encode sin spread; source contract wizard sin `String.fromCharCode(...`; compress contract (mime jpeg out) si helper lo expone
- [x] `tests/turnos-payments.test.ts` -- RED: mime inválido 400; bytes > MAX 400; bytes vacíos ya existe
- [x] `modules/turnos/lib/receipt-image.ts` -- GREEN: readDataURL + compress max 1600 jpeg 0.7; bytesToBase64 chunked si hace falta server-side puro
- [x] `modules/turnos/api/payments.ts` -- GREEN: ALLOWED mimes JPG/PNG/WebP (+heic opcional como orders); MAX 3MB
- [x] `app/api/turnos/bookings/[id]/receipt/route.ts` -- GREEN: Buffer.from(base64) try/catch → 400 “Imagen inválida.”
- [x] `modules/turnos/public/booking-wizard.tsx` -- GREEN: usar helper compress; chequear res.ok receipt; catch encode vs red; accept solo image/*; label “foto JPG o PNG”

**Acceptance Criteria:**
- Given foto real >500KB y transfer, when confirmar, then POST bookings + POST receipt OK y confirmación sin “Revisá tu conexión”
- Given receipt API error, when confirmar, then error útil y sin redirect éxito
- Given source wizard, when grep, then no spread `String.fromCharCode(...` del buffer
- Given mime/size inválidos en domain, when submitTransferReceipt, then 400

## Spec Change Log

## Design Notes

Orders pattern (copiar, no importar):

```ts
// client: FileReader → canvas max 1600 → jpeg 0.7 → { mime, data }
// route: Buffer.from(data, "base64") catch → 400
// domain: mime allowlist + max 3MB → BYTEA
```

KISS PDF: fuera del accept (UI decía “foto o PDF”; domain no tenía validación). Alinear a orders = solo imagen.

## Verification

**Commands:**
- `bun test tests/turnos-payments.test.ts tests/turnos-receipt-image.test.ts tests/turnos-bookings.test.ts` -- all green
- `bunx eslint modules/turnos/public/booking-wizard.tsx modules/turnos/api/payments.ts modules/turnos/lib/receipt-image.ts app/api/turnos/bookings/[id]/receipt/route.ts` -- clean

**Manual checks:**
- `http://localhost:3000/tumo-lab/turnos/reservar` → transfer + foto pesada → confirmación pending_verification
- Network: bookings 2xx + receipt 200; no RangeError en console

## Suggested Review Order

**Cliente: encode + flujo**

- compress antes de create; reusa bookingId/idempotency en retry
  [`booking-wizard.tsx:115`](../../modules/turnos/public/booking-wizard.tsx#L115)

- busyRef + link “Ver reserva creada” si receipt falla post-create
  [`booking-wizard.tsx:71`](../../modules/turnos/public/booking-wizard.tsx#L71)

**Helper imagen (patrón orders, sin import cross-module)**

- allowlist + heif + decode estricto + compress 1600 jpeg 0.7
  [`receipt-image.ts:1`](../../modules/turnos/lib/receipt-image.ts#L1)

**API + domain**

- route: decodeReceiptBase64 → 400 “Imagen inválida.”
  [`route.ts:26`](../../app/api/turnos/bookings/[id]/receipt/route.ts#L26)

- domain: mime allowlist + max 3MB
  [`payments.ts:30`](../../modules/turnos/api/payments.ts#L30)

**Tests**

- encode grande, decode basura, source contracts wizard/route
  [`turnos-receipt-image.test.ts:1`](../../tests/turnos-receipt-image.test.ts#L1)

- mime inválido / bytes > tope
  [`turnos-payments.test.ts:70`](../../tests/turnos-payments.test.ts#L70)
