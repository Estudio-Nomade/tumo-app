import { describe, expect, test } from "bun:test"
import {
  canTransitionCheckout,
  createCheckoutSessionInput,
  type CheckoutStatus,
} from "@/shell/billing/checkout/session"

describe("checkout session state machine", () => {
  test("happy path transitions", () => {
    expect(canTransitionCheckout("started", "awaiting_payment")).toBe(true)
    expect(canTransitionCheckout("awaiting_payment", "paid")).toBe(true)
    expect(canTransitionCheckout("paid", "provisioned")).toBe(true)
  })

  test("failure paths from awaiting_payment", () => {
    for (const to of ["failed", "expired", "cancelled"] as CheckoutStatus[]) {
      expect(canTransitionCheckout("awaiting_payment", to)).toBe(true)
    }
  })

  test("illegal jumps blocked", () => {
    expect(canTransitionCheckout("started", "paid")).toBe(false)
    expect(canTransitionCheckout("started", "provisioned")).toBe(false)
    expect(canTransitionCheckout("provisioned", "paid")).toBe(false)
    expect(canTransitionCheckout("failed", "paid")).toBe(false)
  })

  test("createCheckoutSessionInput validates plan cupo and builds snapshot", () => {
    const registry = ["loyalty", "orders", "turnos"]
    const ok = createCheckoutSessionInput({
      email: "  Ana@Mail.com ",
      password: "secreto123",
      businessName: "Mi Local",
      payerName: "Ana Perez",
      payerDocument: "30111222",
      planId: "basico",
      moduleIds: ["loyalty"],
      registeredModuleIds: registry,
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.value.email).toBe("ana@mail.com")
    expect(ok.value.plan_id).toBe("basico")
    expect(ok.value.module_ids).toEqual(["loyalty"])
    expect(ok.value.billing_interval).toBe("month")
    expect(ok.value.currency).toBe("ARS")
    expect(ok.value.amount_cents).toBeGreaterThan(0)
    expect(ok.value.price_version).toBe(1)
    expect(ok.value.status).toBe("started")
  })

  test("createCheckoutSessionInput rejects bad cupo", () => {
    const bad = createCheckoutSessionInput({
      email: "a@b.com",
      password: "x",
      businessName: "X",
      payerName: "X",
      planId: "basico",
      moduleIds: ["loyalty", "orders"],
      registeredModuleIds: ["loyalty", "orders", "turnos"],
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.error).toBe("cupo")
  })

  test("createCheckoutSessionInput rejects empty email", () => {
    const bad = createCheckoutSessionInput({
      email: "  ",
      password: "x",
      businessName: "X",
      payerName: "X",
      planId: "pro",
      moduleIds: ["loyalty"],
      registeredModuleIds: ["loyalty", "orders", "turnos"],
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.error).toBe("email")
  })
})
