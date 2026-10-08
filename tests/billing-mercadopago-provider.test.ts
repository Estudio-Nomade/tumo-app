import { describe, expect, mock, test } from "bun:test"
import {
  createMercadoPagoProvider,
  buildPreferenceBody,
  mapPaymentStatusToEventType,
  verifyMercadoPagoWebhookSignature,
} from "@/shell/billing/provider/mercadopago"
import type { CreateCheckoutInput } from "@/shell/billing/provider/types"

const baseInput: CreateCheckoutInput = {
  externalReference: "sess-uuid-1",
  planId: "basico",
  title: "Tumo Básico",
  amountArsCents: 3999000,
  payerEmail: "a@b.com",
  payerName: "Ana",
  payerDocument: "30111222",
  successUrl: "https://app.test/signup/continue?session=sess-uuid-1",
  failureUrl: "https://app.test/signup/continue?session=sess-uuid-1&result=failure",
  pendingUrl: "https://app.test/signup/continue?session=sess-uuid-1&result=pending",
  notificationUrl: "https://app.test/api/billing/webhooks/mercadopago",
}

describe("buildPreferenceBody", () => {
  test("ARS major units from cents + external_reference + back_urls", () => {
    const body = buildPreferenceBody(baseInput)
    expect(body.external_reference).toBe("sess-uuid-1")
    expect(body.items[0]?.unit_price).toBe(39990)
    expect(body.items[0]?.currency_id).toBe("ARS")
    expect(body.items[0]?.title).toBe("Tumo Básico")
    expect(body.back_urls.success).toContain("continue")
    expect(body.notification_url).toContain("/webhooks/mercadopago")
    expect(body.auto_return).toBe("approved")
    expect(body.payer?.email).toBe("a@b.com")
  })

  test("localhost success → no auto_return (MP rejects)", () => {
    const body = buildPreferenceBody({
      ...baseInput,
      successUrl: "http://localhost:3000/signup/continue?session=x",
      failureUrl: "http://localhost:3000/signup/continue?session=x&result=failure",
      pendingUrl: "http://localhost:3000/signup/continue?session=x&result=pending",
      notificationUrl: "http://localhost:3000/api/billing/webhooks/mercadopago",
    })
    expect(body.auto_return).toBeUndefined()
  })
})

describe("mapPaymentStatusToEventType", () => {
  test("approved → payment_succeeded", () => {
    expect(mapPaymentStatusToEventType("approved")).toBe("payment_succeeded")
  })
  test("rejected/cancelled → payment_failed", () => {
    expect(mapPaymentStatusToEventType("rejected")).toBe("payment_failed")
    expect(mapPaymentStatusToEventType("cancelled")).toBe("payment_failed")
  })
  test("pending/in_process → payment_pending", () => {
    expect(mapPaymentStatusToEventType("pending")).toBe("payment_pending")
    expect(mapPaymentStatusToEventType("in_process")).toBe("payment_pending")
  })
})

describe("verifyMercadoPagoWebhookSignature", () => {
  test("empty secret → skip (true)", () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        secret: "",
        rawBody: "{}",
        xSignature: null,
        xRequestId: null,
      })
    ).toBe(true)
  })

  test("secret set without header → false", () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        secret: "sec",
        rawBody: "{}",
        xSignature: null,
        xRequestId: "r1",
      })
    ).toBe(false)
  })
})

describe("createMercadoPagoProvider.createCheckout", () => {
  test("POSTs preference and returns init_point", async () => {
    const fetchMock = mock(async (url: string, init?: RequestInit) => {
      expect(String(url)).toContain("/checkout/preferences")
      expect(init?.method).toBe("POST")
      const headers = init?.headers as Record<string, string>
      expect(headers.Authorization).toBe("Bearer TEST-TOKEN")
      return new Response(
        JSON.stringify({
          id: "pref_real_1",
          init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref_real_1",
          sandbox_init_point:
            "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref_real_1",
        }),
        { status: 201 }
      )
    })

    const p = createMercadoPagoProvider({
      accessToken: "TEST-TOKEN",
      fetch: fetchMock as unknown as typeof fetch,
    })
    const out = await p.createCheckout(baseInput)
    expect(out.providerCheckoutId).toBe("pref_real_1")
    expect(out.redirectUrl).toContain("mercadopago")
    expect(out.redirectUrl).toContain("pref_real_1")
    expect(fetchMock).toHaveBeenCalled()
  })

  test("prefer sandbox_init_point when preferSandbox", async () => {
    const fetchMock = mock(async () => {
      return new Response(
        JSON.stringify({
          id: "pref_sb",
          init_point: "https://www.mercadopago.com.ar/prod",
          sandbox_init_point: "https://sandbox.mercadopago.com.ar/sb",
        }),
        { status: 201 }
      )
    })
    const p = createMercadoPagoProvider({
      accessToken: "TEST-TOKEN",
      preferSandbox: true,
      fetch: fetchMock as unknown as typeof fetch,
    })
    const out = await p.createCheckout(baseInput)
    expect(out.redirectUrl).toBe("https://sandbox.mercadopago.com.ar/sb")
  })

  test("API error throws", async () => {
    const fetchMock = mock(async () => {
      return new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
      })
    })
    const p = createMercadoPagoProvider({
      accessToken: "BAD",
      fetch: fetchMock as unknown as typeof fetch,
    })
    await expect(p.createCheckout(baseInput)).rejects.toThrow()
  })
})

describe("createMercadoPagoProvider.parseAndVerifyWebhook", () => {
  test("payment notification → fetch payment → approved event", async () => {
    const fetchMock = mock(async (url: string) => {
      if (String(url).includes("/v1/payments/")) {
        return new Response(
          JSON.stringify({
            id: 999,
            status: "approved",
            external_reference: "sess-uuid-1",
            transaction_amount: 39990,
            currency_id: "ARS",
          }),
          { status: 200 }
        )
      }
      return new Response("unexpected", { status: 500 })
    })
    const p = createMercadoPagoProvider({
      accessToken: "TEST-TOKEN",
      webhookSecret: "",
      fetch: fetchMock as unknown as typeof fetch,
    })
    const ev = await p.parseAndVerifyWebhook(
      JSON.stringify({ type: "payment", data: { id: "999" } }),
      { "x-signature": "" }
    )
    expect(ev.type).toBe("payment_succeeded")
    expect(ev.externalReference).toBe("sess-uuid-1")
    expect(ev.providerPaymentId).toBe("999")
    expect(ev.providerEventId).toBe("999")
  })

  test("query-style topic payment id in body", async () => {
    const fetchMock = mock(async () => {
      return new Response(
        JSON.stringify({
          id: 1,
          status: "rejected",
          external_reference: "sess-2",
        }),
        { status: 200 }
      )
    })
    const p = createMercadoPagoProvider({
      accessToken: "T",
      fetch: fetchMock as unknown as typeof fetch,
    })
    const ev = await p.parseAndVerifyWebhook(
      JSON.stringify({ action: "payment.updated", data: { id: "1" } }),
      {}
    )
    expect(ev.type).toBe("payment_failed")
    expect(ev.externalReference).toBe("sess-2")
  })
})
