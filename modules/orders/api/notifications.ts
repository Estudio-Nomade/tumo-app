import { toE164 } from "@/lib/phone"
import type { SqlTagged } from "@/modules/orders/lib/types"

/**
 * Eventos que disparan una notificación al cliente al cambiar el estado de su
 * pedido. Extensible: para email se agrega otro transport en `NotifyDeps`.
 */
export type OrderStatusEvent =
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "rejected"

export type NotifyDeps = {
  sql: SqlTagged
  sendWhatsApp: (phone: string, message: string) => Promise<void>
}

type NotifyRow = {
  order_number: number
  customer_phone: string | null
  business_name: string
}

/** Mapea un estado (`status` o `payment_status`) al evento notificable, o null. */
export function eventForStatus(status: string): OrderStatusEvent | null {
  switch (status) {
    case "confirmed":
    case "preparing":
    case "ready":
    case "completed":
    case "rejected":
      return status
    default:
      return null
  }
}

/** Mensaje llano (elderly-UX) para cada evento. */
export function orderStatusMessage(
  event: OrderStatusEvent,
  orderNumber: number,
  businessName: string
): string {
  const body: Record<OrderStatusEvent, string> = {
    confirmed: `Confirmamos tu pedido #${orderNumber}. Ya lo preparamos.`,
    preparing: `Tu pedido #${orderNumber} está en preparación.`,
    ready: `Tu pedido #${orderNumber} está listo. Pasá a buscarlo.`,
    completed: `Entregamos tu pedido #${orderNumber}. ¡Gracias por tu compra!`,
    rejected: `No pudimos verificar el comprobante de tu pedido #${orderNumber}. Subí una foto nueva, por favor.`,
  }
  return `${businessName}: ${body[event]}`
}

/**
 * Notifica al cliente el cambio de estado de su pedido por WhatsApp.
 * Best-effort: nunca lanza; un fallo de notificación no debe romper el pedido.
 */
export async function notifyOrderStatusChange(
  deps: NotifyDeps,
  input: { orderId: string; newStatus: string }
): Promise<void> {
  const event = eventForStatus(input.newStatus)
  if (!event) return

  try {
    const rows = (await deps.sql`
      SELECT o.order_number, c.phone AS customer_phone, b.name AS business_name
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN businesses b ON b.id = o.business_id
      WHERE o.id = ${input.orderId}
      LIMIT 1
    `) as NotifyRow[]
    const row = rows[0]
    if (!row || !row.customer_phone) return

    const message = orderStatusMessage(
      event,
      Number(row.order_number),
      row.business_name
    )
    await deps.sendWhatsApp(toE164(row.customer_phone), message)
  } catch {
    // best-effort: una notificación fallida no revierte el cambio de estado.
  }
}
