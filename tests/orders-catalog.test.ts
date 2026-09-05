import { describe, expect, mock, test } from "bun:test"
import { getCatalog, type CatalogDeps } from "@/modules/orders/api/catalog"
import type { Business } from "@/lib/modules"
import type { OrdersHours } from "@/modules/orders/lib/hours"

const business: Business = {
  id: "biz-1",
  name: "El Auténtico Carri",
  slug: "carri",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["loyalty", "orders"],
  points_needed: 10,
  point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
  reward_name: "hamburguesa gratis",
}

function openHours(): OrdersHours {
  return {
    "0": { closed: true },
    "1": { open: "19:00", close: "01:00", closed: false },
  }
}

function makeSql(overrides: {
  categories?: unknown[]
  products?: unknown[]
  groups?: unknown[]
  options?: unknown[]
  photos?: unknown[]
  settings?: unknown[]
  pendingOrders?: unknown[]
}) {
  return mock((strings: TemplateStringsArray) => {
    const q = strings.join(" ")
    if (q.includes("product_categories")) return Promise.resolve(overrides.categories ?? [])
    if (q.includes("product_photos")) {
      const list = (overrides.photos ?? []) as { sort_order?: number }[]
      return Promise.resolve(
        [...list].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      )
    }
    if (q.includes("product_variant_options")) return Promise.resolve(overrides.options ?? [])
    if (q.includes("product_variant_groups")) return Promise.resolve(overrides.groups ?? [])
    if (q.includes("FROM products")) return Promise.resolve(overrides.products ?? [])
    if (q.includes("orders_settings")) return Promise.resolve(overrides.settings ?? [])
    if (q.includes("FROM orders")) return Promise.resolve(overrides.pendingOrders ?? [])
    return Promise.resolve([])
  })
}

function makeDeps(overrides: Partial<CatalogDeps> = {}): CatalogDeps {
  return {
    sql: makeSql({}),
    getBusiness: mock(() => Promise.resolve(business)),
    ...overrides,
  }
}

const productRow = {
  id: "p1",
  category_id: "c1",
  name: "Hamburguesa Clásica",
  description: "Pan, carne, lechuga",
  price_cents: 4500,
  photo: null,
  is_available: true,
  sort_order: 0,
}

