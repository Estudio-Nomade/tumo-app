import { describe, expect, test } from "bun:test"
import {
  isSelfServiceSignupEnabled,
  planCheckoutHref,
  resolveBillingProviderMode,
} from "@/modules/signup/lib/flags"

describe("signup flags", () => {
  test("SELF_SERVICE_SIGNUP true/1/yes enables", () => {
    expect(isSelfServiceSignupEnabled({ SELF_SERVICE_SIGNUP: "true" })).toBe(true)
    expect(isSelfServiceSignupEnabled({ SELF_SERVICE_SIGNUP: "1" })).toBe(true)
    expect(isSelfServiceSignupEnabled({ SELF_SERVICE_SIGNUP: "yes" })).toBe(true)
  })

  test("missing or false disables", () => {
    expect(isSelfServiceSignupEnabled({})).toBe(false)
    expect(isSelfServiceSignupEnabled({ SELF_SERVICE_SIGNUP: "false" })).toBe(false)
  })

  test("planCheckoutHref uses /signup when enabled else WA", () => {
    expect(
      planCheckoutHref({
        enabled: true,
        planId: "pro",
        waHref: "https://wa.me/x",
      })
    ).toBe("/signup?plan=pro")
    expect(
      planCheckoutHref({
        enabled: false,
        planId: "pro",
        waHref: "https://wa.me/x",
      })
    ).toBe("https://wa.me/x")
  })

  test("provider mode: fake when no token or forced", () => {
    expect(resolveBillingProviderMode({ BILLING_PROVIDER: "fake" })).toBe("fake")
    expect(resolveBillingProviderMode({})).toBe("fake")
    expect(
      resolveBillingProviderMode({
        BILLING_PROVIDER: "mercadopago",
        MP_ACCESS_TOKEN: "APP_USR-x",
      })
    ).toBe("mercadopago")
    expect(
      resolveBillingProviderMode({
        BILLING_PROVIDER: "mercadopago",
        MP_ACCESS_TOKEN: "",
      })
    ).toBe("fake")
  })
})
