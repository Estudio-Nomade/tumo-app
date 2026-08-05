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
  purchase_count: number | string
}

function ordinalPurchaseLabel(count: number): string {
  const n = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1
  return `${n}° compra`
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

  const [purchases, redemptions] = await Promise.all([
    deps.sql`
      SELECT p.created_at, c.name AS customer_name, 'purchase' AS type,
             (
               SELECT COUNT(*)::int FROM purchases p2
               WHERE p2.customer_id = p.customer_id
                 AND p2.business_id = p.business_id
                 AND p2.created_at <= p.created_at
                 AND p2.created_at > COALESCE(
                   (
                     SELECT MAX(r2.created_at) FROM redemptions r2
                     WHERE r2.customer_id = p.customer_id
                       AND r2.business_id = p.business_id
                       AND r2.created_at < p.created_at
                   ),
                   'epoch'::timestamptz
                 )
             ) AS purchase_count
      FROM purchases p
      JOIN customers c ON c.id = p.customer_id
      WHERE p.business_id = ${businessId}
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    ` as Promise<ActivityRow[]>,
    deps.sql`
      SELECT r.created_at, c.name AS customer_name, 'redemption' AS type,
             (
               SELECT COUNT(*)::int FROM purchases p2
               WHERE p2.customer_id = r.customer_id
                 AND p2.business_id = r.business_id
                 AND p2.created_at <= r.created_at
                 AND p2.created_at > COALESCE(
                   (
                     SELECT MAX(r2.created_at) FROM redemptions r2
                     WHERE r2.customer_id = r.customer_id
                       AND r2.business_id = r.business_id
                       AND r2.created_at < r.created_at
                   ),
                   'epoch'::timestamptz
                 )
             ) AS purchase_count
      FROM redemptions r
      JOIN customers c ON c.id = r.customer_id
      WHERE r.business_id = ${businessId}
      ORDER BY r.created_at DESC
      LIMIT ${limit}
    ` as Promise<ActivityRow[]>,
  ])

  const events: ActivityEvent[] = [...purchases, ...redemptions].map((row) => {
    const ts =
      row.created_at instanceof Date
        ? row.created_at.getTime()
        : new Date(row.created_at).getTime()
    const isPurchase = row.type === "purchase"
    const count = Number(row.purchase_count ?? 0)
    const purchaseLabel = ordinalPurchaseLabel(count)
    return {
      timestamp: ts,
      icon: isPurchase ? "purchase" : "redemption",
      title: row.customer_name,
      description: isPurchase
        ? purchaseLabel
        : `${purchaseLabel} · ¡Premio canjeado!`,
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
    SELECT id, name, total_purchases
    FROM customers
    WHERE business_id = ${businessId}
    ORDER BY total_purchases DESC, name ASC
    LIMIT ${limit}
  `) as { id: string; name: string; total_purchases: number }[]

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    totalPurchases: Number(row.total_purchases ?? 0),
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
