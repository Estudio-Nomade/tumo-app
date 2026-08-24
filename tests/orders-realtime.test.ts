import { describe, expect, test } from "bun:test"
import {
  createOrdersChannel,
  shouldTrackPayment,
} from "@/modules/orders/lib/realtime"

describe("shouldTrackPayment", () => {
  test("mercadopago pendiente → sigue mirando (espera el webhook)", () => {
    expect(shouldTrackPayment("mercadopago", "pending")).toBe(true)
  })
  test("mercadopago pagado → deja de mirar", () => {
    expect(shouldTrackPayment("mercadopago", "paid")).toBe(false)
  })
  test("mercadopago rechazado → deja de mirar", () => {
    expect(shouldTrackPayment("mercadopago", "rejected")).toBe(false)
  })
  test("transferencia en verificación → sigue mirando (espera al empleado)", () => {
    expect(shouldTrackPayment("transfer", "pending_verification")).toBe(true)
  })
  test("transferencia esperando comprobante → no (la sube el cliente)", () => {
    expect(shouldTrackPayment("transfer", "pending_receipt")).toBe(false)
  })
  test("transferencia pagada → deja de mirar", () => {
    expect(shouldTrackPayment("transfer", "paid")).toBe(false)
  })
  test("al retirar nunca se mira", () => {
    expect(shouldTrackPayment("at_pickup", "unpaid")).toBe(false)
    expect(shouldTrackPayment("at_pickup", "paid")).toBe(false)
  })
})

describe("createOrdersChannel", () => {
  test("sin env configurado devuelve un no-op que no lanza", () => {
    const channel = createOrdersChannel({
      name: "test",
      event: "UPDATE",
      onUpdate: () => {},
    })
    expect(channel.unsubscribe).toBeTypeOf("function")
    expect(() => channel.unsubscribe()).not.toThrow()
  })
})
