import { describe, expect, mock, test } from "bun:test"
import {
  setActiveModules,
  type AdminModulesDeps,
} from "@/modules/admin/api/modules"

function makeDeps(
  rows: unknown[] = [{ id: "b1", slug: "carri", active_modules: ["loyalty"] }]
): AdminModulesDeps {
  return {
    sql: mock(() => Promise.resolve(rows)) as unknown as AdminModulesDeps["sql"],
    getRegisteredIds: () => ["loyalty", "orders", "turnos"],
  }
}

describe("setActiveModules", () => {
  test("400 módulo inválido", async () => {
    const deps = makeDeps()
    const result = await setActiveModules(deps, {
      businessId: "b1",
      modules: ["loyalty", "hacker"],
    })
    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({
      error: "Módulos inválidos.",
      invalid: ["hacker"],
    })
  })

  test("400 sin businessId", async () => {
    const result = await setActiveModules(makeDeps(), {
      modules: ["loyalty"],
    })
    expect(result.status).toBe(400)
  })

  test("400 modules no array", async () => {
    const result = await setActiveModules(makeDeps(), {
      businessId: "b1",
      modules: undefined,
    })
    expect(result.status).toBe(400)
  })

  test("404 negocio inexistente", async () => {
    const deps = makeDeps([])
    const result = await setActiveModules(deps, {
      businessId: "missing",
      modules: ["loyalty"],
    })
    expect(result.status).toBe(404)
  })

  test("200 persiste modules normalizados unique sorted", async () => {
    const deps = makeDeps([
      { id: "b1", slug: "carri", active_modules: ["loyalty", "orders"] },
    ])
    const result = await setActiveModules(deps, {
      businessId: "b1",
      modules: ["orders", "loyalty", "loyalty"],
    })
    expect(result.status).toBe(200)
    expect(result.body.active_modules).toEqual(["loyalty", "orders"])
    const sqlMock = deps.sql as unknown as ReturnType<typeof mock>
    expect(sqlMock).toHaveBeenCalled()
    const call = sqlMock.mock.calls[0] as unknown[]
    // values include businessId and modules array
    expect(call).toContain("b1")
    expect(call.some((v) => Array.isArray(v) && v.includes("loyalty"))).toBe(
      true
    )
  })

  test("acepta array vacío (todos off)", async () => {
    const deps = makeDeps([
      { id: "b1", slug: "carri", active_modules: [] },
    ])
    const result = await setActiveModules(deps, {
      businessId: "b1",
      modules: [],
    })
    expect(result.status).toBe(200)
    expect(result.body.active_modules).toEqual([])
  })

  test("recalcula monthly_amount_cents = N × 6999 tras toggle", async () => {
    const queries: string[] = []
    const values: unknown[][] = []
    const sql = mock((strings: TemplateStringsArray, ...vals: unknown[]) => {
      const q = strings.join(" ")
      queries.push(q)
      values.push(vals)
      if (q.includes("UPDATE businesses")) {
        return Promise.resolve([
          {
            id: "b1",
            slug: "carri",
            active_modules: ["loyalty", "orders", "turnos"],
          },
        ])
      }
      return Promise.resolve([])
    })
    const deps: AdminModulesDeps = {
      sql: sql as unknown as AdminModulesDeps["sql"],
      getRegisteredIds: () => ["loyalty", "orders", "turnos"],
    }
    const result = await setActiveModules(deps, {
      businessId: "b1",
      modules: ["loyalty", "orders", "turnos"],
    })
    expect(result.status).toBe(200)
    expect(
      queries.some(
        (q) =>
          q.includes("INSERT INTO business_billing") &&
          q.includes("monthly_amount_cents")
      )
    ).toBe(true)
    const flat = values.flat()
    expect(flat).toContain(20997)
    expect(flat).not.toContain(1_990_000)
  })

  test("toggle a 0 módulos pone monthly 0", async () => {
    const values: unknown[][] = []
    const sql = mock((strings: TemplateStringsArray, ...vals: unknown[]) => {
      values.push(vals)
      const q = strings.join(" ")
      if (q.includes("UPDATE businesses")) {
        return Promise.resolve([
          { id: "b1", slug: "carri", active_modules: [] },
        ])
      }
      return Promise.resolve([])
    })
    const result = await setActiveModules(
      {
        sql: sql as unknown as AdminModulesDeps["sql"],
        getRegisteredIds: () => ["loyalty", "orders", "turnos"],
      },
      { businessId: "b1", modules: [] }
    )
    expect(result.status).toBe(200)
    expect(values.flat()).toContain(0)
  })
})
