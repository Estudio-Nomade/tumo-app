import type { BillingStatus, JsonResult, SqlTagged } from "@/modules/admin/lib/types"
import { businessAnchor } from "@/shell/billing/cycle"
import { monthlyAmountCentsForModuleCount } from "@/shell/billing/pricing"
import { planLabel, saasStatusLabel } from "@/shell/billing/plan-catalog"

export type AdminBusinessesDeps = {
  sql: SqlTagged
}

type BusinessListRow = {
  id: string
  name: string
  slug: string
  active_modules: string[] | null
  created_at: Date | string
  billing_status: BillingStatus | null
  monthly_amount_cents: number | null
  last_payment_at: Date | string | null
  next_due_at: Date | string | null
}

type EmployeeRow = {
  id: string
  name: string
  phone: string
  role: string
  is_active: boolean
}

type TenantSubRow = {
  id?: string
  business_id?: string
  plan_id: string
  billing_interval?: string
  module_ids?: string[] | null
  amount_cents: number
  currency: string
  price_version?: number
  status: string
  provider?: string
  provider_subscription_id?: string | null
  subscribed_at: Date | string | null
  current_period_end?: Date | string | null
  grace_deadline_at?: Date | string | null
}

function serializeDate(v: Date | string | null | undefined): string | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

function mapSaasSubscriptionDetail(row: TenantSubRow | null | undefined) {
  if (!row) return null
  return {
    id: row.id ?? null,
    plan_id: row.plan_id,
    plan_label: planLabel(row.plan_id),
    billing_interval: row.billing_interval ?? "month",
    module_ids: row.module_ids ?? [],
    amount_cents: row.amount_cents,
    currency: row.currency,
    price_version: row.price_version ?? 1,
    status: row.status,
    status_label: saasStatusLabel(row.status),
    provider: row.provider ?? "mercadopago",
    provider_subscription_id: row.provider_subscription_id ?? null,
    subscribed_at: serializeDate(row.subscribed_at),
    current_period_end: serializeDate(row.current_period_end),
    grace_deadline_at: serializeDate(row.grace_deadline_at),
  }
}

function mapSaasSubscriptionList(row: TenantSubRow | null | undefined) {
  if (!row) return null
  return {
    plan_id: row.plan_id,
    plan_label: planLabel(row.plan_id),
    status: row.status,
    status_label: saasStatusLabel(row.status),
    subscribed_at: serializeDate(row.subscribed_at),
    amount_cents: row.amount_cents,
    currency: row.currency,
  }
}

export async function listBusinesses(
  deps: AdminBusinessesDeps
): Promise<JsonResult> {
  const rows = (await deps.sql`
    SELECT
      b.id,
      b.name,
      b.slug,
      b.active_modules,
      b.created_at,
      bb.status AS billing_status,
      bb.monthly_amount_cents,
      bb.last_payment_at,
      bb.next_due_at
    FROM businesses b
    LEFT JOIN business_billing bb ON bb.business_id = b.id
    ORDER BY b.created_at ASC
  `) as BusinessListRow[]

  const ids = rows.map((r) => r.id)
  const subByBusiness = new Map<string, TenantSubRow>()
  if (ids.length > 0) {
    const subs = (await deps.sql`
      SELECT
        business_id,
        plan_id,
        status,
        subscribed_at,
        amount_cents,
        currency
      FROM tenant_subscriptions
      WHERE business_id = ANY(${ids})
        AND status IN ('active', 'past_due', 'paused')
      ORDER BY subscribed_at DESC
    `) as TenantSubRow[]
    for (const s of subs) {
      const bid = s.business_id
      if (bid && !subByBusiness.has(bid)) subByBusiness.set(bid, s)
    }
  }

  const businesses = rows.map((r) => {
    const saas = subByBusiness.get(r.id)
    const moduleCount = (r.active_modules ?? []).length
    const monthly = saas
      ? saas.amount_cents
      : monthlyAmountCentsForModuleCount(moduleCount)
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      active_modules: r.active_modules ?? [],
      created_at: serializeDate(r.created_at),
      saas_subscription: mapSaasSubscriptionList(saas),
      billing: {
        status: (r.billing_status ?? "pendiente") as BillingStatus,
        monthly_amount_cents: monthly,
        last_payment_at: serializeDate(r.last_payment_at),
        next_due_at: serializeDate(r.next_due_at),
      },
    }
  })

  return { status: 200, body: { businesses } }
}

