import { describe, expect, test } from "bun:test"
import {
  FULFILLMENT_OPTIONS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  formatCents,
  initialPaymentStatus,
} from "@/modules/orders/lib/types"

describe("initialPaymentStatus", () => {
  test("at_pickup → unpaid", () => {
    expect(initialPaymentStatus("at_pickup")).toBe("unpaid")
  })
  test("transfer → pending_receipt", () => {
    expect(initialPaymentStatus("transfer")).toBe("pending_receipt")
  })
})

describe("formatCents", () => {
  test("miles con separador de punto (es-AR)", () => {
    expect(formatCents(0)).toBe("0")
    expect(formatCents(999)).toBe("999")
    expect(formatCents(4500)).toBe("4.500")
    expect(formatCents(12500)).toBe("12.500")
    expect(formatCents(1000000)).toBe("1.000.000")
  })
  test("negativos llevan signo (deltas de variantes)", () => {
    expect(formatCents(-800)).toBe("-800")
  })
})

describe("constantes del dominio", () => {
  test("estados de la comida", () => {
    expect(ORDER_STATUSES).toEqual([
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ])
  })
  test("métodos de pago sin mercadopago", () => {
    expect(PAYMENT_METHODS).toEqual(["transfer", "at_pickup"])
    expect(PAYMENT_METHODS).not.toContain("mercadopago")
  })
  test("estados del dinero", () => {
    expect(PAYMENT_STATUSES).toEqual([
      "unpaid",
      "pending",
      "pending_receipt",
      "pending_verification",
      "paid",
      "rejected",
    ])
  })
  test("fulfillment", () => {
    expect(FULFILLMENT_OPTIONS).toEqual(["pickup", "delivery"])
  })
})
