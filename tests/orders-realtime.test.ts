import { describe, expect, test } from "bun:test"
import {
  createOrdersChannel,
  isNewOrder,
  newOrderToastMessage,
  shouldTrackPayment,
  toOrdersChange,
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

describe("isNewOrder", () => {
  test("INSERT con número de pedido es un pedido nuevo", () => {
    expect(isNewOrder({ eventType: "INSERT", orderNumber: 123 })).toBe(true)
  })
  test("UPDATE no es un pedido nuevo", () => {
    expect(isNewOrder({ eventType: "UPDATE", orderNumber: 123 })).toBe(false)
  })
  test("INSERT sin número no es un pedido nuevo", () => {
    expect(isNewOrder({ eventType: "INSERT", orderNumber: null })).toBe(false)
  })
})

describe("newOrderToastMessage", () => {
  test("compone el mensaje de toast con el número", () => {
    expect(newOrderToastMessage(123)).toBe("Nuevo pedido recibido #123")
  })
})

describe("toOrdersChange", () => {
  test("extrae eventType y order_number del payload de Supabase", () => {
    expect(
      toOrdersChange({ eventType: "INSERT", new: { order_number: 17 } })
    ).toEqual({ eventType: "INSERT", orderNumber: 17 })
  })
  test("order_number ausente → null", () => {
    expect(toOrdersChange({ eventType: "UPDATE", new: {} })).toEqual({
      eventType: "UPDATE",
      orderNumber: null,
    })
  })
  test("payload sin new → null", () => {
    expect(toOrdersChange({ eventType: "DELETE" })).toEqual({
      eventType: "DELETE",
      orderNumber: null,
    })
  })
})

describe("createOrdersChannel", () => {
  test("sin env configurado devuelve un no-op que no lanza", () => {
    const channel = createOrdersChannel({
      name: "test",
      event: "UPDATE",
      onChange: () => {},
    })
    expect(channel.unsubscribe).toBeTypeOf("function")
    expect(() => channel.unsubscribe()).not.toThrow()
  })
})
