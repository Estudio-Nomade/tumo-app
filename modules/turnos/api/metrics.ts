import type { ActivityEvent } from "@/lib/modules"
import type { JsonResult, SqlTagged } from "@/modules/turnos/lib/types"

export type MetricsDeps = {
  sql: SqlTagged
}

export async function getMetrics(
  deps: MetricsDeps,
  input: { businessId: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const today = (await deps.sql`
    SELECT COUNT(*)::int AS n
    FROM turnos_bookings
    WHERE business_id = ${businessId}
      AND starts_at::date = CURRENT_DATE
      AND status != 'cancelled'
  `) as { n: number }[]

  const pending = (await deps.sql`
    SELECT COUNT(*)::int AS n
    FROM turnos_bookings
    WHERE business_id = ${businessId}
      AND payment_status IN ('unpaid', 'pending_receipt', 'pending_verification')
      AND status != 'cancelled'
  `) as { n: number }[]

  return {
    status: 200,
    body: {
      turnosToday: today[0]?.n ?? 0,
      pendingPayment: pending[0]?.n ?? 0,
    },
  }
}

export async function getRecentActivity(
  deps: MetricsDeps,
  input: { businessId: string; limit: number }
): Promise<ActivityEvent[]> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) return []

  const limit = Math.min(Math.max(input.limit || 10, 1), 50)
  const rows = (await deps.sql`
    SELECT starts_at, service_name, status, payment_status
    FROM turnos_bookings
    WHERE business_id = ${businessId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as {
    starts_at: Date | string
    service_name: string
    status: string
    payment_status: string
  }[]

  return rows.map((r) => ({
    timestamp: new Date(r.starts_at).getTime(),
    icon: "calendar",
    title: `Turno · ${r.service_name}`,
    description: `${r.status} · pago ${r.payment_status}`,
  }))
}
