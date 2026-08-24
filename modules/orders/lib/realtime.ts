import { createClient } from "@supabase/supabase-js"
import type { PaymentMethod, PaymentStatus } from "@/modules/orders/lib/types"

/**
 * ¿El pago de este pedido sigue a la espera de una confirmación externa?
 * - mercadopago + pending: espera el webhook de MP.
 * - transfer + pending_verification: espera que el empleado apruebe el comprobante.
 */
export function shouldTrackPayment(
  method: PaymentMethod,
  status: PaymentStatus
): boolean {
  return (
    (method === "mercadopago" && status === "pending") ||
    (method === "transfer" && status === "pending_verification")
  )
}

export type OrdersChannel = { unsubscribe: () => void }

export type OrdersChannelConfig = {
  name: string
  event: "INSERT" | "UPDATE" | "*"
  filter?: string
  onUpdate: () => void
}

/**
 * Suscripción Supabase Realtime a cambios en la tabla `orders`.
 * Sin env configurado devuelve un no-op (los callers ya tienen polling de respaldo).
 */
export function createOrdersChannel(
  config: OrdersChannelConfig
): OrdersChannel {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return { unsubscribe: () => {} }

  const client = createClient(url, key)
  const channel = client
    .channel(config.name)
    .on(
      "postgres_changes",
      {
        event: config.event,
        schema: "public",
        table: "orders",
        filter: config.filter,
      },
      () => config.onUpdate()
    )
    .subscribe()

  return {
    unsubscribe: () => {
      void client.removeChannel(channel)
    },
  }
}
