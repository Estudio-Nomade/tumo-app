import { describe, expect, mock, test } from "bun:test"
import {
  createOrder,
  getOrder,
  type OrdersDeps,
} from "@/modules/orders/api/orders"
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
    "1": { open: "00:00", close: "23:59", closed: false },
    "2": { open: "00:00", close: "23:59", closed: false },
    "3": { open: "00:00", close: "23:59", closed: false },
    "4": { open: "00:00", close: "23:59", closed: false },
    "5": { open: "00:00", close: "23:59", closed: false },
    "6": { open: "00:00", close: "23:59", closed: false },
  }
}

const productRow = { id: "p1", name: "Hamburguesa Clásica", price_cents: 4500, is_available: true }
const optionRow = { id: "o1", group_id: "g1", group_name: "Tamaño", option_name: "Grande", price_delta_cents: 800 }

type Calls = { q: string; values: unknown[] }

function makeSql(overrides: {
  settings?: unknown[]
  idempotency?: unknown[]
  products?: unknown[]
  options?: unknown[]
  customer?: unknown[]
  orderNumber?: unknown[]
  insertedCustomer?: unknown[]
  insertedOrder?: unknown[]
} = {}) {
  const calls: Calls[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("INSERT INTO order_item_variants")) return Promise.resolve([])
    if (q.includes("INSERT INTO order_items")) return Promise.resolve([{ id: "item-1" }])
    if (q.includes("INSERT INTO orders")) {
      const row = overrides.insertedOrder ?? [
        {
          id: "ord-1",
          business_id: "biz-1",
          customer_id: "cust-1",
          order_number: 1,
          status: "pending",
          payment_method: "at_pickup",
          payment_status: "unpaid",
          fulfillment: "pickup",
          delivery_fee_cents: 0,
          subtotal_cents: 10600,
          total_cents: 10600,
        },
      ]
      return Promise.resolve(row)
    }
    if (q.includes("INSERT INTO customers")) {
      return Promise.resolve(
        overrides.insertedCustomer ?? [
          { id: "cust-1", name: "Juan", phone: "5491111111111", code: "5678", business_id: "biz-1" },
        ]
      )
    }
    if (q.includes("MAX(order_number)")) {
      return Promise.resolve(overrides.orderNumber ?? [{ next: 1 }])
    }
    if (q.includes("product_variant_options")) {
      return Promise.resolve(overrides.options ?? [optionRow])
    }
    if (q.includes("FROM products")) {
      return Promise.resolve(overrides.products ?? [productRow])
    }
    if (q.includes("idempotency_key")) {
      return Promise.resolve(overrides.idempotency ?? [])
    }
    if (q.includes("FROM customers")) {
      return Promise.resolve(overrides.customer ?? [])
    }
    if (q.includes("orders_settings")) {
      return Promise.resolve(
        overrides.settings ?? [
          { business_id: "biz-1", is_paused: false, hours: openHours(), delivery_fee_cents: 500 },
        ]
      )
    }
    return Promise.resolve([])
  })
  return { sql, calls }
}

function makeDeps(overrides: Partial<OrdersDeps> = {}): OrdersDeps {
  return {
    sql: makeSql().sql as unknown as OrdersDeps["sql"],
    getBusiness: mock(() => Promise.resolve(business)),
    generateCode: mock(() => "5678"),
    now: () => new Date(2026, 7, 17, 20, 0), // lunes 20:00
    ...overrides,
  }
}

const baseInput = {
  slug: "carri",
  idempotencyKey: "key-1",
  name: "Juan",
  phone: "+5491111111111",
  fulfillment: "pickup" as const,
  paymentMethod: "at_pickup" as const,
  items: [{ productId: "p1", quantity: 2, variantOptionIds: ["o1"] }],
}

