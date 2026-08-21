import { createHmac } from "node:crypto"
import { getBusiness } from "@/shell/db/business"
import { sql } from "@/shell/db/pool"
import type { CatalogDeps } from "@/modules/orders/api/catalog"
import type { OrdersDeps } from "@/modules/orders/api/orders"
import type { ProductsDeps } from "@/modules/orders/api/products"
import type { MetricsDeps } from "@/modules/orders/api/metrics"
import type {
  MercadoPagoDeps,
  MpPreferencePayload,
  MpPreferenceResult,
  MpPaymentInfo,
} from "@/modules/orders/api/mercadopago"
import { generateCustomerCode } from "@/modules/orders/lib/generate-code"
import type { SqlTagged } from "@/modules/orders/lib/types"

const taggedSql = sql as unknown as SqlTagged

const MP_API = "https://api.mercadopago.com"

async function mpCreatePreference(
  payload: MpPreferencePayload
): Promise<MpPreferenceResult> {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("No se pudo crear la preferencia de pago.")
  const data = (await res.json()) as { id: string; init_point: string }
  return { id: data.id, init_point: data.init_point }
}

async function mpGetPayment(paymentId: string): Promise<MpPaymentInfo | null> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    id: string
    status: string
    external_reference: string | null
  }
  return {
    id: data.id,
    status: data.status,
    external_reference: data.external_reference ?? null,
  }
}

function mpValidateSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret || !header) return false
  const parts: Record<string, string> = {}
  for (const pair of header.split(",")) {
    const [k, v] = pair.trim().split("=")
    if (k && v) parts[k] = v
  }
  const ts = parts["ts"]
  const v1 = parts["v1"]
  if (!ts || !v1) return false
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex")
  return v1 === expected
}

export const catalogDeps: CatalogDeps = {
  sql: taggedSql,
  getBusiness,
}

export const ordersDeps: OrdersDeps = {
  sql: taggedSql,
  getBusiness,
  generateCode: generateCustomerCode,
}

export const productsDeps: ProductsDeps = {
  sql: taggedSql,
}

export const metricsDeps: MetricsDeps = {
  sql: taggedSql,
}

export const mercadopagoDeps: MercadoPagoDeps = {
  sql: taggedSql,
  createPreference: mpCreatePreference,
  getPayment: mpGetPayment,
  validateSignature: mpValidateSignature,
}
