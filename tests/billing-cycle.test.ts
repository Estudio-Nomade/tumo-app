import { describe, expect, test } from "bun:test"
import {
  addOneMonthUTC,
  businessAnchor,
  initialNextDue,
  nextDueAfterPayment,
  parseDateOnlyToUtcNoon,
  shouldSetInitialNextDue,
} from "@/shell/billing/cycle"

describe("addOneMonthUTC", () => {
  test("avanza un mes calendar UTC", () => {
    const d = new Date("2026-09-01T12:00:00.000Z")
    expect(addOneMonthUTC(d).toISOString()).toBe("2026-10-01T12:00:00.000Z")
  })
})

describe("parseDateOnlyToUtcNoon", () => {
  test("YYYY-MM-DD → UTC noon", () => {
    expect(parseDateOnlyToUtcNoon("2026-09-01")?.toISOString()).toBe(
      "2026-09-01T12:00:00.000Z"
    )
  })

  test("ISO con Z se respeta", () => {
    expect(
      parseDateOnlyToUtcNoon("2026-09-15T18:30:00.000Z")?.toISOString()
    ).toBe("2026-09-15T18:30:00.000Z")
  })

  test("inválido → null", () => {
    expect(parseDateOnlyToUtcNoon("")).toBeNull()
    expect(parseDateOnlyToUtcNoon("nope")).toBeNull()
  })
})

describe("businessAnchor", () => {
  test("min de anchors active", () => {
    const a = businessAnchor([
      {
        status: "active",
        billing_anchor_at: new Date("2026-09-20T12:00:00.000Z"),
      },
      {
        status: "active",
        billing_anchor_at: new Date("2026-09-01T12:00:00.000Z"),
      },
      {
        status: "inactive",
        billing_anchor_at: new Date("2026-08-01T12:00:00.000Z"),
      },
    ])
    expect(a?.toISOString()).toBe("2026-09-01T12:00:00.000Z")
  })

  test("sin activas → null", () => {
    expect(businessAnchor([])).toBeNull()
    expect(
      businessAnchor([
        {
          status: "inactive",
          billing_anchor_at: new Date("2026-09-01T12:00:00.000Z"),
        },
      ])
    ).toBeNull()
  })
})

describe("initialNextDue / nextDueAfterPayment", () => {
  test("loyalty 2026-09-01 sin pago → next 2026-10-01", () => {
    const anchor = new Date("2026-09-01T12:00:00.000Z")
    expect(initialNextDue(anchor).toISOString()).toBe(
      "2026-10-01T12:00:00.000Z"
    )
  })

  test("pago 2026-09-15 → next 2026-10-15", () => {
    const paid = new Date("2026-09-15T12:00:00.000Z")
    expect(nextDueAfterPayment(paid).toISOString()).toBe(
      "2026-10-15T12:00:00.000Z"
    )
  })
})

describe("shouldSetInitialNextDue", () => {
  test("true si no hay last_payment y no hay next_due", () => {
    expect(
      shouldSetInitialNextDue({ lastPaymentAt: null, nextDueAt: null })
    ).toBe(true)
  })

  test("false si ya hay pago o next_due", () => {
    expect(
      shouldSetInitialNextDue({
        lastPaymentAt: new Date("2026-09-15T12:00:00.000Z"),
        nextDueAt: null,
      })
    ).toBe(false)
    expect(
      shouldSetInitialNextDue({
        lastPaymentAt: null,
        nextDueAt: new Date("2026-10-15T12:00:00.000Z"),
      })
    ).toBe(false)
  })
})
