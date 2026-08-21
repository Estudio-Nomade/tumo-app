import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const cart = readFileSync(
  join(root, "modules/orders/public/cart.tsx"),
  "utf8"
)
const detail = readFileSync(
  join(root, "modules/orders/public/product-detail.tsx"),
  "utf8"
)

describe("CartWizard (elderly-UX source contracts)", () => {
  test("wizard de 3 pasos con indicador textual", () => {
    expect(cart).toContain("Paso")
    expect(cart).toContain("de 3")
    expect(cart).toContain("Tu pedido")
    expect(cart).toContain("¿Cómo lo recibís?")
    expect(cart).toContain("Pago y tus datos")
  })

  test("tres métodos de pago con explicación", () => {
    expect(cart).toContain("Transferencia")
    expect(cart).toContain("MercadoPago")
    expect(cart).toContain("Pagás al retirar")
  })

  test("confirma con idempotencyKey estable", () => {
    expect(cart).toContain("crypto.randomUUID()")
    expect(cart).toContain("idempotencyKey")
    expect(cart).toContain('method: "POST"')
    expect(cart).toContain("/api/orders")
  })

  test("quitar con Deshacer", () => {
    expect(cart).toContain("Quitar")
    expect(cart).toContain("Deshacer")
  })

  test("valida dirección, nombre y WhatsApp", () => {
    expect(cart).toContain("Escribí la dirección")
    expect(cart).toContain("Escribí tu nombre")
    expect(cart).toContain("Escribí un WhatsApp válido")
  })

  test("botones ≥56px y campos ≥52px", () => {
    expect(cart).toMatch(/min-h-\[56px\]/)
    expect(cart).toMatch(/min-h-\[52px\]/)
  })
})

describe("ProductDetail (elderly-UX source contracts)", () => {
  test("variantes single y multiple", () => {
    expect(detail).toContain("selectionType")
    expect(detail).toContain("Elegí una")
    expect(detail).toContain("Podés elegir varias")
  })

  test("stepper de cantidad con tope", () => {
    expect(detail).toContain("Cantidad")
    expect(detail).toContain("Math.max(1")
    expect(detail).toContain("Math.min(20")
  })

  test("precio live con formatCents", () => {
    expect(detail).toContain("formatCents")
    expect(detail).toContain("Agregar · $")
  })

  test("agotado deshabilitado y required validado", () => {
    expect(detail).toContain("Agotado hoy")
    expect(detail).toContain("disabled")
    expect(detail).toContain("missingRequired")
  })
})
