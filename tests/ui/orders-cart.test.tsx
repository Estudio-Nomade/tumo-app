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

  test("dos métodos de pago: Transferencia y Efectivo", () => {
    expect(cart).toContain("Transferencia")
    expect(cart).toContain("Efectivo")
    expect(cart).toContain("at_pickup")
    expect(cart).not.toContain("MercadoPago")
    expect(cart).not.toContain("mercadopago")
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

  test("dirección de envío usa autocomplete Photon vía proxy", () => {
    expect(cart).toContain("AddressAutocomplete")
    const autocomplete = readFileSync(
      join(root, "modules/orders/public/address-autocomplete.tsx"),
      "utf8"
    )
    expect(autocomplete).toContain("/api/orders/geocode")
    expect(autocomplete).toContain('role="listbox"')
    expect(autocomplete).not.toContain("photon.komoot.io")
  })

  test("botones ≥56px y campos ≥52px", () => {
    expect(cart).toMatch(/min-h-\[56px\]/)
    expect(cart).toMatch(/min-h-\[52px\]/)
  })

  test("Volver al menú o al paso anterior", () => {
    expect(cart).toMatch(/Menú|Atrás/)
    expect(cart).toContain("clearCart")
    expect(cart).toContain("loadLastGuest")
  })

  test("header del wizard con barra (no back pelado)", () => {
    expect(cart).toMatch(/sticky top-0/)
    expect(cart).toMatch(/border-b/)
    expect(cart).toMatch(/bg-\[var\(--color-surface-public/)
    expect(cart).toContain("Menú")
    expect(cart).toContain("Atrás")
    // Back CTA is a real chip/button, not naked text
    expect(cart).toMatch(/bg-\[#F5F5F4\]/)
    expect(cart).toMatch(/border border-\[#E7E5E4\]/)
    expect(cart).toMatch(/rounded-2xl/)
    expect(cart).toContain("min-h-[48px]")
  })

  test("bottom nav Menú|Carrito montada", () => {
    expect(cart).toContain("OrdersPublicNav")
  })

  test("empty cart con CTA claro al menú", () => {
    expect(cart).toMatch(/Todavía no agregaste|pedido está vacío|Volvé al menú|Ver el menú/)
  })

  test("empty cart no muestra Continuar fijo", () => {
    expect(cart).toMatch(/step === 1 && cart\.length === 0/)
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

  test("con variantes y qty>1: pregunta config de cada unidad (N de M)", () => {
    expect(detail).toMatch(/de \$\{|de \{|unitIndex|unidad/i)
    expect(detail).toMatch(/\d de |de \$\{quantity\}|de \{quantity\}/i)
    expect(detail).toMatch(/Siguiente/)
    expect(detail).toMatch(/cartItemKey\([^)]*note/i)
    expect(detail).toMatch(/variantGroups\.length/)
  })

  test("precio live con formatCents", () => {
    expect(detail).toContain("formatCents")
    expect(detail).toMatch(/Agregar · \$|Siguiente · \$/)
  })

  test("agotado deshabilitado y required validado", () => {
    expect(detail).toContain("Agotado hoy")
    expect(detail).toContain("disabled")
    expect(detail).toContain("missingRequired")
  })

  test("bottom nav Menú|Carrito montada", () => {
    expect(detail).toContain("OrdersPublicNav")
  })
})
