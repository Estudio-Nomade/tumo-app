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
})
