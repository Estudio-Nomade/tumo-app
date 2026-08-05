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
