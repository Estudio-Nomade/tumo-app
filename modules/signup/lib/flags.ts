/** Feature flags / provider selection for self-serve signup. */

export function isSelfServiceSignupEnabled(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): boolean {
  const v = (env.SELF_SERVICE_SIGNUP ?? "").trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
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
