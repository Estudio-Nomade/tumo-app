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

export type TopCustomerRow = {
  id: string
  name: string
  purchases: number
  purchasesNeeded: number
  rewardName: string
  canRedeem: boolean
}

export async function getTopCustomers(
  deps: MetricsDeps,
  input: {
    businessId: string
    purchasesNeeded: number
    rewardName: string
    limit?: number
  }
): Promise<TopCustomerRow[]> {
  const businessId = input.businessId
  const purchasesNeeded = input.purchasesNeeded
  const rewardName = input.rewardName
  const limit =
    Number.isFinite(input.limit) && (input.limit as number) > 0
      ? Math.min(Math.floor(input.limit as number), 20)
      : 5

  const rows = (await deps.sql`
    SELECT id, name, purchases
    FROM customers
    WHERE business_id = ${businessId}
    ORDER BY purchases DESC, total_purchases DESC, name ASC
    LIMIT ${limit}
  `) as { id: string; name: string; purchases: number }[]

  return rows.map((row) => {
    const purchases = Number(row.purchases ?? 0)
    return {
      id: row.id,
      name: row.name,
      purchases,
      purchasesNeeded,
      rewardName,
      canRedeem: purchases >= purchasesNeeded,
    }
  })
}

export async function getWeeklyRedemptions(
  deps: MetricsDeps,
  input: { businessId: string }
): Promise<{ thisWeek: number; lastWeek: number }> {
  const { businessId } = input

  const [thisWeek] = (await deps.sql`
    SELECT COUNT(*)::int AS count FROM redemptions
    WHERE business_id = ${businessId}
      AND created_at >= date_trunc('week', now())
  `) as CountRow[]

  const [lastWeek] = (await deps.sql`
    SELECT COUNT(*)::int AS count FROM redemptions
    WHERE business_id = ${businessId}
      AND created_at >= date_trunc('week', now()) - interval '7 days'
      AND created_at < date_trunc('week', now())
  `) as CountRow[]

  return {
    thisWeek: Number(thisWeek?.count ?? 0),
    lastWeek: Number(lastWeek?.count ?? 0),
  }
}

export async function countCustomersWithRedemptions(
  deps: MetricsDeps,
  input: { businessId: string }
): Promise<number> {
  const { businessId } = input

  const [row] = (await deps.sql`
    SELECT COUNT(DISTINCT customer_id)::int AS count
    FROM redemptions
    WHERE business_id = ${businessId}
  `) as CountRow[]

  return Number(row?.count ?? 0)
}

export type TopCustomerByPrizesRow = {
  id: string
  name: string
  prizes: number
  lastRedeemedAt: number | null
}

export async function getTopCustomersByPrizes(
  deps: MetricsDeps,
  input: { businessId: string; limit?: number }
): Promise<TopCustomerByPrizesRow[]> {
  const businessId = input.businessId
  const limit =
    Number.isFinite(input.limit) && (input.limit as number) > 0
      ? Math.min(Math.max(Math.floor(input.limit as number), 1), 20)
      : 5

  const rows = (await deps.sql`
    SELECT c.id, c.name,
           COUNT(r.*)::int AS prizes,
           MAX(r.created_at) AS last_redeemed_at
    FROM redemptions r
    JOIN customers c ON c.id = r.customer_id
    WHERE r.business_id = ${businessId}
    GROUP BY c.id, c.name
    ORDER BY prizes DESC, last_redeemed_at DESC, c.name ASC
    LIMIT ${limit}
  `) as {
    id: string
    name: string
    prizes: number
    last_redeemed_at: Date | string | null
  }[]

  return rows.map((row) => {
    let lastRedeemedAt: number | null = null
    if (row.last_redeemed_at != null) {
      lastRedeemedAt =
        row.last_redeemed_at instanceof Date
          ? row.last_redeemed_at.getTime()
          : new Date(row.last_redeemed_at).getTime()
      if (!Number.isFinite(lastRedeemedAt)) lastRedeemedAt = null
    }
    return {
      id: row.id,
      name: row.name,
      prizes: Number(row.prizes ?? 0),
      lastRedeemedAt,
    }
  })
}
