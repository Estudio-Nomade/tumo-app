export type CycleSub = {
  status: "active" | "inactive" | string
  billing_anchor_at: Date | string
}

export function addOneMonthUTC(d: Date): Date {
  const next = new Date(d.getTime())
  next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

/** Date-only YYYY-MM-DD → UTC noon; full ISO kept as-is. */
export function parseDateOnlyToUtcNoon(input: string): Date | null {
  const raw = input.trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function asDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v)
}

export function businessAnchor(subs: CycleSub[]): Date | null {
  let min: Date | null = null
  for (const s of subs) {
    if (s.status !== "active") continue
    const t = asDate(s.billing_anchor_at)
    if (Number.isNaN(t.getTime())) continue
    if (!min || t.getTime() < min.getTime()) min = t
  }
  return min
}

export function initialNextDue(anchor: Date): Date {
  return addOneMonthUTC(anchor)
}

export function nextDueAfterPayment(paidAt: Date): Date {
  return addOneMonthUTC(paidAt)
}

/** Solo setear next_due inicial si el negocio aún no tiene reloj de cobro. */
export function shouldSetInitialNextDue(input: {
  lastPaymentAt: Date | string | null | undefined
  nextDueAt: Date | string | null | undefined
}): boolean {
  return input.lastPaymentAt == null && input.nextDueAt == null
}
