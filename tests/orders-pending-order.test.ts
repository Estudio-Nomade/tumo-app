import { describe, expect, test } from "bun:test"
import { pendingOrderBanner } from "@/modules/orders/lib/pending-order"

describe("pendingOrderBanner", () => {
  test("transfer pending_verification → mensaje de comprobante", () => {
    expect(pendingOrderBanner("transfer", "pending_verification")).toBe(
      "Tenés un pedido esperando la foto del comprobante."
    )
  })

  test("mercadopago pending → mensaje de espera de pago", () => {
    expect(pendingOrderBanner("mercadopago", "pending")).toBe(
      "Estamos esperando la confirmación de tu pago en MercadoPago."
    )
  })

  test("mercadopago paid → null", () => {
    expect(pendingOrderBanner("mercadopago", "paid")).toBeNull()
  })

  test("mercadopago rejected → null (lo maneja la confirmación)", () => {
    expect(pendingOrderBanner("mercadopago", "rejected")).toBeNull()
  })

  test("transfer pending_receipt → null (la foto la sube el cliente)", () => {
    expect(pendingOrderBanner("transfer", "pending_receipt")).toBeNull()
  })

  test("transfer paid → null", () => {
    expect(pendingOrderBanner("transfer", "paid")).toBeNull()
  })

  test("at_pickup unpaid → null", () => {
    expect(pendingOrderBanner("at_pickup", "unpaid")).toBeNull()
  })
})
