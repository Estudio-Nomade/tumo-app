import type { ActivityEvent } from "@/lib/modules"
import type { SqlTagged } from "@/modules/loyalty/lib/types"

export type MetricsDeps = {
  sql: SqlTagged
}

type CountRow = { count: number | string }
type ActivityRow = {
  created_at: Date | string
  customer_name: string
  type: "purchase" | "redemption"
}

export async function getMetrics(
  deps: MetricsDeps,
  input: { businessId: string }
): Promise<{
  customers: number
  purchasesThisMonth: number
  redemptionsThisMonth: number
}> {
  const { businessId } = input

  const [customers] = (await deps.sql`
    SELECT COUNT(*)::int AS count FROM customers WHERE business_id = ${businessId}
  `) as CountRow[]

  const [purchases] = (await deps.sql`
    SELECT COUNT(*)::int AS count FROM purchases
    WHERE business_id = ${businessId}
      AND created_at >= date_trunc('month', now())
  `) as CountRow[]

  const [redemptions] = (await deps.sql`
    SELECT COUNT(*)::int AS count FROM redemptions
    WHERE business_id = ${businessId}
      AND created_at >= date_trunc('month', now())
  `) as CountRow[]

  return {
    customers: Number(customers?.count ?? 0),
    purchasesThisMonth: Number(purchases?.count ?? 0),
    redemptionsThisMonth: Number(redemptions?.count ?? 0),
  }
}

export async function getRecentActivity(
  deps: MetricsDeps,
  input: { businessId: string; limit: number }
): Promise<ActivityEvent[]> {
  const { businessId, limit } = input

  const purchases = (await deps.sql`
    SELECT p.created_at, c.name AS customer_name, 'purchase' AS type
    FROM purchases p
    JOIN customers c ON c.id = p.customer_id
    WHERE p.business_id = ${businessId}
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `) as ActivityRow[]

  const redemptions = (await deps.sql`
    SELECT r.created_at, c.name AS customer_name, 'redemption' AS type
    FROM redemptions r
    JOIN customers c ON c.id = r.customer_id
    WHERE r.business_id = ${businessId}
    ORDER BY r.created_at DESC
    LIMIT ${limit}
  `) as ActivityRow[]

  const events: ActivityEvent[] = [...purchases, ...redemptions].map((row) => {
    const ts =
      row.created_at instanceof Date
        ? row.created_at.getTime()
        : new Date(row.created_at).getTime()
    const isPurchase = row.type === "purchase"
    return {
      timestamp: ts,
      icon: isPurchase ? "🎫" : "🎁",
      title: isPurchase ? "Visita sumada" : "Premio canjeado",
      description: row.customer_name,
    }
  })

  return events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}
