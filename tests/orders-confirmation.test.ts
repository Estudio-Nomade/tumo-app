import { describe, expect, mock, test } from "bun:test"
import {
  changePaymentMethod,
  uploadReceipt,
  type OrdersDeps,
} from "@/modules/orders/api/orders"

const orderRow = {
  id: "ord-1",
  payment_method: "transfer",
  payment_status: "pending_receipt",
  status: "pending",
}

type Calls = { q: string; values: unknown[] }

function makeSql(overrides: { order?: unknown[] } = {}) {
  const calls: Calls[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("INSERT INTO order_payments")) return Promise.resolve([])
    if (q.includes("UPDATE orders")) return Promise.resolve([])
    if (q.includes("FROM orders")) {
      return Promise.resolve(overrides.order ?? [orderRow])
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

const jpeg = new Uint8Array([0xff, 0xd8, 0xff])

describe("uploadReceipt", () => {
  test("imagen válida → pending_verification + fila de intento", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await uploadReceipt(deps, {
      orderId: "ord-1",
      mime: "image/jpeg",
      data: jpeg,
    })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ paymentStatus: "pending_verification" })

    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update).toBeDefined()
    expect(update!.q).toContain("pending_verification")

    const insert = calls.find((c) => c.q.includes("INSERT INTO order_payments"))
    expect(insert).toBeDefined()
    expect(insert!.values).toContain("image/jpeg")
  })

  test("mime no permitido → 400", async () => {
    const deps = makeDeps()
    const r = await uploadReceipt(deps, {
      orderId: "ord-1",
      mime: "application/pdf",
      data: jpeg,
    })
    expect(r.status).toBe(400)
  })

  test("muy pesado → 400", async () => {
    const deps = makeDeps()
    const big = new Uint8Array(3 * 1024 * 1024 + 1)
    const r = await uploadReceipt(deps, {
      orderId: "ord-1",
      mime: "image/jpeg",
      data: big,
    })
    expect(r.status).toBe(400)
  })

  test("pedido inexistente → 404", async () => {
    const { sql } = makeSql({ order: [] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await uploadReceipt(deps, {
      orderId: "nope",
      mime: "image/jpeg",
      data: jpeg,
    })
    expect(r.status).toBe(404)
  })

  test("no está esperando comprobante (paid) → 409", async () => {
    const { sql } = makeSql({
      order: [{ ...orderRow, payment_status: "paid" }],
    })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await uploadReceipt(deps, {
      orderId: "ord-1",
      mime: "image/jpeg",
      data: jpeg,
    })
    expect(r.status).toBe(409)
  })

  test("re-subida tras rechazo (rejected) permitida", async () => {
    const { sql } = makeSql({
      order: [{ ...orderRow, payment_status: "rejected" }],
    })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await uploadReceipt(deps, {
      orderId: "ord-1",
      mime: "image/png",
      data: jpeg,
    })
    expect(r.status).toBe(200)
  })
})

describe("changePaymentMethod", () => {
  test("cambia método y setea payment_status según método", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })

    const r = await changePaymentMethod(deps, {
      orderId: "ord-1",
      paymentMethod: "at_pickup",
    })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ paymentMethod: "at_pickup", paymentStatus: "unpaid" })

    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update!.values).toContain("at_pickup")
    expect(update!.values).toContain("unpaid")
  })

  test("pedido no pending → 409", async () => {
    const { sql } = makeSql({ order: [{ ...orderRow, status: "confirmed" }] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await changePaymentMethod(deps, {
      orderId: "ord-1",
      paymentMethod: "transfer",
    })
    expect(r.status).toBe(409)
  })

  test("método inválido → 400", async () => {
    const deps = makeDeps()
    const r = await changePaymentMethod(deps, {
      orderId: "ord-1",
      paymentMethod: "efectivo" as never,
    })
    expect(r.status).toBe(400)
  })

  test("pedido inexistente → 404", async () => {
    const { sql } = makeSql({ order: [] })
    const deps = makeDeps({ sql: sql as unknown as OrdersDeps["sql"] })
    const r = await changePaymentMethod(deps, {
      orderId: "nope",
      paymentMethod: "transfer",
    })
    expect(r.status).toBe(404)
  })
})
