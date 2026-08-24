import { describe, expect, mock, test } from "bun:test"
import {
  createPreference,
  handleWebhook,
  type MercadoPagoDeps,
} from "@/modules/orders/api/mercadopago"

type Calls = { q: string; values: unknown[] }

const DEFAULT_SETTINGS = [
  { mp_enabled: true, mp_access_token: "tok-test", mp_webhook_secret: "sec-test" },
]

function makeSql(overrides: {
  order?: unknown[]
  slug?: unknown[]
  dedupe?: unknown[]
  settings?: unknown[]
} = {}) {
  const calls: Calls[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("INSERT INTO order_payments")) return Promise.resolve([])
    if (q.includes("UPDATE orders")) return Promise.resolve([])
    if (q.includes("mp_payment_id")) return Promise.resolve(overrides.dedupe ?? [])
    if (q.includes("orders_settings")) {
      return Promise.resolve(overrides.settings ?? DEFAULT_SETTINGS)
    }
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
  const createPreferenceCalls: { payload: unknown; token: unknown }[] = []
  const createPreference = mock(
    async (payload: unknown, token: unknown) => {
      createPreferenceCalls.push({ payload, token })
      return { id: "pref-1", init_point: "https://mp/init" }
    }
  )
  const getPaymentCalls: { id: unknown; token: unknown }[] = []
  const getPayment = mock(async (id: unknown, token: unknown) => {
    getPaymentCalls.push({ id, token })
    return { id: "pay-1", status: "approved", external_reference: "ord-1" }
  })
  const validateSignatureCalls: { raw: unknown; header: unknown; secret: unknown }[] = []
  const validateSignature = mock(
    (raw: unknown, header: unknown, secret: unknown) => {
      validateSignatureCalls.push({ raw, header, secret })
      return true
    }
  )
  return {
    deps: {
      sql: makeSql().sql as unknown as MercadoPagoDeps["sql"],
      createPreference,
      getPayment,
      validateSignature,
      ...overrides,
    } as MercadoPagoDeps,
    createPreferenceCalls,
    getPaymentCalls,
    validateSignatureCalls,
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

    const payload = createPreferenceCalls[0].payload as {
      items: { title: string; unit_price: number; currency_id: string }[]
      external_reference: string
      notification_url: string
      auto_return: string
      back_urls: { success: string }
    }
    expect(payload.external_reference).toBe("ord-1")
    expect(payload.items[0]).toMatchObject({ title: "Pedido #17", unit_price: 125, currency_id: "ARS" })
    expect(payload.back_urls.success).toContain("/carri/orders/ord-1")
    expect(payload.notification_url).toContain("/api/orders/mercadopago/webhook/biz-1")
    expect(payload.auto_return).toBe("approved")
  })

  test("usa el access_token del negocio", async () => {
    const { sql } = makeSql()
    const { deps, createPreferenceCalls } = makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] })

    await createPreference(deps, { orderId: "ord-1", appUrl: "https://tumo.app" })

    expect(createPreferenceCalls[0].token).toBe("tok-test")
  })

  test("MercadoPago deshabilitado → 409", async () => {
    const { sql } = makeSql({
      settings: [{ mp_enabled: false, mp_access_token: "tok-test", mp_webhook_secret: "sec-test" }],
    })
    const r = await createPreference(
      makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] }).deps,
      { orderId: "ord-1", appUrl: "https://tumo.app" }
    )
    expect(r.status).toBe(409)
    expect(r.body).toMatchObject({ code: "MP_UNAVAILABLE" })
  })

  test("sin access_token → 409", async () => {
    const { sql } = makeSql({
      settings: [{ mp_enabled: true, mp_access_token: null, mp_webhook_secret: "sec-test" }],
    })
    const r = await createPreference(
      makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] }).deps,
      { orderId: "ord-1", appUrl: "https://tumo.app" }
    )
    expect(r.status).toBe(409)
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
    const r = await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=bad", businessId: "biz-1" })
    expect(r.status).toBe(401)
  })

  test("valida con el secret del negocio", async () => {
    const { deps, validateSignatureCalls } = makeDeps()
    await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=ok", businessId: "biz-1" })
    expect(validateSignatureCalls[0].secret).toBe("sec-test")
  })

  test("sin businessId → 401", async () => {
    const r = await handleWebhook(makeDeps().deps, { rawBody, signatureHeader: "ts=1,v1=ok", businessId: "" })
    expect(r.status).toBe(401)
  })

  test("negocio sin webhook secret → 401", async () => {
    const { sql } = makeSql({
      settings: [{ mp_enabled: true, mp_access_token: "tok-test", mp_webhook_secret: null }],
    })
    const r = await handleWebhook(
      makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] }).deps,
      { rawBody, signatureHeader: "ts=1,v1=ok", businessId: "biz-1" }
    )
    expect(r.status).toBe(401)
  })

  test("pago aprobado → paid + confirmed (GET con el token del negocio)", async () => {
    const { sql, calls } = makeSql()
    const { deps, getPaymentCalls } = makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] })

    const r = await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=ok", businessId: "biz-1" })

    expect(r.status).toBe(200)
    expect(getPaymentCalls[0].token).toBe("tok-test")
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

    const r = await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=ok", businessId: "biz-1" })

    expect(r.status).toBe(200)
    const update = calls.find((c) => c.q.includes("UPDATE orders"))
    expect(update!.values).toContain("rejected")
  })

  test("duplicado por mp_payment_id → no-op", async () => {
    const { sql, calls } = makeSql({ dedupe: [{ id: "exists" }] })
    const deps = makeDeps({ sql: sql as unknown as MercadoPagoDeps["sql"] }).deps

    const r = await handleWebhook(deps, { rawBody, signatureHeader: "ts=1,v1=ok", businessId: "biz-1" })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ duplicated: true })
    expect(calls.find((c) => c.q.includes("INSERT INTO order_payments"))).toBeUndefined()
    expect(calls.find((c) => c.q.includes("UPDATE orders"))).toBeUndefined()
  })

  test("body sin payment id → 400", async () => {
    const r = await handleWebhook(makeDeps().deps, {
      rawBody: JSON.stringify({ type: "payment", data: {} }),
      signatureHeader: "ts=1,v1=ok",
      businessId: "biz-1",
    })
    expect(r.status).toBe(400)
  })
})
