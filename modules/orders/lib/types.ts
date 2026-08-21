export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"

export type PaymentMethod = "transfer" | "mercadopago" | "at_pickup"

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "pending_receipt"
  | "pending_verification"
  | "paid"
  | "rejected"

export type Fulfillment = "pickup" | "delivery"

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const satisfies readonly OrderStatus[]

export const PAYMENT_METHODS = [
  "transfer",
  "mercadopago",
  "at_pickup",
] as const satisfies readonly PaymentMethod[]

export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "pending_receipt",
  "pending_verification",
  "paid",
  "rejected",
] as const satisfies readonly PaymentStatus[]

export const FULFILLMENT_OPTIONS = [
  "pickup",
  "delivery",
] as const satisfies readonly Fulfillment[]

const INITIAL_PAYMENT_STATUS: Record<PaymentMethod, PaymentStatus> = {
  at_pickup: "unpaid",
  transfer: "pending_receipt",
  mercadopago: "pending",
}

/** payment_status inicial según el método elegido al crear el pedido. */
export function initialPaymentStatus(method: PaymentMethod): PaymentStatus {
  return INITIAL_PAYMENT_STATUS[method]
}

/** Centavos → "4.500" (es-AR, separador de miles `.`). */
export function formatCents(cents: number): string {
  const n = Math.round(cents)
  const abs = Math.abs(n).toString()
  const withSep = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return (n < 0 ? "-" : "") + withSep
}

export type SqlTagged = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>) & {
  begin?: <T>(fn: (sql: SqlTagged) => Promise<T>) => Promise<T>
}

export type JsonResult = {
  status: number
  body: Record<string, unknown>
}

export async function withTransaction<T>(
  sql: SqlTagged,
  fn: (tx: SqlTagged) => Promise<T>
): Promise<T> {
  if (typeof sql.begin === "function") {
    return sql.begin(fn)
  }
  return fn(sql)
}