describe("getCatalog", () => {
  test("slug vacío → 400", async () => {
    const deps = makeDeps()
    const r = await getCatalog(deps, { slug: "" })
    expect(r.status).toBe(400)
  })

  test("negocio no encontrado → 404", async () => {
    const deps = makeDeps({ getBusiness: mock(() => Promise.resolve(null)) })
    const r = await getCatalog(deps, { slug: "nope" })
    expect(r.status).toBe(404)
  })

  test("arma catálogo con variantes anidadas", async () => {
    const sql = makeSql({
      categories: [{ id: "c1", name: "Hamburguesas", sort_order: 0 }],
      products: [productRow],
      groups: [
        { id: "g1", product_id: "p1", name: "Tamaño", selection_type: "single", is_required: true, sort_order: 0 },
      ],
      options: [
        { id: "o1", group_id: "g1", name: "Grande", price_delta_cents: 800, is_available: true, sort_order: 0 },
      ],
      settings: [
        { delivery_fee_cents: 500, is_paused: false, hours: openHours() },
      ],
    })
    const deps = makeDeps({ sql: sql as unknown as CatalogDeps["sql"] })

    const r = await getCatalog(deps, { slug: "carri" })

    expect(r.status).toBe(200)
    const body = r.body as {
      categories: { id: string; name: string; sortOrder: number }[]
      products: {
        id: string
        priceCents: number
        variantGroups: { options: { priceDeltaCents: number }[] }[]
      }[]
      settings: { deliveryFeeCents: number; isOpen: boolean; isPaused: boolean }
    }
    expect(body.categories).toEqual([{ id: "c1", name: "Hamburguesas", sortOrder: 0 }])
    expect(body.products[0]).toMatchObject({ id: "p1", priceCents: 4500, isAvailable: true })
    expect(body.products[0].variantGroups[0]).toMatchObject({
      name: "Tamaño",
      selectionType: "single",
      options: [{ name: "Grande", priceDeltaCents: 800 }],
    })
    expect(body.settings).toMatchObject({ deliveryFeeCents: 500, isPaused: false })
  })

  test("incluye photos ordenadas y photo cover", async () => {
    const sql = makeSql({
      products: [{ ...productRow, photo: "https://cdn/cover.png" }],
      photos: [
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
      ],
      settings: [{ delivery_fee_cents: 0, is_paused: false, hours: openHours() }],
    })
    const r = await getCatalog(
      makeDeps({ sql: sql as unknown as CatalogDeps["sql"] }),
      { slug: "carri" }
    )
    expect(r.status).toBe(200)
    const p = (r.body as {
      products: {
        photo: string | null
        photos: { id: string; sortOrder: number }[]
      }[]
    }).products[0]
    expect(p.photo).toBe("https://cdn/cover.png")
    expect(p.photos.map((x) => x.id)).toEqual(["ph1", "ph2"])
  })

  test("cerrado por horario → isOpen false con nextOpening", async () => {
    const sunday = new Date("2026-08-23T15:00:00-03:00")
    const sql = makeSql({
      categories: [],
      products: [],
      settings: [{ delivery_fee_cents: 0, is_paused: false, hours: openHours() }],
    })
    const deps = makeDeps({
      sql: sql as unknown as CatalogDeps["sql"],
      now: () => sunday,
    })
    const r = await getCatalog(deps, { slug: "carri" })
    const body = r.body as { settings: { isOpen: boolean; nextOpening: { dayLabel: string; time: string } | null } }
    expect(body.settings.isOpen).toBe(false)
    expect(body.settings.nextOpening).not.toBeNull()
  })

  test("pausado → isPaused true e isOpen false", async () => {
    const sql = makeSql({
      categories: [],
      products: [],
      settings: [{ delivery_fee_cents: 0, is_paused: true, hours: openHours() }],
    })
    const deps = makeDeps({ sql: sql as unknown as CatalogDeps["sql"] })
    const r = await getCatalog(deps, { slug: "carri" })
    const body = r.body as { settings: { isOpen: boolean; isPaused: boolean } }
    expect(body.settings.isPaused).toBe(true)
    expect(body.settings.isOpen).toBe(false)
  })

  test("sin settings → fee 0 y cerrado", async () => {
    const sql = makeSql({ categories: [], products: [], settings: [] })
    const deps = makeDeps({ sql: sql as unknown as CatalogDeps["sql"] })
    const r = await getCatalog(deps, { slug: "carri" })
    const body = r.body as {
      settings: {
        deliveryFeeCents: number
        isOpen: boolean
        isPaused: boolean
        nextOpening: { dayLabel: string; time: string } | null
      }
    }
    expect(body.settings).toEqual({
      deliveryFeeCents: 0,
      isOpen: false,
      isPaused: false,
      nextOpening: null,
    })
  })

  test("producto agotado se devuelve con isAvailable false (no se filtra)", async () => {
    const sql = makeSql({
      categories: [],
      products: [{ ...productRow, is_available: false }],
      settings: [],
    })
    const deps = makeDeps({ sql: sql as unknown as CatalogDeps["sql"] })
    const r = await getCatalog(deps, { slug: "carri" })
    const body = r.body as { products: { id: string; isAvailable: boolean }[] }
    expect(body.products).toHaveLength(1)
    expect(body.products[0].isAvailable).toBe(false)
  })

  test("sin clientId → pendingOrder null", async () => {
    const sql = makeSql({ categories: [], products: [], settings: [] })
    const deps = makeDeps({ sql: sql as unknown as CatalogDeps["sql"] })
    const r = await getCatalog(deps, { slug: "carri" })
    const body = r.body as { pendingOrder: unknown }
    expect(body.pendingOrder).toBeNull()
  })

  test("clientId con pedido esperando comprobante → pendingOrder con id y método", async () => {
    const sql = makeSql({
      categories: [],
      products: [],
      settings: [],
      pendingOrders: [
        { id: "ord-1", order_number: 17, payment_method: "transfer", payment_status: "pending_verification" },
      ],
    })
    const deps = makeDeps({ sql: sql as unknown as CatalogDeps["sql"] })
    const r = await getCatalog(deps, { slug: "carri", clientId: "cust-1" })
    const body = r.body as {
      pendingOrder: {
        id: string
        orderNumber: number
        paymentMethod: string
        paymentStatus: string
      } | null
    }
    expect(body.pendingOrder).toEqual({
      id: "ord-1",
      orderNumber: 17,
      paymentMethod: "transfer",
      paymentStatus: "pending_verification",
    })
  })

  test("clientId sin pedido pendiente → pendingOrder null", async () => {
    const sql = makeSql({ categories: [], products: [], settings: [], pendingOrders: [] })
    const deps = makeDeps({ sql: sql as unknown as CatalogDeps["sql"] })
    const r = await getCatalog(deps, { slug: "carri", clientId: "cust-1" })
    const body = r.body as { pendingOrder: unknown }
    expect(body.pendingOrder).toBeNull()
  })
})
