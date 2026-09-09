import type {
  BillingStatus,
  JsonResult,
  SqlTagged,
} from "@/modules/admin/lib/types"
import { addOneMonthUTC } from "@/shell/billing/cycle"
import { monthlyAmountCentsForModuleCount } from "@/shell/billing/pricing"

export type AdminBillingDeps = {
  sql: SqlTagged
  now?: () => Date
}

const VALID_STATUS = new Set<BillingStatus>(["al_dia", "pendiente", "vencido"])

async function loadActiveModules(
  sql: SqlTagged,
  businessId: string
): Promise<string[] | null> {
  const rows = (await sql`
    SELECT id, active_modules FROM businesses WHERE id = ${businessId} LIMIT 1
  `) as { id: string; active_modules: string[] | null }[]
  if (!rows[0]) return null
  return rows[0].active_modules ?? []
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

  const modules = await loadActiveModules(deps.sql, businessId)
  if (modules == null) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  const expected = monthlyAmountCentsForModuleCount(modules.length)
  const amount =
    input.amountCents == null ? expected : Number(input.amountCents)
  if (!Number.isFinite(amount) || amount < 0) {
    return { status: 400, body: { error: "amountCents inválido." } }
  }

  const now = deps.now?.() ?? new Date()
  const nextDue = addOneMonthUTC(now)
  const note = input.note?.trim() || null
  const adminId = input.adminUserId ?? null

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
      ${expected},
      ${"al_dia"},
      ${now},
      ${nextDue},
      ${now}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      monthly_amount_cents = ${expected},
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

  const modules = await loadActiveModules(deps.sql, businessId)
  if (modules == null) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  const expected = monthlyAmountCentsForModuleCount(modules.length)
  const now = deps.now?.() ?? new Date()

  await deps.sql`
    INSERT INTO business_billing (
      business_id,
      monthly_amount_cents,
      status,
      updated_at
    )
    VALUES (
      ${businessId},
      ${expected},
      ${status},
      ${now}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      monthly_amount_cents = ${expected},
      status = ${status},
      updated_at = ${now}
  `

  return { status: 200, body: { status } }
}
