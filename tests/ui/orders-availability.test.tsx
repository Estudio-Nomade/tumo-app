import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const avail = readFileSync(
  join(root, "modules/orders/dashboard/products-availability.tsx"),
  "utf8"
)
const widgets = readFileSync(
  join(root, "modules/orders/dashboard/widgets.tsx"),
  "utf8"
)

describe("ProductsAvailability (source contracts)", () => {
  test("lenguaje claro Disponible / Agotado", () => {
    expect(avail).toContain("Disponible")
    expect(avail).toContain("Agotado")
  })

  test("toggle ≥48px", () => {
    expect(avail).toMatch(/min-h-\[48px\]|min-w-\[48px\]|h-\[48px\]|w-\[48px\]/)
  })

  test("buscador", () => {
    expect(avail).toMatch(/Buscar|buscar/)
  })

  test("llama al endpoint de disponibilidad", () => {
    expect(avail).toContain("availability")
    expect(avail).toContain("PATCH")
  })
})

describe("OrdersWidgets (source contracts)", () => {
  test("tres widgets del home", () => {
    expect(widgets).toContain("Pedidos hoy")
    expect(widgets).toContain("Ingresos hoy")
    expect(widgets).toContain("Comprobantes para revisar")
  })

  test("link al panel filtrado", () => {
    expect(widgets).toContain("dashboard/orders")
  })

  test("formatea ingresos con formatCents", () => {
    expect(widgets).toContain("formatCents")
  })
})
