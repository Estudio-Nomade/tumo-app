import { describe, expect, mock, test } from "bun:test"
import {
  getSettings,
  updateHours,
  type SettingsDeps,
} from "@/modules/orders/api/settings"
import type { OrdersHours } from "@/modules/orders/lib/hours"

type Calls = { q: string; values: unknown[] }

type SqlJsonMarker = { __sqlJson: unknown }

function makeSql(overrides: { settings?: unknown[] } = {}) {
  const calls: Calls[] = []
  const sqlFn = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
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
  const sql = Object.assign(sqlFn, {
    json: (value: unknown): SqlJsonMarker => ({ __sqlJson: value }),
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

  test("hours jsonb string (double-encoded) se parsea a objeto", async () => {
    const doubleEncoded = JSON.stringify({
      "0": { closed: true },
      "1": { open: "16:00", close: "23:00", closed: false },
    })
    const { sql } = makeSql({ settings: [{ hours: doubleEncoded }] })
    const deps = makeDeps({ sql: sql as unknown as SettingsDeps["sql"] })
    const r = await getSettings(deps, { businessId: "biz-1" })
    expect(r.status).toBe(200)
    const hours = r.body.hours as OrdersHours
    expect(typeof hours).toBe("object")
    expect(Array.isArray(hours)).toBe(false)
    expect(hours["1"]).toEqual({
      open: "16:00",
      close: "23:00",
      closed: false,
    })
  })
})

describe("updateHours", () => {
  test("persiste hours vía sql.json(objeto), no JSON.stringify string", async () => {
    const { sql, calls } = makeSql()
    const deps = makeDeps({ sql: sql as unknown as SettingsDeps["sql"] })
    const r = await updateHours(deps, { businessId: "biz-1", hours: hoursInput })
    expect(r.status).toBe(200)

    const update = calls.find((c) => c.q.includes("UPDATE orders_settings"))
    expect(update).toBeDefined()
    const bound = update!.values[0] as SqlJsonMarker
    expect(bound).toEqual({
      __sqlJson: expect.objectContaining({
        "0": { closed: true },
        "1": expect.objectContaining({
          open: "19:00",
          close: "01:00",
          closed: false,
        }),
      }),
    })
    expect(typeof bound).not.toBe("string")
    expect(update!.q).not.toContain("::jsonb")
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
