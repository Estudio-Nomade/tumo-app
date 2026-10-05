import { createFakeMercadoPagoProvider } from "@/shell/billing/provider/fake"
import type { PaymentProvider } from "@/shell/billing/provider/types"
import {
  resolveBillingProviderMode,
  type BillingProviderMode,
} from "@/modules/signup/lib/flags"

export function createBillingProvider(
  mode: BillingProviderMode = resolveBillingProviderMode()
): PaymentProvider {
  if (mode === "mercadopago") {
    // Real adapter not shipped yet — fall back to fake so local never 500s.
    return createFakeMercadoPagoProvider({
      redirectBase: "https://www.mercadopago.com.ar/checkout/v1/redirect",
    })
  }
  return createFakeMercadoPagoProvider({
    redirectBase: "http://localhost:3000/api/billing/fake-checkout",
  })
}
