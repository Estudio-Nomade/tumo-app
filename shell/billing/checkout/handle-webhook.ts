import type { SqlTagged } from "@/modules/admin/lib/types"
import {
  applyProviderEvent,
  type ApplyProviderEventDeps,
  type ApplyProviderEventResult,
} from "@/shell/billing/checkout/apply-event"
import type { PaymentProvider } from "@/shell/billing/provider/types"

export type HandleMercadoPagoWebhookDeps = {
  sql: SqlTagged
  provider: PaymentProvider
  providerName?: string
  now?: () => Date
  newId?: () => string
  ownerPhonePlaceholder?: ApplyProviderEventDeps["ownerPhonePlaceholder"]
}

export type HandleWebhookResult =
  | ApplyProviderEventResult
  | { status: 401; body: { error: string; code: string } }
  | { status: 400; body: { error: string; code: string } }

export async function handleMercadoPagoWebhook(
  deps: HandleMercadoPagoWebhookDeps,
  input: {
    rawBody: string
    headers: Headers | Record<string, string>
  }
): Promise<HandleWebhookResult> {
  let event
  try {
    event = await deps.provider.parseAndVerifyWebhook(
      input.rawBody,
      input.headers
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("invalid_signature")) {
      return {
        status: 401,
        body: { error: "Firma inválida.", code: "invalid_signature" },
      }
    }
    if (msg.includes("invalid_json")) {
      return {
        status: 400,
        body: { error: "JSON inválido.", code: "invalid_json" },
      }
    }
    return {
      status: 400,
      body: { error: msg.slice(0, 200), code: "webhook_parse" },
    }
  }

  return applyProviderEvent(
    {
      sql: deps.sql,
      providerName: deps.providerName ?? deps.provider.name ?? "mercadopago",
      now: deps.now,
      newId: deps.newId,
      ownerPhonePlaceholder: deps.ownerPhonePlaceholder,
    },
    event
  )
}
