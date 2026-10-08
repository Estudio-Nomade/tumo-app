/** Feature flags / provider selection for self-serve signup. */

function truthy(raw: string | undefined): boolean | null {
  const v = (raw ?? "").trim().toLowerCase()
  if (!v) return null
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true
  if (v === "false" || v === "0" || v === "no" || v === "off") return false
  return null
}

/**
 * Self-serve checkout CTA (/signup) vs WhatsApp.
 * - Explicit SELF_SERVICE_SIGNUP / NEXT_PUBLIC_… wins
 * - development defaults ON (local pay path without env gymnastics)
 * - production defaults OFF until flag is set
 */
export function isSelfServiceSignupEnabled(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): boolean {
  const server = truthy(env.SELF_SERVICE_SIGNUP)
  if (server !== null) return server
  const pub = truthy(env.NEXT_PUBLIC_SELF_SERVICE_SIGNUP)
  if (pub !== null) return pub
  return (env.NODE_ENV ?? "").trim() === "development"
}

export function planCheckoutHref(input: {
  enabled: boolean
  planId: string
  waHref: string
}): string {
  if (!input.enabled) return input.waHref
  return `/signup?plan=${encodeURIComponent(input.planId)}`
}

export type BillingProviderMode = "fake" | "mercadopago"

export function resolveBillingProviderMode(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): BillingProviderMode {
  const forced = (env.BILLING_PROVIDER ?? "").trim().toLowerCase()
  if (forced === "fake") return "fake"
  const token = (env.MP_ACCESS_TOKEN ?? "").trim()
  if (forced === "mercadopago" && token) return "mercadopago"
  return "fake"
}

export function appBaseUrl(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): string {
  return (
    env.APP_BASE_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "")
}
