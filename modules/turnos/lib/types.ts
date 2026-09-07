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

/**
 * Muestra precio guardado en turnos (enteros = pesos AR, no centavos US).
 * 12500 → "12.500"
 */
export function formatCents(cents: number): string {
  const n = Math.round(cents)
  const abs = Math.abs(n).toString()
  const withSep = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return (n < 0 ? "-" : "") + withSep
}

/**
 * Input de admin "Precio (pesos)" → entero a guardar en price_cents.
 * "8000" / "8.000" → 8000. No multiplica ×100.
 */
export function parsePesosInput(raw: string): number {
  const t = String(raw ?? "").trim().replace(/\s/g, "")
  if (!t) return NaN
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    return Number(t.replace(/\./g, ""))
  }
  if (/^\d+$/.test(t)) return Number(t)
  if (/^\d+,\d{1,2}$/.test(t)) {
    return Math.round(parseFloat(t.replace(",", ".")))
  }
  if (/^\d+\.\d{1,2}$/.test(t)) {
    return Math.round(parseFloat(t))
  }
  const digits = t.replace(/\D/g, "")
  return digits ? Number(digits) : NaN
}

/** Valor guardado → string para input de edición (sin separadores). */
export function pesosAmountToInput(amount: number): string {
  if (!Number.isFinite(amount)) return ""
  return String(Math.round(amount))
}

export function initialPaymentStatus(
  method: TurnosPaymentMethod
): TurnosPaymentStatus {
  if (method === "transfer") return "pending_receipt"
  return "unpaid"
}
