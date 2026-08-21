import { describe, expect, mock, test } from "bun:test"
import {
  getMetrics,
  getRecentActivity,
  setPaused,
  type MetricsDeps,
} from "@/modules/orders/api/metrics"

function makeSql(overrides: {
  count?: number
  revenue?: number
  review?: number
  activity?: unknown[]
  paused?: unknown[]
} = {}) {
  const calls: { q: string; values: unknown[] }[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("SUM(total_cents)")) {
      return Promise.resolve([{ sum: overrides.revenue ?? 12500 }])
    }
    if (q.includes("pending_verification")) {
      return Promise.resolve([{ count: overrides.review ?? 0 }])
    }
    if (q.includes("COUNT(*)")) {
      return Promise.resolve([{ count: overrides.count ?? 3 }])
    }
    if (q.includes("UPDATE orders_settings")) {
      return Promise.resolve(overrides.paused ?? [{ is_paused: true }])
    }
    if (q.includes("JOIN customers")) {
      return Promise.resolve(
        overrides.activity ?? [
          {
            order_number: 17,
            total_cents: 12500,
            created_at: new Date("2026-08-21T20:00:00Z"),
            customer_name: "María García",
          },
        ]
      )
    }
    return Promise.resolve([])
  })
  return { sql, calls }
}

function makeDeps(overrides: Partial<MetricsDeps> = {}): MetricsDeps {
  return {
    sql: makeSql().sql as unknown as MetricsDeps["sql"],
    ...overrides,
  }
}

describe("getMetrics", () => {
  test("businessId vacío → 400", async () => {
    const r = await getMetrics(makeDeps(), { businessId: "" })
    expect(r.status).toBe(400)
  })

  test("calcula pedidos, ingresos (solo paid) y comprobantes a revisar", async () => {
    const { sql } = makeSql({ count: 5, revenue: 25000, review: 2 })
    const deps = makeDeps({ sql: sql as unknown as MetricsDeps["sql"] })

    const r = await getMetrics(deps, { businessId: "biz-1" })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      ordersToday: 5,
      revenueTodayCents: 25000,
      receiptsToReview: 2,
    })
  })
})

describe("getRecentActivity", () => {
  test("mapea pedidos recientes a eventos", async () => {
    const { sql } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as MetricsDeps["sql"] })

    const events = await getRecentActivity(deps, { businessId: "biz-1", limit: 10 })

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      icon: "receipt",
      title: "Pedido #17",
    })
    expect(events[0].description).toContain("12.500")
    expect(events[0].description).toContain("María")
  })

  test("sin pedidos → vacío", async () => {
    const { sql } = makeSql({ activity: [] })
    const deps = makeDeps({ sql: sql as unknown as MetricsDeps["sql"] })
    const events = await getRecentActivity(deps, { businessId: "biz-1", limit: 10 })
    expect(events).toEqual([])
  })
})

describe("setPaused", () => {
  test("activa pausa", async () => {
    const { sql, calls } = makeSql({ paused: [{ is_paused: true }] })
    const deps = makeDeps({ sql: sql as unknown as MetricsDeps["sql"] })

    const r = await setPaused(deps, { businessId: "biz-1", isPaused: true })

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ isPaused: true })
    const update = calls.find((c) => c.q.includes("UPDATE orders_settings"))
    expect(update!.values).toContain(true)
  })

  test("businessId vacío → 400", async () => {
    const r = await setPaused(makeDeps(), { businessId: "", isPaused: false })
    expect(r.status).toBe(400)
  })
})
