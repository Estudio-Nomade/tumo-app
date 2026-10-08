import { createHmac, timingSafeEqual } from "node:crypto"
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  ProviderEvent,
  ProviderEventType,
} from "@/shell/billing/provider/types"

const MP_API = "https://api.mercadopago.com"

export type MercadoPagoProviderOpts = {
  accessToken: string
  webhookSecret?: string
  /** Prefer sandbox_init_point when present (TEST tokens / local). */
  preferSandbox?: boolean
  fetch?: typeof fetch
}

export type PreferenceBody = {
  items: {
    title: string
    quantity: number
    unit_price: number
    currency_id: string
  }[]
  external_reference: string
  back_urls: { success: string; failure: string; pending: string }
  notification_url: string
  /** Only valid when back_urls.success is public HTTPS (MP rejects localhost). */
  auto_return?: "approved"
  payer?: {
    email?: string
    name?: string
    identification?: { type: string; number: string }
  }
}

export function buildPreferenceBody(input: CreateCheckoutInput): PreferenceBody {
  const unit_price = Number(input.amountArsCents) / 100
  const body: PreferenceBody = {
    items: [
      {
        title: input.title,
        quantity: 1,
        unit_price,
        currency_id: "ARS",
      },
    ],
    external_reference: input.externalReference,
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.pendingUrl,
    },
    notification_url: input.notificationUrl,
  }
  // MP: auto_return requires a defined HTTPS success URL (localhost → 400 invalid_auto_return)
  if (input.successUrl.trim().toLowerCase().startsWith("https://")) {
    body.auto_return = "approved"
  }
  if (input.payerEmail || input.payerName || input.payerDocument) {
    body.payer = {}
    if (input.payerEmail) body.payer.email = input.payerEmail
    if (input.payerName) body.payer.name = input.payerName
    const doc = (input.payerDocument ?? "").trim()
    if (doc) {
      body.payer.identification = {
        type: doc.length > 8 ? "CUIT" : "DNI",
        number: doc,
      }
    }
  }
  return body
}

export function mapPaymentStatusToEventType(
  status: string
): ProviderEventType {
  const s = (status ?? "").toLowerCase()
  if (s === "approved") return "payment_succeeded"
  if (s === "rejected" || s === "cancelled" || s === "refunded") {
    return "payment_failed"
  }
  return "payment_pending"
}

/**
 * MP x-signature: ts=…,v1=hex(hmac_sha256(secret, "id:{data.id};request-id:{x-request-id};ts:{ts};"))
 * Empty secret → skip verification (local/dev only).
 */
export function verifyMercadoPagoWebhookSignature(input: {
  secret: string
  rawBody: string
  xSignature: string | null
  xRequestId: string | null
  dataId?: string | null
}): boolean {
  const secret = (input.secret ?? "").trim()
  if (!secret) return true
  const sigHeader = (input.xSignature ?? "").trim()
  if (!sigHeader) return false

  let dataId = (input.dataId ?? "").trim()
  if (!dataId) {
    try {
      const parsed = JSON.parse(input.rawBody) as {
        data?: { id?: string | number }
      }
      dataId = String(parsed.data?.id ?? "")
    } catch {
      dataId = ""
    }
  }
  if (!dataId) return false

  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=")
      return [k?.trim() ?? "", rest.join("=").trim()]
    })
  ) as Record<string, string>
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const requestId = (input.xRequestId ?? "").trim()
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expected = createHmac("sha256", secret).update(manifest).digest("hex")
  try {
    const a = Buffer.from(expected, "hex")
    const b = Buffer.from(v1, "hex")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function headerGet(
  headers: Headers | Record<string, string> | undefined,
  name: string
): string | null {
  if (!headers) return null
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name)
  }
  const rec = headers as Record<string, string>
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(rec)) {
    if (k.toLowerCase() === lower) return v
  }
  return null
}