describe("createOrder", () => {
  test("crea pedido con snapshot y totales server-side (at_pickup)", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await createOrder(deps, baseInput)

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      id: "ord-1",
      orderNumber: 1,
      status: "pending",
      paymentStatus: "unpaid",
      paymentMethod: "at_pickup",
      subtotalCents: 10600,
      totalCents: 10600,
      deliveryFeeCents: 0,
      customerCode: "5678",
    })

    const itemsInsert = calls.find((c) => c.q.includes("INSERT INTO order_items"))
    expect(itemsInsert).toBeDefined()
    const itemValues = itemsInsert!.values
    expect(itemValues).toContain("Hamburguesa Clásica")
    expect(itemValues).toContain(2)
    expect(itemValues).toContain(5300)

    const variantsInsert = calls.find((c) => c.q.includes("INSERT INTO order_item_variants"))
    expect(variantsInsert).toBeDefined()
    expect(variantsInsert!.values).toContain("Tamaño")
    expect(variantsInsert!.values).toContain("Grande")
    expect(variantsInsert!.values).toContain(800)
  })

  test("envío suma fee fijo y total = subtotal + fee", async () => {
    const { sql } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await createOrder(deps, {
      ...baseInput,
      fulfillment: "delivery",
      deliveryAddress: "Calle 1",
    })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      subtotalCents: 10600,
      deliveryFeeCents: 500,
      totalCents: 11100,
    })
  })

  test("cerrado por horario → 409", async () => {
    const { sql } = makeSql({
      settings: [{ business_id: "biz-1", is_paused: false, hours: { "0": { closed: true } }, delivery_fee_cents: 0 }],
    })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await createOrder(deps, baseInput)
    expect(r.status).toBe(409)
  })

  test("pausado → 409", async () => {
    const { sql } = makeSql({
      settings: [{ business_id: "biz-1", is_paused: true, hours: openHours(), delivery_fee_cents: 0 }],
    })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await createOrder(deps, baseInput)
    expect(r.status).toBe(409)
  })

  test("producto agotado → 409 con el ítem caído", async () => {
    const { sql } = makeSql({ products: [{ ...productRow, is_available: false }] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await createOrder(deps, baseInput)
    expect(r.status).toBe(409)
    expect(r.body).toMatchObject({ code: "ITEMS_UNAVAILABLE" })
  })

  test("idempotencia: segundo POST devuelve el mismo pedido sin reinsertar", async () => {
    const { sql, calls } = makeSql({
      idempotency: [
        {
          id: "ord-existente",
          order_number: 17,
          status: "pending",
          payment_method: "at_pickup",
          payment_status: "unpaid",
          fulfillment: "pickup",
          delivery_fee_cents: 0,
          subtotal_cents: 4500,
          total_cents: 4500,
          customer_code: "9999",
        },
      ],
    })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await createOrder(deps, baseInput)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ id: "ord-existente", orderNumber: 17, customerCode: "9999" })
    expect(calls.find((c) => c.q.includes("INSERT INTO orders"))).toBeUndefined()
  })

  test("cliente existente: reusa sin pisar nombre", async () => {
    const { sql, calls } = makeSql({
      customer: [
        { id: "cust-existing", name: "Nombre Original", phone: "5491111111111", code: "9999", business_id: "biz-1" },
      ],
    })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await createOrder(deps, { ...baseInput, name: "Otro Nombre" })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ customerCode: "9999" })
    expect(calls.find((c) => c.q.includes("INSERT INTO customers"))).toBeUndefined()
    expect(deps.generateCode).not.toHaveBeenCalled()
  })

  test("order_number correlativo desde MAX+1", async () => {
    const { sql } = makeSql({ orderNumber: [{ next: 17 }] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await createOrder(deps, baseInput)
    expect(r.body).toMatchObject({ orderNumber: 17 })
  })

  test("inputs inválidos → 400", async () => {
    const deps = makeDeps()
    const cases: Partial<typeof baseInput>[] = [
      { name: "" },
      { phone: "123" },
      { items: [] },
      { paymentMethod: "tarjeta" as never },
    ]
    for (const patch of cases) {
      const r = await createOrder(deps, { ...baseInput, ...patch })
      expect(r.status).toBe(400)
    }
  })

  test("cantidad fuera de 1..20 → 400", async () => {
    const deps = makeDeps()
    const r = await createOrder(deps, {
      ...baseInput,
      items: [{ productId: "p1", quantity: 21, variantOptionIds: [] }],
    })
    expect(r.status).toBe(400)
  })
})

describe("getOrder", () => {
  test("pedido inexistente → 404", async () => {
    const sql = mock(() => Promise.resolve([]))
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await getOrder(deps, { id: "nope" })
    expect(r.status).toBe(404)
  })

  test("clientId ajeno → 403", async () => {
    const sql = mock((strings: TemplateStringsArray) => {
      const q = strings.join(" ")
      if (q.includes("FROM orders")) {
        return Promise.resolve([{ id: "ord-1", customer_id: "cust-1", business_id: "biz-1", order_number: 1, status: "pending", payment_method: "at_pickup", payment_status: "unpaid", fulfillment: "pickup", delivery_fee_cents: 0, subtotal_cents: 0, total_cents: 0 }])
      }
      return Promise.resolve([])
    })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await getOrder(deps, { id: "ord-1", clientId: "otro" })
    expect(r.status).toBe(403)
  })
})
