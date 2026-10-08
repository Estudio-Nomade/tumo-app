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

  test("NEXT_PUBLIC_SELF_SERVICE_SIGNUP also enables", () => {
    expect(
      isSelfServiceSignupEnabled({ NEXT_PUBLIC_SELF_SERVICE_SIGNUP: "true" })
    ).toBe(true)
  })

  test("explicit false disables even in development", () => {
    expect(
      isSelfServiceSignupEnabled({
        SELF_SERVICE_SIGNUP: "false",
        NODE_ENV: "development",
      })
    ).toBe(false)
  })

  test("missing flag: development defaults on, production off", () => {
    expect(isSelfServiceSignupEnabled({ NODE_ENV: "development" })).toBe(true)
    expect(isSelfServiceSignupEnabled({ NODE_ENV: "production" })).toBe(false)
    expect(isSelfServiceSignupEnabled({})).toBe(false)
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
