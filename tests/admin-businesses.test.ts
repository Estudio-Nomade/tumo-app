import { describe, expect, mock, test } from "bun:test"
import {
  getAdminMetrics,
  getBusinessAdmin,
  listBusinesses,
  type AdminBusinessesDeps,
} from "@/modules/admin/api/businesses"

function makeSql(handler: (q: string, values: unknown[]) => unknown[]) {
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    return Promise.resolve(handler(q, values))
  })
  return { sql: sql as unknown as AdminBusinessesDeps["sql"], sqlMock: sql }
}

describe("listBusinesses", () => {
  test("lista todos los businesses con billing", async () => {
    const { sql } = makeSql(() => [
      {
        id: "b1",
        name: "Carri",
        slug: "carri",
        active_modules: ["loyalty", "orders"],
        created_at: new Date("2026-01-01T00:00:00Z"),
        billing_status: "al_dia",
        monthly_amount_cents: 1_990_000,
        last_payment_at: new Date("2026-08-01T00:00:00Z"),
        next_due_at: new Date("2026-09-01T00:00:00Z"),
      },
    ])
    const result = await listBusinesses({ sql })
    expect(result.status).toBe(200)
    const businesses = result.body.businesses as unknown[]
    expect(businesses).toHaveLength(1)
    expect(businesses[0]).toMatchObject({
      slug: "carri",
      billing: { status: "al_dia" },
    })
  })

  test("sin billing row → pendiente default", async () => {
    const { sql } = makeSql(() => [
      {
        id: "b2",
        name: "X",
        slug: "x",
        active_modules: [],
        created_at: "2026-01-01",
        billing_status: null,
        monthly_amount_cents: null,
        last_payment_at: null,
        next_due_at: null,
      },
    ])
    const result = await listBusinesses({ sql })
    const b = (result.body.businesses as { billing: { status: string } }[])[0]
    expect(b.billing.status).toBe("pendiente")
  })
})

describe("getBusinessAdmin", () => {
  test("400 sin id", async () => {
    const { sql } = makeSql(() => [])
    const result = await getBusinessAdmin({ sql }, {})
    expect(result.status).toBe(400)
  })

  test("404 si no existe", async () => {
    const { sql } = makeSql(() => [])
    const result = await getBusinessAdmin({ sql }, { businessId: "missing" })
    expect(result.status).toBe(404)
  })

  test("detalle con empleados y payments", async () => {
    let call = 0
    const { sql } = makeSql(() => {
      call += 1
      if (call === 1) {
        return [
          {
            id: "b1",
            name: "Carri",
            slug: "carri",
            active_modules: ["loyalty"],
            created_at: new Date("2026-01-01"),
            billing_status: "al_dia",
            monthly_amount_cents: 1_990_000,
            last_payment_at: null,
            next_due_at: null,
            billing_notes: null,
          },
        ]
      }
      if (call === 2) {
        return [
          {
            id: "e1",
            name: "Nobel",
            phone: "+5411",
            role: "owner",
            is_active: true,
          },
        ]
      }
      return [{ id: "p1", amount_cents: 100, paid_at: new Date(), note: null, marked_by_admin_id: null }]
    })
    const result = await getBusinessAdmin({ sql }, { businessId: "b1" })
    expect(result.status).toBe(200)
    const business = result.body.business as {
      contact: { name: string }
      employees: unknown[]
    }
    expect(business.contact.name).toBe("Nobel")
    expect(business.employees).toHaveLength(1)
  })
})

describe("getAdminMetrics", () => {
  test("cuenta negocios y módulos", async () => {
    let call = 0
    const { sql } = makeSql(() => {
      call += 1
      if (call === 1) {
        return [
          { active_modules: ["loyalty", "orders"] },
          { active_modules: ["loyalty"] },
        ]
      }
      return [{ status: "vencido" }, { status: "al_dia" }]
    })
    const result = await getAdminMetrics({ sql })
    expect(result.status).toBe(200)
    expect(result.body.business_count).toBe(2)
    expect(result.body.module_counts).toEqual({ loyalty: 2, orders: 1 })
    expect(result.body.billing).toEqual({
      vencidos: 1,
      al_dia: 1,
      pendiente: 0,
    })
  })
})
