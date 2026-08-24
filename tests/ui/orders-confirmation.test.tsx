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
    expect(src).toContain("Volver al menú")
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

  test("Variante C: reintentar MP / cambiar método", () => {
    expect(src).toMatch(/Reintentar/)
    expect(src).toMatch(/Pagar por transferencia/)
    expect(src).toMatch(/Pagás al retirar/)
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

  test("MP pending: spinner de espera con texto y tiempo estimado", () => {
    expect(src).toMatch(/animate-spin/)
    expect(src).toMatch(/Estamos esperando la confirmación de tu pago en MercadoPago/)
    expect(src).toMatch(/unos segundos/)
  })

  test("MP: polling de respaldo cada 10s mientras espera", () => {
    expect(src).toMatch(/setInterval/)
    expect(src).toContain("shouldTrackPayment")
  })

  test("pago confirmado → banner verde ✓", () => {
    expect(src).toMatch(/Pago confirmado/)
  })

  test("MP: timeout amigable con Revisar estado", () => {
    expect(src).toContain("mpTimeoutHint")
    expect(src).toContain("Revisar estado")
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
