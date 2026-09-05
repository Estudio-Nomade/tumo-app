import { describe, expect, test } from "bun:test"
import { pendingOrderBanner } from "@/modules/orders/lib/pending-order"

describe("pendingOrderBanner", () => {
  test("transfer pending_verification → mensaje de comprobante", () => {
    expect(pendingOrderBanner("transfer", "pending_verification")).toBe(
      "Tenés un pedido esperando la foto del comprobante."
    )
  })

  test("transfer pending_receipt → banner para volver a subir la foto", () => {
    expect(pendingOrderBanner("transfer", "pending_receipt")).toMatch(/comprobante/)
  })

  test("transfer rejected → banner para re-subir", () => {
    expect(pendingOrderBanner("transfer", "rejected")).toMatch(/otra foto|comprobante/)
  })

  test("transfer paid → null", () => {
    expect(pendingOrderBanner("transfer", "paid")).toBeNull()
  })

  test("at_pickup unpaid → null", () => {
    expect(pendingOrderBanner("at_pickup", "unpaid")).toBeNull()
  })
})
