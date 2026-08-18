import type { ActivityEvent } from "@/lib/modules"
import type { SqlTagged } from "@/modules/loyalty/lib/types"

export type MetricsDeps = {
  sql: SqlTagged
}

type CountRow = { count: number | string }
type ActivityRow = {
  created_at: Date | string
  customer_name: string
  type: "earn" | "redeem"
  points: number | string
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

  const [earns] = (await deps.sql`
    SELECT COUNT(*)::int AS count FROM point_movements
    WHERE business_id = ${businessId}
      AND kind = 'earn'
      AND created_at >= date_trunc('month', now())
  `) as CountRow[]

  const [redemptions] = (await deps.sql`
    SELECT COUNT(*)::int AS count FROM point_movements
    WHERE business_id = ${businessId}
      AND kind = 'redeem'
      AND created_at >= date_trunc('month', now())
  `) as CountRow[]

  return {
    customers: Number(customers?.count ?? 0),
    purchasesThisMonth: Number(earns?.count ?? 0),
    redemptionsThisMonth: Number(redemptions?.count ?? 0),
  }
}

export async function getRecentActivity(
  deps: MetricsDeps,
  input: { businessId: string; limit: number }
): Promise<ActivityEvent[]> {
  const { businessId, limit } = input

  const rows = (await deps.sql`
    SELECT m.created_at, c.name AS customer_name, m.kind AS type, m.points
    FROM point_movements m
    JOIN customers c ON c.id = m.customer_id
    WHERE m.business_id = ${businessId}
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `) as ActivityRow[]

  const events: ActivityEvent[] = rows.map((row) => {
    const ts =
      row.created_at instanceof Date
        ? row.created_at.getTime()
        : new Date(row.created_at).getTime()
    const isEarn = row.type === "earn"
    const pts = Number(row.points ?? 0)
    return {
      timestamp: ts,
      icon: isEarn ? "purchase" : "redemption",
      title: row.customer_name,
      description: isEarn
        ? `+${pts} puntos`
        : `Canje · ${pts} puntos`,
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

export type TopBuyerRow = {
  id: string
  name: string
  totalPurchases: number
}

function clampLimit(limit: number | undefined): number {
  return Number.isFinite(limit) && (limit as number) > 0
    ? Math.min(Math.max(Math.floor(limit as number), 1), 20)
    : 5
}

export async function getTopBuyers(
  deps: MetricsDeps,
  input: { businessId: string; limit?: number }
): Promise<TopBuyerRow[]> {
  const businessId = input.businessId
  const limit = clampLimit(input.limit)

  const rows = (await deps.sql`
    SELECT id, name, total_points
    FROM customers
    WHERE business_id = ${businessId}
    ORDER BY total_points DESC, name ASC
    LIMIT ${limit}
  `) as { id: string; name: string; total_points: number }[]

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    totalPurchases: Number(row.total_points ?? 0),
  }))
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
    SELECT id, name, points
    FROM customers
    WHERE business_id = ${businessId}
    ORDER BY points DESC, total_points DESC, name ASC
    LIMIT ${limit}
  `) as { id: string; name: string; points: number }[]

  return rows.map((row) => {
    const purchases = Number(row.points ?? 0)
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
    SELECT COUNT(*)::int AS count FROM point_movements
    WHERE business_id = ${businessId}
      AND kind = 'redeem'
      AND created_at >= date_trunc('week', now())
  `) as CountRow[]

  const [lastWeek] = (await deps.sql`
    SELECT COUNT(*)::int AS count FROM point_movements
    WHERE business_id = ${businessId}
      AND kind = 'redeem'
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
    FROM point_movements
    WHERE business_id = ${businessId}
      AND kind = 'redeem'
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
           COUNT(m.*)::int AS prizes,
           MAX(m.created_at) AS last_redeemed_at
    FROM point_movements m
    JOIN customers c ON c.id = m.customer_id
    WHERE m.business_id = ${businessId}
      AND m.kind = 'redeem'
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
