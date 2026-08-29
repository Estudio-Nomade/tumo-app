import { describe, expect, mock, test } from "bun:test"
import { getMetrics, getRecentActivity, type MetricsDeps } from "@/modules/turnos/api/metrics"

function makeSql() {
  const sql = mock((strings: TemplateStringsArray) => {
    const q = strings.join(" ")
    if (q.includes("COUNT") && q.includes("CURRENT_DATE")) {
      return Promise.resolve([{ n: 8 }])
    }
    if (q.includes("pending_verification") || q.includes("payment_status")) {
      return Promise.resolve([{ n: 3 }])
    }
    if (q.includes("FROM turnos_bookings")) {
      return Promise.resolve([
        {
          starts_at: new Date("2026-08-29T15:00:00Z"),
          service_name: "Corte",
          status: "confirmed",
        },
      ])
    }
    return Promise.resolve([{ n: 0 }])
  })
  return sql as unknown as MetricsDeps["sql"]
}

describe("getMetrics", () => {
  test("businessId vacío → 400", async () => {
    const r = await getMetrics({ sql: makeSql() }, { businessId: "" })
    expect(r.status).toBe(400)
  })

  test("devuelve turnosToday y pendingPayment", async () => {
    const r = await getMetrics({ sql: makeSql() }, { businessId: "biz-1" })
    expect(r.status).toBe(200)
    const body = r.body as { turnosToday: number; pendingPayment: number }
    expect(body.turnosToday).toBe(8)
    expect(body.pendingPayment).toBe(3)
  })
})

describe("getRecentActivity", () => {
  test("mapea eventos", async () => {
    const events = await getRecentActivity({ sql: makeSql() }, { businessId: "biz-1", limit: 10 })
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].title).toContain("Turno")
  })
})