export async function getBusinessAdmin(
  deps: AdminBusinessesDeps,
  input: { businessId?: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const rows = (await deps.sql`
    SELECT
      b.id,
      b.name,
      b.slug,
      b.active_modules,
      b.created_at,
      bb.status AS billing_status,
      bb.monthly_amount_cents,
      bb.last_payment_at,
      bb.next_due_at,
      bb.notes AS billing_notes
    FROM businesses b
    LEFT JOIN business_billing bb ON bb.business_id = b.id
    WHERE b.id = ${businessId}
    LIMIT 1
  `) as (BusinessListRow & { billing_notes: string | null })[]

  const r = rows[0]
  if (!r) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  const employees = (await deps.sql`
    SELECT id, name, phone, role, COALESCE(is_active, true) AS is_active
    FROM employees
    WHERE business_id = ${businessId}
    ORDER BY role DESC, name ASC
  `) as EmployeeRow[]

  const payments = (await deps.sql`
    SELECT id, amount_cents, paid_at, note, marked_by_admin_id
    FROM business_billing_payments
    WHERE business_id = ${businessId}
    ORDER BY paid_at DESC
    LIMIT 20
  `) as {
    id: string
    amount_cents: number
    paid_at: Date | string
    note: string | null
    marked_by_admin_id: string | null
  }[]

  const moduleSubs = (await deps.sql`
    SELECT module_id, status, activated_at, billing_anchor_at, deactivated_at
    FROM business_module_subscriptions
    WHERE business_id = ${businessId}
    ORDER BY module_id ASC
  `) as {
    module_id: string
    status: string
    activated_at: Date | string
    billing_anchor_at: Date | string
    deactivated_at: Date | string | null
  }[]

  const tenantSubs = (await deps.sql`
    SELECT
      id,
      plan_id,
      billing_interval,
      module_ids,
      amount_cents,
      currency,
      price_version,
      status,
      provider,
      provider_subscription_id,
      subscribed_at,
      current_period_end,
      grace_deadline_at
    FROM tenant_subscriptions
    WHERE business_id = ${businessId}
      AND status IN ('active', 'past_due', 'paused')
    ORDER BY subscribed_at DESC
    LIMIT 1
  `) as TenantSubRow[]

  const saasRow = tenantSubs[0] ?? null
  const owner = employees.find((e) => e.role === "owner")
  const activeModules = r.active_modules ?? []
  const anchor = businessAnchor(moduleSubs)
  const monthly = saasRow
    ? saasRow.amount_cents
    : monthlyAmountCentsForModuleCount(activeModules.length)

  return {
    status: 200,
    body: {
      business: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        active_modules: activeModules,
        created_at: serializeDate(r.created_at),
        contact: owner
          ? { name: owner.name, phone: owner.phone }
          : null,
        employees: employees.map((e) => ({
          id: e.id,
          name: e.name,
          phone: e.phone,
          role: e.role,
          is_active: Boolean(e.is_active),
        })),
        module_subscriptions: moduleSubs.map((s) => ({
          module_id: s.module_id,
          status: s.status,
          activated_at: serializeDate(s.activated_at),
          billing_anchor_at: serializeDate(s.billing_anchor_at),
          deactivated_at: serializeDate(s.deactivated_at),
        })),
        saas_subscription: mapSaasSubscriptionDetail(saasRow),
        billing: {
          status: (r.billing_status ?? "pendiente") as BillingStatus,
          monthly_amount_cents: monthly,
          last_payment_at: serializeDate(r.last_payment_at),
          next_due_at: serializeDate(r.next_due_at),
          business_anchor_at: serializeDate(anchor),
          notes: r.billing_notes ?? null,
          payments: payments.map((p) => ({
            id: p.id,
            amount_cents: p.amount_cents,
            paid_at: serializeDate(p.paid_at),
            note: p.note,
            marked_by_admin_id: p.marked_by_admin_id,
          })),
        },
      },
    },
  }
}

export async function getAdminMetrics(
  deps: AdminBusinessesDeps
): Promise<JsonResult> {
  const bizRows = (await deps.sql`
    SELECT active_modules FROM businesses
  `) as { active_modules: string[] | null }[]

  const billingRows = (await deps.sql`
    SELECT status FROM business_billing
  `) as { status: string }[]

  const businessCount = bizRows.length
  const moduleCounts: Record<string, number> = {}
  for (const row of bizRows) {
    for (const id of row.active_modules ?? []) {
      moduleCounts[id] = (moduleCounts[id] ?? 0) + 1
    }
  }

  const vencidos = billingRows.filter((b) => b.status === "vencido").length
  const alDia = billingRows.filter((b) => b.status === "al_dia").length
  const pendiente = billingRows.filter((b) => b.status === "pendiente").length

  return {
    status: 200,
    body: {
      business_count: businessCount,
      module_counts: moduleCounts,
      billing: {
        vencidos,
        al_dia: alDia,
        pendiente,
      },
    },
  }
}
