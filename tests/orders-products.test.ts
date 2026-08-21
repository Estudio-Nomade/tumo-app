import { describe, expect, mock, test } from "bun:test"
import {
  listProducts,
  setAvailability,
  type ProductsDeps,
} from "@/modules/orders/api/products"

function makeSql(overrides: {
  products?: unknown[]
  updated?: unknown[]
} = {}) {
  const calls: { q: string; values: unknown[] }[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("UPDATE products")) {
      return Promise.resolve(overrides.updated ?? [{ id: "p1", is_available: false }])
    }
    if (q.includes("FROM products")) {
      return Promise.resolve(
        overrides.products ?? [
          {
            id: "p1",
            name: "Hamburguesa Clásica",
            category_id: "c1",
            category_name: "Hamburguesas",
            price_cents: 4500,
            is_available: true,
            sort_order: 0,
          },
        ]
      )
    }
    return Promise.resolve([])
  })
  return { sql, calls }
}

function makeDeps(overrides: Partial<ProductsDeps> = {}): ProductsDeps {
  return {
    sql: makeSql().sql as unknown as ProductsDeps["sql"],
    ...overrides,
  }
}

describe("listProducts", () => {
  test("businessId vacío → 400", async () => {
    const r = await listProducts(makeDeps(), { businessId: "" })
    expect(r.status).toBe(400)
  })

  test("mapea productos con categoría y disponibilidad", async () => {
    const { sql } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })

    const r = await listProducts(deps, { businessId: "biz-1" })

    expect(r.status).toBe(200)
    const products = (r.body as { products: unknown[] }).products
    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      id: "p1",
      name: "Hamburguesa Clásica",
      categoryName: "Hamburguesas",
      priceCents: 4500,
      isAvailable: true,
    })
  })
})

describe("setAvailability", () => {
  test("productId vacío → 400", async () => {
    const r = await setAvailability(makeDeps(), { productId: "", isAvailable: false })
    expect(r.status).toBe(400)
  })

  test("marca agotado", async () => {
    const { sql, calls } = makeSql({ updated: [{ id: "p1", is_available: false }] })
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })

    const r = await setAvailability(deps, { productId: "p1", isAvailable: false })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ id: "p1", isAvailable: false })
    const update = calls.find((c) => c.q.includes("UPDATE products"))
    expect(update!.values).toContain(false)
  })

  test("marca disponible de nuevo", async () => {
    const { sql } = makeSql({ updated: [{ id: "p1", is_available: true }] })
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await setAvailability(deps, { productId: "p1", isAvailable: true })
    expect(r.body).toMatchObject({ isAvailable: true })
  })

  test("inexistente → 404", async () => {
    const { sql } = makeSql({ updated: [] })
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await setAvailability(deps, { productId: "nope", isAvailable: false })
    expect(r.status).toBe(404)
  })
})
