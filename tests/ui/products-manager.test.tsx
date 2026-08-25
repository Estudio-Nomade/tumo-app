import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const src = readFileSync(
  join(root, "modules/orders/dashboard/products-manager.tsx"),
  "utf8"
)

describe("ProductsManager (source contracts)", () => {
  test("lista y alta de productos", () => {
    expect(src).toContain("Nuevo producto")
    expect(src).toContain("/api/orders/products")
    expect(src).toContain("POST")
  })

  test("editar y eliminar con confirmación", () => {
    expect(src).toContain("Guardar")
    expect(src).toMatch(/Eliminar/)
    expect(src).toMatch(/Dialog/)
    expect(src).toMatch(/¿Eliminar/)
  })

  test("variantes: grupos y opciones con precio extra", () => {
    expect(src).toMatch(/variante|Variante/)
    expect(src).toContain("priceDeltaCents")
  })

  test("elderly-UX: CTA ≥56px y toggle disponibilidad", () => {
    expect(src).toMatch(/min-h-\[56px\]/)
    expect(src).toContain("Disponible")
    expect(src).toContain("Agotado")
  })
})
