import { createFakeMercadoPagoProvider } from "@/shell/billing/provider/fake"
import { createMercadoPagoProvider } from "@/shell/billing/provider/mercadopago"
import type { PaymentProvider } from "@/shell/billing/provider/types"
import {
  resolveBillingProviderMode,
  type BillingProviderMode,
} from "@/modules/signup/lib/flags"

export type CreateBillingProviderOpts = {
  mode?: BillingProviderMode
  env?: Record<string, string | undefined>
  /** Inject fetch for tests of real adapter wiring */
  fetch?: typeof fetch
}

export function createBillingProvider(
  modeOrOpts:
    | BillingProviderMode
    | CreateBillingProviderOpts = resolveBillingProviderMode()
): PaymentProvider {
  const opts: CreateBillingProviderOpts =
    typeof modeOrOpts === "string" ? { mode: modeOrOpts } : (modeOrOpts ?? {})
  const env = opts.env ?? (process.env as Record<string, string | undefined>)
  const mode = opts.mode ?? resolveBillingProviderMode(env)

  if (mode === "mercadopago") {
    const token = (env.MP_ACCESS_TOKEN ?? "").trim()
    if (!token) {
      // Misconfigured — stay local-safe rather than 500 on every checkout.
      return createFakeMercadoPagoProvider({
        redirectBase: "http://localhost:3000/api/billing/fake-checkout",
      })
    }
    return createMercadoPagoProvider({
      accessToken: token,
      webhookSecret: (env.MP_WEBHOOK_SECRET ?? "").trim() || undefined,
      preferSandbox:
        (env.MP_PREFER_SANDBOX ?? "").trim().toLowerCase() === "true" ||
        token.startsWith("TEST-"),
      fetch: opts.fetch,
    })
  }

  return createFakeMercadoPagoProvider({
    redirectBase: "http://localhost:3000/api/billing/fake-checkout",
  })
}
