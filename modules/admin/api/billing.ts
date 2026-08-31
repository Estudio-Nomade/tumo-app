import type {
  BillingStatus,
  JsonResult,
  SqlTagged,
} from "@/modules/admin/lib/types"
import { DEFAULT_MONTHLY_AMOUNT_CENTS } from "@/modules/admin/lib/types"

export type AdminBillingDeps = {
  sql: SqlTagged
  now?: () => Date
}

const VALID_STATUS = new Set<BillingStatus>(["al_dia", "pendiente", "vencido"])

function addOneMonth(d: Date): Date {
  const next = new Date(d.getTime())
  next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

export async function markPaid(
  deps: AdminBillingDeps,
  input: {
    businessId?: string
    amountCents?: number
    note?: string
    adminUserId?: string | null
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const amount =
    input.amountCents == null
      ? DEFAULT_MONTHLY_AMOUNT_CENTS
      : Number(input.amountCents)
  if (!Number.isFinite(amount) || amount < 0) {
    return { status: 400, body: { error: "amountCents inválido." } }
  }

  const now = deps.now?.() ?? new Date()
  const nextDue = addOneMonth(now)
  const note = input.note?.trim() || null
  const adminId = input.adminUserId ?? null

  const exists = (await deps.sql`
    SELECT id FROM businesses WHERE id = ${businessId} LIMIT 1
  `) as { id: string }[]
  if (!exists[0]) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  await deps.sql`
    INSERT INTO business_billing (
      business_id,
      monthly_amount_cents,
      status,
      last_payment_at,
      next_due_at,
      updated_at
    )
    VALUES (
      ${businessId},
      ${DEFAULT_MONTHLY_AMOUNT_CENTS},
      ${"al_dia"},
      ${now},
      ${nextDue},
      ${now}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      status = ${"al_dia"},
      last_payment_at = ${now},
      next_due_at = ${nextDue},
      updated_at = ${now}
  `

  const payments = (await deps.sql`
    INSERT INTO business_billing_payments (
      business_id,
      amount_cents,
      paid_at,
      marked_by_admin_id,
      note
    )
    VALUES (
      ${businessId},
      ${amount},
      ${now},
      ${adminId},
      ${note}
    )
    RETURNING id, amount_cents, paid_at, note
  `) as {
    id: string
    amount_cents: number
    paid_at: Date | string
    note: string | null
  }[]

  return {
    status: 200,
    body: {
      status: "al_dia" as BillingStatus,
      last_payment_at:
        now instanceof Date ? now.toISOString() : String(now),
      next_due_at: nextDue.toISOString(),
      payment: {
        id: payments[0]?.id,
        amount_cents: amount,
        paid_at: now.toISOString(),
        note,
      },
    },
  }
}

export async function setBillingStatus(
  deps: AdminBillingDeps,
  input: { businessId?: string; status?: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const status = (input.status?.trim() ?? "") as BillingStatus

  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }
  if (!VALID_STATUS.has(status)) {
    return {
      status: 400,
      body: { error: "status inválido.", allowed: [...VALID_STATUS] },
    }
  }

  const now = deps.now?.() ?? new Date()

  const exists = (await deps.sql`
    SELECT id FROM businesses WHERE id = ${businessId} LIMIT 1
  `) as { id: string }[]
  if (!exists[0]) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  await deps.sql`
    INSERT INTO business_billing (
      business_id,
      monthly_amount_cents,
      status,
      updated_at
    )
    VALUES (
      ${businessId},
      ${DEFAULT_MONTHLY_AMOUNT_CENTS},
      ${status},
      ${now}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      status = ${status},
      updated_at = ${now}
  `

  return { status: 200, body: { status } }
}
