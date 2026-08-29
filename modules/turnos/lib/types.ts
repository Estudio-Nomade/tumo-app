export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled"

export type TurnosPaymentMethod = "transfer" | "at_location"

export type TurnosPaymentStatus =
  | "unpaid"
  | "pending_receipt"
  | "pending_verification"
  | "paid"
  | "rejected"

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

export function formatCents(cents: number): string {
  const n = Math.round(cents)
  const abs = Math.abs(n).toString()
  const withSep = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return (n < 0 ? "-" : "") + withSep
}

export function initialPaymentStatus(
  method: TurnosPaymentMethod
): TurnosPaymentStatus {
  if (method === "transfer") return "pending_receipt"
  return "unpaid"
}
