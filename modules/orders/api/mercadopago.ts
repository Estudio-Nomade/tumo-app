import type { JsonResult, SqlTagged } from "@/modules/orders/lib/types"

export type MpPreferencePayload = {
  items: { title: string; quantity: number; unit_price: number; currency_id: string }[]
  external_reference: string
  back_urls: { success: string; failure: string; pending: string }
  notification_url: string
  auto_return: string
}

export type MpPreferenceResult = { id: string; init_point: string }

export type MpPaymentInfo = {
  id: string
  status: string
  external_reference: string | null
}

export type MercadoPagoDeps = {
  sql: SqlTagged
  createPreference: (payload: MpPreferencePayload) => Promise<MpPreferenceResult>
  getPayment: (paymentId: string) => Promise<MpPaymentInfo | null>
  validateSignature: (rawBody: string, header: string | null) => boolean
}

type OrderRow = {
  id: string
  order_number: number
  total_cents: number
  business_id: string
  status: string
  payment_status: string
}

export async function createPreference(
  deps: MercadoPagoDeps,
  input: { orderId: string; appUrl: string }
): Promise<JsonResult> {
  const orderId = input.orderId?.trim() ?? ""
  if (!orderId) {
    return { status: 400, body: { error: "Id de pedido requerido." } }
  }

  const rows = (await deps.sql`
    SELECT id, order_number, total_cents, business_id, status, payment_status
    FROM orders
    WHERE id = ${orderId}
    LIMIT 1
  `) as OrderRow[]
  const order = rows[0]
  if (!order) {
    return { status: 404, body: { error: "No encontramos ese pedido." } }
  }

  const [biz] = (await deps.sql`
    SELECT slug FROM businesses WHERE id = ${order.business_id} LIMIT 1
  `) as { slug: string }[]
  const slug = biz?.slug ?? ""
  const base = input.appUrl?.trim() ?? ""

  const payload: MpPreferencePayload = {
    items: [
      {
        title: `Pedido #${order.order_number}`,
        quantity: 1,
        unit_price: Number(order.total_cents) / 100,
        currency_id: "ARS",
      },
    ],
    external_reference: order.id,
    back_urls: {
      success: `${base}/${slug}/orders/${order.id}?mp=success`,
      failure: `${base}/${slug}/orders/${order.id}?mp=failure`,
      pending: `${base}/${slug}/orders/${order.id}?mp=pending`,
    },
    notification_url: `${base}/api/orders/mercadopago/webhook`,
    auto_return: "approved",
  }

  const pref = await deps.createPreference(payload)

  await deps.sql`
    INSERT INTO order_payments (order_id, method, status, mp_preference_id)
    VALUES (${order.id}, 'mercadopago', 'pending', ${pref.id})
  `

  return {
    status: 200,
    body: { preferenceId: pref.id, initPoint: pref.init_point },
  }
}

export async function handleWebhook(
  deps: MercadoPagoDeps,
  input: { rawBody: string; signatureHeader: string | null }
): Promise<JsonResult> {
  if (!deps.validateSignature(input.rawBody, input.signatureHeader)) {
    return { status: 401, body: { error: "Firma inválida." } }
  }

  let parsed: { data?: { id?: string } }
  try {
    parsed = JSON.parse(input.rawBody) as { data?: { id?: string } }
  } catch {
    return { status: 400, body: { error: "Body inválido." } }
  }

  const paymentId = parsed.data?.id
  if (!paymentId) {
    return { status: 400, body: { error: "Payment id faltante." } }
  }

  const payment = await deps.getPayment(paymentId)
  if (!payment) {
    return { status: 400, body: { error: "Payment no encontrado." } }
  }

  const orderId = payment.external_reference
  if (!orderId) {
    return { status: 200, body: { ok: true } }
  }

  const dupe = (await deps.sql`
    SELECT id FROM order_payments WHERE mp_payment_id = ${paymentId} LIMIT 1
  `) as { id: string }[]
  if (dupe[0]) {
    return { status: 200, body: { ok: true, duplicated: true } }
  }

  const orders = (await deps.sql`
    SELECT id, status, payment_status FROM orders WHERE id = ${orderId} LIMIT 1
  `) as { id: string; status: string; payment_status: string }[]
  const order = orders[0]
  if (!order) {
    return { status: 200, body: { ok: true } }
  }

  if (payment.status === "approved") {
    const paid = "paid"
    await deps.sql`
      INSERT INTO order_payments (order_id, method, status, mp_payment_id, mp_status)
      VALUES (${order.id}, 'mercadopago', ${paid}, ${paymentId}, 'approved')
    `
    const newStatus = order.status === "pending" ? "confirmed" : order.status
    await deps.sql`
      UPDATE orders SET payment_status = ${paid}, status = ${newStatus}, updated_at = now()
      WHERE id = ${order.id}
    `
    return { status: 200, body: { ok: true } }
  }

  if (payment.status === "rejected") {
    const rejected = "rejected"
    await deps.sql`
      INSERT INTO order_payments (order_id, method, status, mp_payment_id, mp_status)
      VALUES (${order.id}, 'mercadopago', ${rejected}, ${paymentId}, 'rejected')
    `
    await deps.sql`
      UPDATE orders SET payment_status = ${rejected}, updated_at = now()
      WHERE id = ${order.id}
    `
    return { status: 200, body: { ok: true } }
  }

  return { status: 200, body: { ok: true } }
}
