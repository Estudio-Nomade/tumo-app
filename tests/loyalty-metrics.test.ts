import { describe, expect, mock, test } from "bun:test"
import {
  getMetrics,
  getRecentActivity,
  getTopCustomers,
  getWeeklyRedemptions,
  type MetricsDeps,
} from "@/modules/loyalty/api/metrics"

describe("getMetrics", () => {
  test("devuelve counts de customers, purchases y redemptions del mes", async () => {
    let call = 0
    const sql = mock(() => {
      call++
      if (call === 1) return Promise.resolve([{ count: 42 }])
      if (call === 2) return Promise.resolve([{ count: 17 }])
      if (call === 3) return Promise.resolve([{ count: 5 }])
      return Promise.resolve([])
    })

    const deps: MetricsDeps = {
      sql: sql as unknown as MetricsDeps["sql"],
    }

    const result = await getMetrics(deps, { businessId: "biz-1" })

    expect(result).toEqual({
      customers: 42,
      purchasesThisMonth: 17,
      redemptionsThisMonth: 5,
    })
  })
})

describe("getRecentActivity", () => {
  test("mergea purchases y redemptions por timestamp y respeta limit", async () => {
    let call = 0
    const sql = mock(() => {
      call++
      if (call === 1) {
        return Promise.resolve([
          {
            created_at: new Date("2026-08-04T12:00:00Z"),
            customer_name: "Ana",
            type: "purchase",
          },
          {
            created_at: new Date("2026-08-04T10:00:00Z"),
            customer_name: "Bob",
            type: "purchase",
          },
        ])
      }
      return Promise.resolve([
        {
          created_at: new Date("2026-08-04T11:00:00Z"),
          customer_name: "Ana",
          type: "redemption",
        },
      ])
    })

    const deps: MetricsDeps = {
      sql: sql as unknown as MetricsDeps["sql"],
    }

    const events = await getRecentActivity(deps, {
      businessId: "biz-1",
      limit: 10,
    })

    expect(events).toHaveLength(3)
    expect(events[0].timestamp).toBeGreaterThanOrEqual(events[1].timestamp)
    expect(events[0].icon).toBe("🎫")
    expect(events.some((e) => e.icon === "🎁")).toBe(true)
  })

  test("respeta el límite", async () => {
    const sql = mock(() =>
      Promise.resolve([
        {
          created_at: new Date("2026-08-04T12:00:00Z"),
          customer_name: "A",
          type: "purchase",
        },
        {
          created_at: new Date("2026-08-04T11:00:00Z"),
          customer_name: "B",
          type: "purchase",
        },
        {
          created_at: new Date("2026-08-04T10:00:00Z"),
          customer_name: "C",
          type: "purchase",
        },
      ])
    )

    // second call redemptions empty
    let n = 0
    const sql2 = mock(() => {
      n++
      if (n === 1) {
        return Promise.resolve([
          {
            created_at: new Date("2026-08-04T12:00:00Z"),
            customer_name: "A",
            type: "purchase",
          },
          {
            created_at: new Date("2026-08-04T11:00:00Z"),
            customer_name: "B",
            type: "purchase",
          },
          {
            created_at: new Date("2026-08-04T10:00:00Z"),
            customer_name: "C",
            type: "purchase",
          },
        ])
      }
      return Promise.resolve([])
    })

    const events = await getRecentActivity(
      { sql: sql2 as unknown as MetricsDeps["sql"] },
      { businessId: "biz-1", limit: 2 }
    )

    expect(events).toHaveLength(2)
    void sql
  })
})

describe("getTopCustomers", () => {
  test("devuelve clientes ordenados por progreso real", async () => {
    const sql = mock(() =>
      Promise.resolve([
        {
          id: "c1",
          name: "Ana",
          purchases: 9,
          purchases_needed: 10,
        },
        {
          id: "c2",
          name: "Bob",
          purchases: 10,
          purchases_needed: 10,
        },
      ])
    )
    const result = await getTopCustomers(
      { sql: sql as unknown as MetricsDeps["sql"] },
      {
        businessId: "biz-1",
        purchasesNeeded: 10,
        rewardName: "premio",
        limit: 3,
      }
    )
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("c1")
    expect(result[0].name).toBe("Ana")
    expect(result[0].purchases).toBe(9)
    expect(result[0].purchasesNeeded).toBe(10)
    expect(result[0].canRedeem).toBe(false)
    expect(result[0].rewardName).toBe("premio")
    expect(result[1].canRedeem).toBe(true)
  })
})

describe("getWeeklyRedemptions", () => {
  test("thisWeek y lastWeek desde counts", async () => {
    let call = 0
    const sql = mock(() => {
      call++
      if (call === 1) return Promise.resolve([{ count: 4 }])
      return Promise.resolve([{ count: 7 }])
    })
    const result = await getWeeklyRedemptions(
      { sql: sql as unknown as MetricsDeps["sql"] },
      { businessId: "biz-1" }
    )
    expect(result).toEqual({ thisWeek: 4, lastWeek: 7 })
  })
})
