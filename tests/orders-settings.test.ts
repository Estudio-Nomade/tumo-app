import { describe, expect, mock, test } from "bun:test"
import {
  getSettings,
  updateHours,
  type SettingsDeps,
} from "@/modules/orders/api/settings"
import type { OrdersHours } from "@/modules/orders/lib/hours"

type Calls = { q: string; values: unknown[] }

function makeSql(overrides: { settings?: unknown[] } = {}) {
  const calls: Calls[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("orders_settings")) {
      return Promise.resolve(
        overrides.settings ?? [
          { hours: { "1": { open: "19:00", close: "01:00", closed: false } } },
        ]
      )
    }
    return Promise.resolve([])
  })
  return { sql, calls }
}

function makeDeps(overrides: Partial<SettingsDeps> = {}): SettingsDeps {
  return { sql: makeSql().sql as unknown as SettingsDeps["sql"], ...overrides }
}

const hoursInput: OrdersHours = {
  "0": { closed: true },
  "1": { open: "19:00", close: "01:00", closed: false },
}

describe("getSettings", () => {
  test("devuelve los horarios", async () => {
    const { sql } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as SettingsDeps["sql"] })
    const r = await getSettings(deps, { businessId: "biz-1" })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      hours: { "1": { open: "19:00", close: "01:00", closed: false } },
    })
  })

  test("businessId vacío → 400", async () => {
    const r = await getSettings(makeDeps(), { businessId: "" })
    expect(r.status).toBe(400)
  })
})

describe("updateHours", () => {
  test("guarda y devuelve los horarios normalizados", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as SettingsDeps["sql"] })
    const r = await updateHours(deps, { businessId: "biz-1", hours: hoursInput })
    expect(r.status).toBe(200)

    const update = calls.find((c) => c.q.includes("UPDATE orders_settings"))
    expect(update).toBeDefined()
    const json = String(update!.values[0])
    expect(json).toContain('"closed":true')
    expect(json).toContain('"19:00"')
  })

  test("horario inválido → 400", async () => {
    const r = await updateHours(makeDeps(), {
      businessId: "biz-1",
      hours: { "1": { open: "12:00", close: "12:00", closed: false } },
    })
    expect(r.status).toBe(400)
  })

  test("businessId vacío → 400", async () => {
    const r = await updateHours(makeDeps(), { businessId: "", hours: hoursInput })
    expect(r.status).toBe(400)
  })

  test("negocio sin settings → 404", async () => {
    const { sql } = makeSql({ settings: [] })
    const deps = makeDeps({ sql: sql as unknown as SettingsDeps["sql"] })
    const r = await updateHours(deps, { businessId: "nope", hours: hoursInput })
    expect(r.status).toBe(404)
  })
})
