import { describe, expect, mock, test } from "bun:test"
import {
  cancelOrder,
  listOrders,
  transitionStatus,
  verifyPayment,
  type OrdersDeps,
} from "@/modules/orders/api/orders"

type Calls = { q: string; values: unknown[] }

const listRow = {
  id: "ord-1",
  order_number: 17,
  status: "pending",
  payment_method: "at_pickup",
  payment_status: "unpaid",
  total_cents: 12500,
  created_at: new Date("2026-08-21T20:00:00Z"),
  customer_name: "María García",
  customer_phone: "5491111111111",
  items_summary: "2x Hamburguesa, 1x Papas",
}

function makeSql(overrides: {
  list?: unknown[]
  order?: unknown[]
  updated?: unknown[]
} = {}) {
  const calls: Calls[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("UPDATE orders")) {
      return Promise.resolve(overrides.updated ?? [])
    }
    if (q.includes("string_agg")) {
      return Promise.resolve(overrides.list ?? [listRow])
    }
    if (q.includes("FROM orders")) {
      return Promise.resolve(
        overrides.order ?? [{ id: "ord-1", status: "pending", payment_status: "unpaid" }]
      )
    }
    return Promise.resolve([])
  })
  return { sql, calls }
}

function makeDeps(overrides: Partial<OrdersDeps> = {}): OrdersDeps {
  return {
    sql: makeSql().sql as unknown as OrdersDeps["sql"],
    getBusiness: mock(() => Promise.resolve(null)),
    generateCode: mock(() => "5678"),
    ...overrides,
  }
}

describe("listOrders", () => {
  test("businessId vacío → 400", async () => {
    const r = await listOrders(makeDeps(), { businessId: "" })
    expect(r.status).toBe(400)
  })

  test("mapea filas a camelCase con resumen de ítems", async () => {
    const { sql } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await listOrders(deps, { businessId: "biz-1" })

    expect(r.status).toBe(200)
    const orders = (r.body as { orders: unknown[] }).orders
    expect(orders).toHaveLength(1)
    expect(orders[0]).toMatchObject({
      id: "ord-1",
      orderNumber: 17,
      status: "pending",
      paymentStatus: "unpaid",
      totalCents: 12500,
      customerName: "María García",
      itemsSummary: "2x Hamburguesa, 1x Papas",
    })
  })

  test("filtro 'new' usa statuses pending+confirmed", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    await listOrders(deps, { businessId: "biz-1", statusFilter: "new" })
    const list = calls.find((c) => c.q.includes("string_agg"))
    expect(list).toBeDefined()
    expect(list!.values).toContainEqual(["pending", "confirmed"])
  })

  test("filtro 'preparing' usa status preparing", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    await listOrders(deps, { businessId: "biz-1", statusFilter: "preparing" })
    const list = calls.find((c) => c.q.includes("string_agg"))
    expect(list!.values).toContainEqual(["preparing"])
  })

  test("sin filtro no usa status = ANY", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    await listOrders(deps, { businessId: "biz-1" })
    const list = calls.find((c) => c.q.includes("string_agg"))
    expect(list!.q).not.toContain("= ANY")
  })
})

describe("transitionStatus", () => {
  test("pending → confirmed OK", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await transitionStatus(deps, { orderId: "ord-1", newStatus: "confirmed" })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ status: "confirmed" })
    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update!.values).toContain("confirmed")
  })

  test("salto inválido (pending → preparing) → 400", async () => {
    const deps = makeDeps()
    const r = await transitionStatus(deps, { orderId: "ord-1", newStatus: "preparing" })
    expect(r.status).toBe(400)
  })

  test("pedido completado → 409", async () => {
    const { sql } = makeSql({ order: [{ id: "ord-1", status: "completed", payment_status: "paid" }] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await transitionStatus(deps, { orderId: "ord-1", newStatus: "completed" })
    expect(r.status).toBe(409)
  })

  test("inexistente → 404", async () => {
    const { sql } = makeSql({ order: [] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await transitionStatus(deps, { orderId: "nope", newStatus: "confirmed" })
    expect(r.status).toBe(404)
  })
})

describe("verifyPayment", () => {
  test("approve: pending → paid + confirmed", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await verifyPayment(deps, { orderId: "ord-1", action: "approve" })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ paymentStatus: "paid", status: "confirmed" })
    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update!.values).toContain("paid")
  })

  test("approve sobre ready: paid pero status no cambia", async () => {
    const { sql } = makeSql({ order: [{ id: "ord-1", status: "ready", payment_status: "unpaid" }] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await verifyPayment(deps, { orderId: "ord-1", action: "approve" })
    expect(r.body).toMatchObject({ paymentStatus: "paid", status: "ready" })
  })

  test("reject: rejected y status intacto", async () => {
    const { sql, calls } = makeSql({
      order: [{ id: "ord-1", status: "pending", payment_status: "pending_verification" }],
    })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await verifyPayment(deps, { orderId: "ord-1", action: "reject", reason: "No coincide" })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ paymentStatus: "rejected", status: "pending" })
    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update!.values).toContain("rejected")
  })

  test("action inválido → 400", async () => {
    const r = await verifyPayment(makeDeps(), { orderId: "ord-1", action: "nope" as never })
    expect(r.status).toBe(400)
  })
})

describe("cancelOrder", () => {
  test("ready → cancelled", async () => {
    const { sql, calls } = makeSql({ order: [{ id: "ord-1", status: "ready", payment_status: "paid" }] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await cancelOrder(deps, { orderId: "ord-1" })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ status: "cancelled" })
    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update!.values).toContain("cancelled")
  })

  test("completed → 409", async () => {
    const { sql } = makeSql({ order: [{ id: "ord-1", status: "completed", payment_status: "paid" }] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await cancelOrder(deps, { orderId: "ord-1" })
    expect(r.status).toBe(409)
  })

  test("inexistente → 404", async () => {
    const { sql } = makeSql({ order: [] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await cancelOrder(deps, { orderId: "nope" })
    expect(r.status).toBe(404)
  })
})
