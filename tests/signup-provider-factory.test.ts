import { describe, expect, mock, test } from "bun:test"
import { createBillingProvider } from "@/modules/signup/lib/provider"

describe("createBillingProvider factory", () => {
  test("fake mode → fake name + local fake-checkout base", async () => {
    const p = createBillingProvider({
      mode: "fake",
      env: { BILLING_PROVIDER: "fake" },
    })
    expect(p.name).toBe("mercadopago_fake")
    const out = await p.createCheckout({
      externalReference: "s1",
      planId: "basico",
      title: "t",
      amountArsCents: 100,
      payerEmail: "a@b.com",
      successUrl: "http://x/s",
      failureUrl: "http://x/f",
      pendingUrl: "http://x/p",
      notificationUrl: "http://x/n",
    })
    expect(out.redirectUrl).toContain("/api/billing/fake-checkout/")
  })

  test("mercadopago + token → real provider name + Preference fetch", async () => {
    const fetchMock = mock(async () => {
      return new Response(
        JSON.stringify({
          id: "pref_f",
          init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref_f",
        }),
        { status: 201 }
      )
    })
    const p = createBillingProvider({
      mode: "mercadopago",
      env: {
        BILLING_PROVIDER: "mercadopago",
        MP_ACCESS_TOKEN: "APP_USR-test",
      },
      fetch: fetchMock as unknown as typeof fetch,
    })
    expect(p.name).toBe("mercadopago")
    const out = await p.createCheckout({
      externalReference: "s1",
      planId: "basico",
      title: "t",
      amountArsCents: 3999000,
      payerEmail: "a@b.com",
      successUrl: "http://x/s",
      failureUrl: "http://x/f",
      pendingUrl: "http://x/p",
      notificationUrl: "http://x/n",
    })
    expect(out.providerCheckoutId).toBe("pref_f")
    expect(out.redirectUrl).toContain("mercadopago.com.ar")
    expect(fetchMock).toHaveBeenCalled()
  })

  test("mercadopago without token falls back to fake", async () => {
    const p = createBillingProvider({
      mode: "mercadopago",
      env: { BILLING_PROVIDER: "mercadopago", MP_ACCESS_TOKEN: "" },
    })
    expect(p.name).toBe("mercadopago_fake")
  })
})
