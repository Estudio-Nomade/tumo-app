import type { BillingStatus, JsonResult, SqlTagged } from "@/modules/admin/lib/types"
import { DEFAULT_MONTHLY_AMOUNT_CENTS } from "@/modules/admin/lib/types"

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

function serializeDate(v: Date | string | null | undefined): string | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

export async function listBusinesses(
  deps: AdminBusinessesDeps,
  _input: Record<string, never> = {}
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

  const businesses = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    active_modules: r.active_modules ?? [],
    created_at: serializeDate(r.created_at),
    billing: {
      status: (r.billing_status ?? "pendiente") as BillingStatus,
      monthly_amount_cents:
        r.monthly_amount_cents ?? DEFAULT_MONTHLY_AMOUNT_CENTS,
      last_payment_at: serializeDate(r.last_payment_at),
      next_due_at: serializeDate(r.next_due_at),
    },
  }))

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

  const owner = employees.find((e) => e.role === "owner")

  return {
    status: 200,
    body: {
      business: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        active_modules: r.active_modules ?? [],
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
        billing: {
          status: (r.billing_status ?? "pendiente") as BillingStatus,
          monthly_amount_cents:
            r.monthly_amount_cents ?? DEFAULT_MONTHLY_AMOUNT_CENTS,
          last_payment_at: serializeDate(r.last_payment_at),
          next_due_at: serializeDate(r.next_due_at),
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
