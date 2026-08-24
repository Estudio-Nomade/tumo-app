import type { ActivityEvent } from "@/lib/modules"
import type { JsonResult, SqlTagged } from "@/modules/orders/lib/types"
import { formatCents } from "@/modules/orders/lib/types"

export type MetricsDeps = {
  sql: SqlTagged
}

type CountRow = { count: number | string }
type SumRow = { sum: number | string }
type ActivityRow = {
  order_number: number | string
  total_cents: number | string
  created_at: Date | string
  customer_name: string
}

export async function getMetrics(
  deps: MetricsDeps,
  input: { businessId: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const [orders] = (await deps.sql`
    SELECT COUNT(*)::int AS count
    FROM orders
    WHERE business_id = ${businessId} AND created_at >= date_trunc('day', now())
  `) as CountRow[]

  const [revenue] = (await deps.sql`
    SELECT COALESCE(SUM(total_cents), 0)::int AS sum
    FROM orders
    WHERE business_id = ${businessId}
      AND payment_status = 'paid'
      AND created_at >= date_trunc('day', now())
  `) as SumRow[]

  const [review] = (await deps.sql`
    SELECT COUNT(*)::int AS count
    FROM orders
    WHERE business_id = ${businessId}
      AND payment_status = 'pending_verification'
      AND created_at >= date_trunc('day', now())
  `) as CountRow[]

  return {
    status: 200,
    body: {
      ordersToday: Number(orders?.count ?? 0),
      revenueTodayCents: Number(revenue?.sum ?? 0),
      receiptsToReview: Number(review?.count ?? 0),
    },
  }
}

export async function getRecentActivity(
  deps: MetricsDeps,
  input: { businessId: string; limit: number }
): Promise<ActivityEvent[]> {
  const limit = Number.isFinite(input.limit)
    ? Math.min(Math.max(Math.floor(input.limit), 1), 30)
    : 5

  const rows = (await deps.sql`
    SELECT o.order_number, o.total_cents, o.created_at, c.name AS customer_name
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.business_id = ${input.businessId}
    ORDER BY o.created_at DESC
    LIMIT ${limit}
  `) as ActivityRow[]

  return rows.map((r) => {
    const ts =
      r.created_at instanceof Date
        ? r.created_at.getTime()
        : new Date(r.created_at).getTime()
    return {
      timestamp: Number.isFinite(ts) ? ts : Date.now(),
      icon: "receipt",
      title: `Pedido #${r.order_number}`,
      description: `$ ${formatCents(Number(r.total_cents))} · ${r.customer_name}`,
    }
  })
}

export async function setPaused(
  deps: MetricsDeps,
  input: { businessId: string; isPaused: boolean }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const rows = (await deps.sql`
    UPDATE orders_settings SET is_paused = ${input.isPaused}
    WHERE business_id = ${businessId}
    RETURNING is_paused
  `) as { is_paused: boolean }[]

  if (!rows[0]) {
    return { status: 404, body: { error: "No encontramos la configuración." } }
  }

  return { status: 200, body: { isPaused: Boolean(rows[0].is_paused) } }
}
