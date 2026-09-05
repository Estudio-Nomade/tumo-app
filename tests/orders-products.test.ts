import { describe, expect, mock, test } from "bun:test"
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  saveVariants,
  setAvailability,
  updateProduct,
  type ProductsDeps,
} from "@/modules/orders/api/products"

function makeSql(overrides: {
  products?: unknown[]
  updated?: unknown[]
  inserted?: unknown[]
  deleted?: unknown[]
  existing?: unknown[]
  categories?: unknown[]
} = {}) {
  const calls: { q: string; values: unknown[] }[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("INSERT INTO products")) {
      return Promise.resolve(overrides.inserted ?? [{ id: "p-new" }])
    }
    if (q.includes("DELETE FROM products")) {
      return Promise.resolve(overrides.deleted ?? [{ id: "p1" }])
    }
    if (q.includes("UPDATE products")) {
      return Promise.resolve(overrides.updated ?? [{ id: "p1", is_available: false }])
    }
    if (q.includes("FROM product_categories")) {
      return Promise.resolve(overrides.categories ?? [{ id: "c1", name: "Hamburguesas" }])
    }
    if (q.includes("lower(name)") || q.includes("LOWER(name)")) {
      return Promise.resolve(overrides.existing ?? [])
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
            description: null,
            photo: null,
          },
        ]
      )
    }
    if (q.includes("INSERT INTO product_variant_groups")) {
      return Promise.resolve([{ id: "g1" }])
    }
    if (q.includes("product_variant")) {
      return Promise.resolve([])
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

  test("incluye photos ordenadas y photo = cover", async () => {
    const calls: { q: string; values: unknown[] }[] = []
    const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = strings.join(" ")
      calls.push({ q, values })
      if (q.includes("FROM products p") || (q.includes("FROM products") && q.includes("category"))) {
        return Promise.resolve([
          {
            id: "p1",
            name: "Hamburguesa Clásica",
            category_id: "c1",
            category_name: "Hamburguesas",
            price_cents: 4500,
            is_available: true,
            sort_order: 0,
            description: null,
            photo: "https://cdn/cover.png",
          },
        ])
      }
      if (q.includes("FROM product_photos")) {
        return Promise.resolve(
          [
            {
              id: "ph2",
              product_id: "p1",
              url: "https://cdn/b.png",
              sort_order: 1,
            },
            {
              id: "ph1",
              product_id: "p1",
              url: "https://cdn/cover.png",
              sort_order: 0,
            },
          ].sort((a, b) => a.sort_order - b.sort_order)
        )
      }
      if (q.includes("product_variant")) return Promise.resolve([])
      return Promise.resolve([])
    })
    const r = await listProducts(
      { sql: sql as unknown as ProductsDeps["sql"] },
      { businessId: "biz-1" }
    )
    expect(r.status).toBe(200)
    const p = (r.body as { products: { photo: string | null; photos: { id: string; sortOrder: number }[] }[] })
      .products[0]
    expect(p.photo).toBe("https://cdn/cover.png")
    expect(p.photos.map((x) => x.id)).toEqual(["ph1", "ph2"])
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

describe("createProduct", () => {
  test("nombre vacío → 400", async () => {
    const r = await createProduct(makeDeps(), {
      businessId: "biz-1",
      name: "  ",
      priceCents: 4500,
    })
    expect(r.status).toBe(400)
  })

  test("precio negativo → 400", async () => {
    const r = await createProduct(makeDeps(), {
      businessId: "biz-1",
      name: "Lomito",
      priceCents: -1,
    })
    expect(r.status).toBe(400)
  })

  test("precio no entero → 400", async () => {
    const r = await createProduct(makeDeps(), {
      businessId: "biz-1",
      name: "Lomito",
      priceCents: 10.5,
    })
    expect(r.status).toBe(400)
  })

  test("nombre duplicado → 409", async () => {
    const { sql } = makeSql({ existing: [{ id: "p1" }] })
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await createProduct(deps, {
      businessId: "biz-1",
      name: "Hamburguesa Clásica",
      priceCents: 4500,
    })
    expect(r.status).toBe(409)
  })

  test("crea producto y devuelve id", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await createProduct(deps, {
      businessId: "biz-1",
      name: "Lomito",
      priceCents: 5200,
      description: "Carne y papas",
    })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ id: "p-new" })
    const insert = calls.find((c) => c.q.includes("INSERT INTO products"))
    expect(insert).toBeDefined()
    expect(insert!.values).toContain(5200)
    expect(insert!.values).toContain("Lomito")
  })
})

describe("updateProduct", () => {
  test("actualiza nombre y precio", async () => {
    const { sql, calls } = makeSql({
      updated: [{ id: "p1" }],
    })
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await updateProduct(deps, {
      productId: "p1",
      businessId: "biz-1",
      name: "Clásica XL",
      priceCents: 5000,
    })
    expect(r.status).toBe(200)
    const update = calls.find((c) => c.q.includes("UPDATE products") && c.q.includes("name"))
    expect(update).toBeDefined()
    expect(update!.values).toContain("Clásica XL")
    expect(update!.values).toContain(5000)
  })

  test("inexistente → 404", async () => {
    const { sql } = makeSql({ updated: [] })
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await updateProduct(deps, {
      productId: "nope",
      businessId: "biz-1",
      name: "X",
      priceCents: 100,
    })
    expect(r.status).toBe(404)
  })
})

describe("deleteProduct", () => {
  test("borra el producto", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await deleteProduct(deps, { productId: "p1", businessId: "biz-1" })
    expect(r.status).toBe(200)
    expect(calls.some((c) => c.q.includes("DELETE FROM products"))).toBe(true)
  })

  test("inexistente → 404", async () => {
    const { sql } = makeSql({ deleted: [] })
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await deleteProduct(deps, { productId: "nope", businessId: "biz-1" })
    expect(r.status).toBe(404)
  })
})

describe("listCategories", () => {
  test("devuelve categorías del negocio", async () => {
    const { sql } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await listCategories(deps, { businessId: "biz-1" })
    expect(r.status).toBe(200)
    expect((r.body as { categories: { name: string }[] }).categories[0].name).toBe(
      "Hamburguesas"
    )
  })
})

describe("saveVariants", () => {
  test("grupo sin nombre → 400", async () => {
    const r = await saveVariants(makeDeps(), {
      productId: "p1",
      businessId: "biz-1",
      groups: [{ name: "  ", selectionType: "single", isRequired: true, options: [] }],
    })
    expect(r.status).toBe(400)
  })

  test("delta no entero → 400", async () => {
    const r = await saveVariants(makeDeps(), {
      productId: "p1",
      businessId: "biz-1",
      groups: [
        {
          name: "Tamaño",
          selectionType: "single",
          isRequired: true,
          options: [{ name: "Grande", priceDeltaCents: 1.5 }],
        },
      ],
    })
    expect(r.status).toBe(400)
  })

  test("reemplaza variantes en transacción", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as ProductsDeps["sql"] })
    const r = await saveVariants(deps, {
      productId: "p1",
      businessId: "biz-1",
      groups: [
        {
          name: "Tamaño",
          selectionType: "single",
          isRequired: true,
          options: [{ name: "Grande", priceDeltaCents: 800 }],
        },
      ],
    })
    expect(r.status).toBe(200)
    expect(calls.some((c) => c.q.includes("product_variant_groups"))).toBe(true)
  })
})
