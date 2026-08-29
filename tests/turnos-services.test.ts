import { describe, expect, mock, test } from "bun:test"
import {
  createService,
  listServices,
  updateService,
  type ServicesDeps,
} from "@/modules/turnos/api/services"

function makeSql(overrides: {
  services?: unknown[]
  inserted?: unknown[]
  updated?: unknown[]
} = {}) {
  const calls: { q: string; values: unknown[] }[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })
    if (q.includes("INSERT INTO turnos_services")) {
      return Promise.resolve(
        overrides.inserted ?? [
          {
            id: "s-new",
            name: "Corte",
            price_cents: 12500,
            duration_minutes: 30,
            is_active: true,
            sort_order: 0,
          },
        ]
      )
    }
    if (q.includes("UPDATE turnos_services")) {
      return Promise.resolve(
        overrides.updated ?? [
          {
            id: "s1",
            name: "Corte",
            price_cents: 13000,
            duration_minutes: 30,
            is_active: true,
            sort_order: 0,
          },
        ]
      )
    }
    if (q.includes("FROM turnos_services")) {
      return Promise.resolve(
        overrides.services ?? [
          {
            id: "s1",
            name: "Corte con tijera",
            price_cents: 12500,
            duration_minutes: 30,
            is_active: true,
            sort_order: 0,
          },
        ]
      )
    }
    return Promise.resolve([])
  })
  return { sql, calls }
}

function makeDeps(overrides: Partial<ServicesDeps> = {}): ServicesDeps {
  return {
    sql: makeSql().sql as unknown as ServicesDeps["sql"],
    ...overrides,
  }
}

describe("listServices", () => {
  test("businessId vacío → 400", async () => {
    const r = await listServices(makeDeps(), { businessId: "" })
    expect(r.status).toBe(400)
  })

  test("lista servicios del negocio", async () => {
    const r = await listServices(makeDeps(), { businessId: "biz-1" })
    expect(r.status).toBe(200)
    const body = r.body as { services: { id: string; name: string; priceCents: number }[] }
    expect(body.services).toHaveLength(1)
    expect(body.services[0].name).toBe("Corte con tijera")
    expect(body.services[0].priceCents).toBe(12500)
  })

  test("activeOnly filtra is_active", async () => {
    const { sql, calls } = makeSql()
    await listServices(
      { sql: sql as unknown as ServicesDeps["sql"] },
      { businessId: "biz-1", activeOnly: true }
    )
    expect(calls.some((c) => c.q.includes("is_active"))).toBe(true)
  })
})

describe("createService", () => {
  test("valida nombre y precio", async () => {
    const r = await createService(makeDeps(), {
      businessId: "biz-1",
      name: "",
      priceCents: -1,
      durationMinutes: 0,
    })
    expect(r.status).toBe(400)
  })

  test("crea servicio", async () => {
    const r = await createService(makeDeps(), {
      businessId: "biz-1",
      name: "Corte",
      priceCents: 12500,
      durationMinutes: 30,
    })
    expect(r.status).toBe(201)
    const body = r.body as { service: { id: string; priceCents: number } }
    expect(body.service.id).toBe("s-new")
    expect(body.service.priceCents).toBe(12500)
  })
})

describe("updateService", () => {
  test("id vacío → 400", async () => {
    const r = await updateService(makeDeps(), {
      businessId: "biz-1",
      serviceId: "",
      priceCents: 100,
    })
    expect(r.status).toBe(400)
  })

  test("actualiza precio", async () => {
    const r = await updateService(makeDeps(), {
      businessId: "biz-1",
      serviceId: "s1",
      priceCents: 13000,
    })
    expect(r.status).toBe(200)
    const body = r.body as { service: { priceCents: number } }
    expect(body.service.priceCents).toBe(13000)
  })
})
