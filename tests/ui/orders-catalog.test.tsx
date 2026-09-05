import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const src = readFileSync(
  join(root, "modules/orders/public/catalog.tsx"),
  "utf8"
)

describe("Catalog (elderly-UX source contracts)", () => {
  test("una columna (sin grilla de 2)", () => {
    expect(src).not.toMatch(/grid-cols-2/)
  })

  test("botón primario de 56px para Agregar", () => {
    expect(src).toMatch(/min-h-\[56px\]|h-\[56px\]|h-14/)
  })

  test("header muestra logo del negocio o placeholder con inicial", () => {
    expect(src).toContain("business.logo")
    expect(src).toMatch(/<img|business\.logo/)
    expect(src).toMatch(/object-cover|rounded-full/)
  })

  test("bottom nav Menú y Carrito siempre visible (sin barra Ver mi pedido)", () => {
    expect(src).toContain("OrdersPublicNav")
    expect(src).not.toMatch(/Ver mi pedido/)
  })

  test("carrito persiste vía loadCart/saveCart (clave tumo_cart_<slug>)", () => {
    expect(src).toContain("loadCart")
    expect(src).toContain("saveCart")
    expect(src).toContain("addItem")
  })

  test("toast de confirmación Agregado", () => {
    expect(src).toMatch(/Agregado/)
  })

  test("estados cerrado / pausado con banner", () => {
    expect(src).toMatch(/Cerrado|Abrimos/)
    expect(src).toMatch(/Pausamos|pausad/i)
  })

  test("producto agotado deshabilitado", () => {
    expect(src).toMatch(/Agotado/)
    expect(src).toMatch(/disabled/)
  })

  test("lenguaje llano y precios con formatCents", () => {
    expect(src).toContain("formatCents")
  })

  test("navega a detalle cuando hay variantes", () => {
    expect(src).toContain("producto/")
  })

  test("entry al detalle por cover/nombre (no solo por variantes en Agregar)", () => {
    expect(src).toMatch(/href=\{`\/\$\{slug\}\/orders\/producto\/\$\{p\.id\}`\}/)
    const addOnlyPush =
      /variantGroups\.length\s*>\s*0[\s\S]*?router\.push\(`\/\$\{slug\}\/orders\/producto/
    expect(src).toMatch(addOnlyPush)
  })

  test("badge N fotos solo si count > 1", () => {
    expect(src).toContain("photoCount")
    expect(src).toMatch(/count\s*>\s*1/)
    expect(src).toMatch(/\{count\} fotos/)
  })

  test("Agregar es hermano del Link (sin nested interactive)", () => {
    const linkClose = src.indexOf("</Link>")
    const addBtn = src.indexOf("handleAdd(p)")
    expect(linkClose).toBeGreaterThan(-1)
    expect(addBtn).toBeGreaterThan(linkClose)
  })

  test("catálogo no embebe carrusel en cards", () => {
    expect(src).not.toContain("ProductPhotoCarousel")
    expect(src).not.toMatch(/snap-x/)
  })

  test("handleAdd / Agregar sigue existiendo", () => {
    expect(src).toContain("handleAdd")
    expect(src).toMatch(/Agregar/)
  })

  test("banner de pedido pendiente con link a la confirmación", () => {
    expect(src).toContain("pendingOrder")
    expect(src).toContain("pendingOrderBanner")
    expect(src).toMatch(/orders\//)
  })
})
