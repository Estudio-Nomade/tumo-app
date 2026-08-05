/** Digits only — used for storage and equality checks. */
export function normalizePhone(input: string): string {
  return (input ?? "").replace(/\D/g, "")
}

/** E.164-ish for SMS providers: + and digits. */
export function toE164(input: string): string {
  const digits = normalizePhone(input)
  if (!digits) return ""
  return `+${digits}`
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a)
  const nb = normalizePhone(b)
  if (!na || !nb) return false
  return na === nb || na.endsWith(nb) || nb.endsWith(na)
}

/** Display helper: +54 9 11 ••••5678 */
export function maskPhone(input: string): string {
  const digits = normalizePhone(input)
  if (!digits) return ""
  if (digits.length <= 4) return `••••${digits}`
  const tail = digits.slice(-4)
  const head = digits.slice(0, Math.min(4, digits.length - 4))
  return `+${head} ••••${tail}`
}
