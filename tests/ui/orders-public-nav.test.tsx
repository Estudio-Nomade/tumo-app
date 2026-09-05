import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const nav = readFileSync(
  join(root, "modules/orders/public/orders-public-nav.tsx"),
  "utf8"
)

describe("OrdersPublicNav (source contracts)", () => {
  test("tabs Menú y Carrito con hrefs del slug", () => {
    expect(nav).toContain("Menú")
    expect(nav).toContain("Carrito")
    expect(nav).toMatch(/\/\$\{slug\}\/orders/)
    expect(nav).toMatch(/\/\$\{slug\}\/orders\/cart/)
  })

  test("badge de count vía cartSummary/loadCart; oculto si 0", () => {
    expect(nav).toContain("cartSummary")
    expect(nav).toContain("loadCart")
    expect(nav).toMatch(/(?:badge|count)\s*>\s*0/)
  })

  test("touch targets ≥48px y fixed bottom safe-area", () => {
    expect(nav).toMatch(/min-h-\[(?:48|56)px\]/)
    expect(nav).toContain("fixed")
    expect(nav).toContain("bottom")
    expect(nav).toMatch(/safe-area-inset-bottom/)
  })
})