export function createMercadoPagoProvider(
  opts: MercadoPagoProviderOpts
): PaymentProvider {
  const token = (opts.accessToken ?? "").trim()
  if (!token) {
    throw new Error("MP_ACCESS_TOKEN required for mercadopago provider")
  }
  const fetchFn = opts.fetch ?? fetch
  const secret = (opts.webhookSecret ?? "").trim()
  const preferSandbox =
    opts.preferSandbox === true ||
    token.startsWith("TEST-") ||
    process.env.MP_PREFER_SANDBOX === "true"

  return {
    name: "mercadopago",

    async createCheckout(
      input: CreateCheckoutInput
    ): Promise<CreateCheckoutResult> {
      const body = buildPreferenceBody(input)
      const res = await fetchFn(`${MP_API}/checkout/preferences`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      let json: {
        id?: string
        init_point?: string
        sandbox_init_point?: string
        message?: string
      } = {}
      try {
        json = JSON.parse(text) as typeof json
      } catch {
        /* non-json */
      }
      if (!res.ok || !json.id) {
        throw new Error(
          `MP preference failed: ${res.status} ${json.message ?? text.slice(0, 200)}`
        )
      }
      const redirectUrl =
        preferSandbox && json.sandbox_init_point
          ? json.sandbox_init_point
          : json.init_point ?? json.sandbox_init_point
      if (!redirectUrl) {
        throw new Error("MP preference missing init_point")
      }
      return {
        providerCheckoutId: String(json.id),
        redirectUrl,
      }
    },

    async parseAndVerifyWebhook(
      rawBody: string,
      headers?: Headers | Record<string, string>
    ): Promise<ProviderEvent> {
      const xSignature = headerGet(headers, "x-signature")
      const xRequestId = headerGet(headers, "x-request-id")
      if (
        !verifyMercadoPagoWebhookSignature({
          secret,
          rawBody,
          xSignature,
          xRequestId,
        })
      ) {
        throw new Error("invalid_signature")
      }

      let parsed: {
        type?: string
        action?: string
        data?: { id?: string | number }
        id?: string | number
        topic?: string
      } = {}
      try {
        parsed = JSON.parse(rawBody) as typeof parsed
      } catch {
        throw new Error("invalid_json")
      }

      const paymentId = String(parsed.data?.id ?? parsed.id ?? "").trim()
      if (!paymentId) {
        return {
          type: "payment_pending",
          providerEventId: `mp_unknown_${Date.now()}`,
          externalReference: "",
          raw: parsed,
        }
      }

      const payRes = await fetchFn(`${MP_API}/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payText = await payRes.text()
      let payment: {
        id?: string | number
        status?: string
        external_reference?: string | null
        transaction_amount?: number
        currency_id?: string
      } = {}
      try {
        payment = JSON.parse(payText) as typeof payment
      } catch {
        throw new Error(`MP payment fetch bad body: ${payText.slice(0, 120)}`)
      }
      if (!payRes.ok) {
        throw new Error(
          `MP payment fetch failed: ${payRes.status} ${payText.slice(0, 120)}`
        )
      }

      const status = String(payment.status ?? "")
      const type = mapPaymentStatusToEventType(status)
      const id = String(payment.id ?? paymentId)
      return {
        type,
        providerEventId: id,
        externalReference: String(payment.external_reference ?? "").trim(),
        providerPaymentId: id,
        amountCents:
          typeof payment.transaction_amount === "number"
            ? Math.round(payment.transaction_amount * 100)
            : undefined,
        currency: payment.currency_id,
        raw: payment,
      }
    },

    async getPaymentStatus(providerPaymentId: string) {
      const res = await fetchFn(
        `${MP_API}/v1/payments/${encodeURIComponent(providerPaymentId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const raw = await res.json()
      const status = String(
        (raw as { status?: string }).status ?? "other"
      ).toLowerCase()
      const mapped =
        status === "approved"
          ? "approved"
          : status === "rejected" || status === "cancelled"
            ? "rejected"
            : status === "pending" || status === "in_process"
              ? "pending"
              : "other"
      return { status: mapped as "pending" | "approved" | "rejected" | "other", raw }
    },
  }
}
