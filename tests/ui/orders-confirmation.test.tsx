import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const src = readFileSync(
  join(root, "modules/orders/public/order-confirmation.tsx"),
  "utf8"
)

describe("OrderConfirmation (source contracts)", () => {
  test("Variante A: pedido OK con código de fidelización y volver", () => {
    expect(src).toMatch(/¡Pedido recibido!/)
    expect(src).toContain("Hacer otro pedido")
    expect(src).toMatch(/código|Código/)
  })

  test("Variante B: transfer con alias/CBU y copiar por campo", () => {
    expect(src).toMatch(/Alias/i)
    expect(src).toMatch(/CBU/i)
    expect(src).toMatch(/Copiar/)
    expect(src).toMatch(/Enviar comprobante/)
  })

  test("Variante B: compresión de imagen a max 1600px", () => {
    expect(src).toContain("1600")
    expect(src).toMatch(/image\/jpeg|image\/png|image\/webp|image\/heic/)
  })

  test("sin MercadoPago: no reintento ni espera MP", () => {
    expect(src).not.toContain("MercadoPago")
    expect(src).not.toContain("mercadopago")
    expect(src).not.toContain("mp-preference")
    expect(src).not.toContain("mpTimeoutHint")
    expect(src).not.toContain("retryMp")
  })

  test("cambio de método solo transfer ↔ efectivo", () => {
    expect(src).toMatch(/Pagar por transferencia|transferencia/i)
    expect(src).toMatch(/Efectivo|al retirar/i)
  })

  test("estado revisando comprobante", () => {
    expect(src).toMatch(/revisando tu comprobante/)
  })

  test("elderly-UX: botones ≥56px y precio con formatCents", () => {
    expect(src).toMatch(/min-h-\[56px\]/)
    expect(src).toContain("formatCents")
  })

  test("llama a las APIs de receipt y cambio de método", () => {
    expect(src).toContain("/receipt")
    expect(src).toContain("paymentMethod")
  })

  test("polling de respaldo mientras espera verificación de transferencia", () => {
    expect(src).toMatch(/setInterval/)
    expect(src).toContain("shouldTrackPayment")
  })

  test("pago confirmado → banner verde ✓", () => {
    expect(src).toMatch(/Pago confirmado/)
  })

  test("previene doble envío (useRef + disabled cruzado)", () => {
    expect(src).toContain("useRef")
    expect(src).toMatch(/busyRef\.current/)
    expect(src).toContain("uploading || changing")
  })

  test("estado de carga con texto claro", () => {
    expect(src).toContain("Cargando tu pedido")
  })
})
