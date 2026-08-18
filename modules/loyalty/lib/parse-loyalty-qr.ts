export type ParsedLoyaltyQr =
  | { kind: "customer"; slug: string; code: string }
  | { kind: "register"; slug: string }

/** Parse QR text: absolute or path-only loyalty URLs. */
export function parseLoyaltyQr(
  raw: string,
  expectedSlug?: string
): ParsedLoyaltyQr | null {
  const text = raw.trim()
  if (!text) return null

  let pathname = text
  try {
    if (/^https?:\/\//i.test(text)) {
      pathname = new URL(text).pathname
    } else if (text.startsWith("//")) {
      pathname = new URL(`https:${text}`).pathname
    }
  } catch {
    return null
  }

  pathname = pathname.replace(/\/+$/, "") || "/"
  const customer = pathname.match(/^\/([^/]+)\/loyalty\/c\/(\d{4})$/)
  if (customer) {
    const slug = customer[1]!
    const code = customer[2]!
    if (expectedSlug && slug !== expectedSlug) return null
    return { kind: "customer", slug, code }
  }

  const register = pathname.match(/^\/([^/]+)\/loyalty$/)
  if (register) {
    const slug = register[1]!
    if (expectedSlug && slug !== expectedSlug) return null
    return { kind: "register", slug }
  }

  return null
}

export function customerLoyaltyQrPath(slug: string, code: string): string {
  return `/${slug}/loyalty/c/${code}`
}
