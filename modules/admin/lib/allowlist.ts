import { normalizePhone, phonesMatch } from "@/lib/phone"

/** Parse TUMO_ADMIN_PHONES (CSV) + optional TUMO_ADMIN_PHONE. */
export function parseAdminAllowlist(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const multi = env.TUMO_ADMIN_PHONES ?? ""
  const single = env.TUMO_ADMIN_PHONE ?? ""
  const raw = `${multi},${single}`
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
  const digits = raw.map((p) => normalizePhone(p)).filter(Boolean)
  return [...new Set(digits)]
}

export function isAdminPhoneAllowed(
  phone: string,
  allowlist: string[] = parseAdminAllowlist()
): boolean {
  const digits = normalizePhone(phone)
  if (!digits || allowlist.length === 0) return false
  return allowlist.some((allowed) => phonesMatch(digits, allowed))
}
