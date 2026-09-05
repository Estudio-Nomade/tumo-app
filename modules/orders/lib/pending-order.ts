import type { PaymentMethod, PaymentStatus } from "@/modules/orders/lib/types"

/**
 * Mensaje de banner para un pedido pendiente del cliente (catálogo público).
 * Devuelve null si el pedido no amerita banner (ya pagado, rechazado, etc.).
 */
export function pendingOrderBanner(
  method: PaymentMethod,
  status: PaymentStatus
): string | null {
  if (method === "transfer" && (status === "pending_receipt" || status === "pending_verification")) {
    return "Tenés un pedido esperando la foto del comprobante."
  }
  if (method === "transfer" && status === "rejected") {
    return "El comprobante no se pudo verificar. Tocá para subir otra foto."
  }
  return null
}
