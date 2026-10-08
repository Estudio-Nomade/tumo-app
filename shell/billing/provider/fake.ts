import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  ProviderEvent,
} from "@/shell/billing/provider/types"

/** In-memory / test double — no network. */
export function createFakeMercadoPagoProvider(opts?: {
  redirectBase?: string
}): PaymentProvider {
  const redirectBase = opts?.redirectBase ?? "https://mp.test/checkout"
  return {
    name: "mercadopago_fake",
    async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
      const providerCheckoutId = `pref_fake_${input.externalReference.slice(0, 8)}`
      return {
        providerCheckoutId,
        redirectUrl: `${redirectBase}/${providerCheckoutId}?ext=${encodeURIComponent(input.externalReference)}`,
      }
    },
    async parseAndVerifyWebhook(
      rawBody: string,
      _headers?: Headers | Record<string, string>
    ): Promise<ProviderEvent> {
      void _headers
      const data = JSON.parse(rawBody) as {
        type?: string
        external_reference?: string
        id?: string
        status?: string
      }
      const externalReference = data.external_reference ?? ""
      const providerEventId = String(data.id ?? `evt_${Date.now()}`)
      if (data.status === "approved" || data.type === "payment_succeeded") {
        return {
          type: "payment_succeeded",
          providerEventId,
          externalReference,
          providerPaymentId: providerEventId,
          raw: data,
        }
      }
      if (data.status === "rejected" || data.type === "payment_failed") {
        return {
          type: "payment_failed",
          providerEventId,
          externalReference,
          raw: data,
        }
      }
      return {
        type: "payment_pending",
        providerEventId,
        externalReference,
        raw: data,
      }
    },
  }
}
