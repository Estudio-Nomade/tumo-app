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

/** Cambio en la tabla `orders` normalizado a lo mínimo que usa el cliente. */
export type OrdersChange = {
  eventType: string
  orderNumber: number | null
}

export type OrdersChannelConfig = {
  name: string
  event: "INSERT" | "UPDATE" | "*"
  filter?: string
  onChange: (change: OrdersChange) => void
}

/** ¿Es un pedido recién creado (INSERT con número)? */
export function isNewOrder(change: OrdersChange): boolean {
  return change.eventType === "INSERT" && change.orderNumber != null
}

/** Mensaje de toast para un pedido nuevo (elderly-UX: lenguaje llano). */
export function newOrderToastMessage(orderNumber: number): string {
  return `Nuevo pedido recibido #${orderNumber}`
}

/** Normaliza el payload de Supabase Realtime a un `OrdersChange` testable. */
export function toOrdersChange(payload: {
  eventType?: string
  new?: { order_number?: number | string } | null
}): OrdersChange {
  return {
    eventType: payload?.eventType ?? "",
    orderNumber:
      payload?.new?.order_number != null ? Number(payload.new.order_number) : null,
  }
}

/**
 * Suscripción Supabase Realtime a cambios en la tabla `orders`.
 * Sin env configurado, o si la suscripción falla, devuelve un no-op
 * (los callers ya tienen polling de respaldo).
 */
export function createOrdersChannel(
  config: OrdersChannelConfig
): OrdersChannel {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return { unsubscribe: () => {} }

  try {
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
        (payload) => config.onChange(toOrdersChange(payload))
      )
      .subscribe()

    return {
      unsubscribe: () => {
        void client.removeChannel(channel)
      },
    }
  } catch {
    return { unsubscribe: () => {} }
  }
}
