/** Public customer registration / card entry URL for a business. */
export function getLoyaltyPublicPath(slug: string): string {
  const s = slug.trim().replace(/^\/+|\/+$/g, "")
  if (!s) return "/loyalty"
  return `/${s}/loyalty`
}

export function getLoyaltyPublicUrl(origin: string, slug: string): string {
  const base = origin.trim().replace(/\/+$/, "")
  return `${base}${getLoyaltyPublicPath(slug)}`
}

export function getLoyaltyDisplayUrl(origin: string, slug: string): string {
  const url = getLoyaltyPublicUrl(origin, slug)
  return url.replace(/^https?:\/\//, "")
}
