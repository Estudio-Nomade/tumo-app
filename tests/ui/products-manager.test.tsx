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

  test("multi-foto: upload real a /photos, multiple, no solo URL", () => {
    expect(src).toMatch(/\/photos/)
    expect(src).toMatch(/product-photos|Fotos/)
    expect(src).toMatch(/type=["']file["']/)
    expect(src).toMatch(/multiple/)
    expect(src).toMatch(/image\/jpeg/)
    expect(src).toMatch(/Podés subir hasta 8/)
    expect(src).not.toMatch(/Foto \(URL, opcional\)/)
  })

  test("editor Nuevo/Editar: Sheet bottom full-height, no Dialog angosto", () => {
    expect(src).toMatch(/from ["']@\/components\/ui\/sheet["']/)
    expect(src).toMatch(/Sheet open=\{formOpen\}/)
    expect(src).toMatch(/SheetContent/)
    expect(src).toMatch(/side=["']bottom["']/)
    expect(src).toMatch(/data-\[side=bottom\]:h-\[100dvh\]/)
    expect(src).toMatch(/max-w-none/)
    expect(src).not.toMatch(/Dialog open=\{formOpen\}/)
  })

  test("editor: body scrolleable + footer fijo con Guardar y safe-area", () => {
    expect(src).toMatch(/overflow-y-auto/)
    expect(src).toMatch(/overscroll-contain/)
    expect(src).toMatch(/flex-1/)
    expect(src).toMatch(/safe-area-inset-bottom/)
    expect(src).toMatch(/safe-area-inset-top/)
    expect(src).toMatch(/min-h-\[56px\][\s\S]{0,200}Guardar|Guardar[\s\S]{0,80}min-h-\[56px\]/)
    expect(src).toMatch(/shrink-0/)
    // formError visible junto al CTA sticky
    expect(src).toMatch(
      /safe-area-inset-bottom[\s\S]{0,400}formError[\s\S]{0,400}Guardar/
    )
  })
})
