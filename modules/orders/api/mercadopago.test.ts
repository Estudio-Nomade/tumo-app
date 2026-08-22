import { describe, expect, mock, test } from "bun:test"
import {
  createPreference,
  handleWebhook,
  type MercadoPagoDeps,
} from "@/modules/orders/api/mercadopago"

type Calls = { q: string; values: unknown[] }

function makeSql(overrides: {
  order?: unknown[]
  slug?: unknown[]
  dedupe?: unknown[]
} = {}) {
  const calls: Calls[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("INSERT INTO order_payments")) return Promise.resolve([])
    if (q.includes("UPDATE orders")) return Promise.resolve([])
    if (q.includes("mp_payment_id")) return Promise.resolve(overrides.dedupe ?? [])
    if (q.includes("FROM orders")) {
      return Promise.resolve(
        overrides.order ?? [
          { id: "ord-1", order_number: 17, total_cents: 12500, business_id: "biz-1", status: "pending", payment_status: "pending" },
        ]
      )
    }
    if (q.includes("FROM businesses")) {
      return Promise.resolve(overrides.slug ?? [{ slug: "carri" }])
    }
    return Promise.resolve([])
  })
  return { sql, calls }
}

function makeDeps(overrides: Partial<MercadoPagoDeps> = {}) {
  const createPreferenceCalls: unknown[] = []
  const createPreference = mock(async (payload: unknown) => {
    createPreferenceCalls.push(payload)
    return { id: "pref-1", init_point: "https://mp/init" }
  })
  const getPayment = mock(async () => ({ id: "pay-1", status: "approved", external_reference: "ord-1" }))
  const validateSignature = mock(() => true)
  return {
    deps: {
      sql: makeSql().sql as unknown as MercadoPagoDeps["sql"],
      createPreference,
      getPayment,
      validateSignature,
      ...overrides,
    } as MercadoPagoDeps,
    createPreferenceCalls,
    mocks: { getPayment, validateSignature },
  }
}

const rawBody = JSON.stringify({ type: "payment", data: { id: "pay-1" } })

describe("createPreference", () => {
  test("crea preference con items, reference y back_urls", async () => {
    const { sql } = makeSql()
    const { deps, createPreferenceCalls } = makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] })

    const r = await createPreference(deps, { orderId: "ord-1", appUrl: "https://tumo.app" })

    expect(r.status).toBe(200)
    expect(r.body).toEqual({ preferenceId: "pref-1", initPoint: "https://mp/init" })

    const payload = createPreferenceCalls[0] as {
      items: { title: string; unit_price: number; currency_id: string }[]
      external_reference: string
      notification_url: string
      auto_return: string
      back_urls: { success: string }
    }
    expect(payload.external_reference).toBe("ord-1")
    expect(payload.items[0]).toMatchObject({ title: "Pedido #17", unit_price: 125, currency_id: "ARS" })
    expect(payload.back_urls.success).toContain("/carri/orders/ord-1")
    expect(payload.notification_url).toContain("/api/orders/mercadopago/webhook")
    expect(payload.auto_return).toBe("approved")
  })

  test("orderId vacío → 400", async () => {
    const r = await createPreference(makeDeps().deps, { orderId: "", appUrl: "" })
    expect(r.status).toBe(400)
  })

  test("pedido inexistente → 404", async () => {
    const { sql } = makeSql({ order: [] })
    const r = await createPreference(
      makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] }).deps,
      { orderId: "nope", appUrl: "https://tumo.app" }
    )
    expect(r.status).toBe(404)
  })
})

describe("handleWebhook", () => {
  test("firma inválida → 401", async () => {
    const { deps } = makeDeps({ validateSignature: mock(() => false) })
    const r = await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=bad" })
    expect(r.status).toBe(401)
  })

  test("pago aprobado → paid + confirmed", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] }).deps

    const r = await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=ok" })

    expect(r.status).toBe(200)
    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update).toBeDefined()
    expect(update!.values).toContain("paid")
    expect(update!.values).toContain("confirmed")
    const insert = calls.find((c) => c.q.includes("INSERT INTO order_payments"))
    expect(insert!.values).toContain("pay-1")
  })

  test("pago rechazado → rejected", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({
      sql: sql as unknown as MercadoPagoDeps["sql"],
      getPayment: mock(async () => ({ id: "pay-1", status: "rejected", external_reference: "ord-1" })),
    }).deps

    const r = await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=ok" })

    expect(r.status).toBe(200)
    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update!.values).toContain("rejected")
  })

  test("duplicado por mp_payment_id → no-op", async () => {
    const { sql, calls } = makeSql({ dedupe: [{ id: "exists" }] })
    const deps = makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] }).deps

    const r = await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=ok" })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ duplicated: true })
    expect(calls.find((c) => c.q.includes("INSERT INTO order_payments"))).toBeUndefined()
    expect(calls.find((c) => c.q.includes("UPDATE orders"))).toBeUndefined()
  })

  test("body sin payment id → 400", async () => {
    const r = await handleWebhook(makeDeps().deps, {
      rawBody: JSON.stringify({ type: "payment", data: {} }),
      signatureHeader: "ts=1,v1=ok",
    })
    expect(r.status).toBe(400)
  })
})
