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
        monthly_amount_cents: 13998,
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
      billing: { status: "al_dia", monthly_amount_cents: 13998 },
    })
  })

  test("sin billing row → pendiente + fee por #módulos (no 1990000)", async () => {
    const { sql } = makeSql(() => [
      {
        id: "b2",
        name: "X",
        slug: "x",
        active_modules: ["loyalty", "orders"],
        created_at: "2026-01-01",
        billing_status: null,
        monthly_amount_cents: null,
        last_payment_at: null,
        next_due_at: null,
      },
    ])
    const result = await listBusinesses({ sql })
    const b = (
      result.body.businesses as {
        billing: { status: string; monthly_amount_cents: number }
      }[]
    )[0]
    expect(b.billing.status).toBe("pendiente")
    expect(b.billing.monthly_amount_cents).toBe(13998)
  })

  test("sin billing y 0 módulos → monthly 0", async () => {
    const { sql } = makeSql(() => [
      {
        id: "b3",
        name: "Y",
        slug: "y",
        active_modules: [],
        created_at: "2026-01-01",
        billing_status: null,
        monthly_amount_cents: null,
        last_payment_at: null,
        next_due_at: null,
      },
    ])
    const result = await listBusinesses({ sql })
    const b = (
      result.body.businesses as { billing: { monthly_amount_cents: number } }[]
    )[0]
    expect(b.billing.monthly_amount_cents).toBe(0)
  })

  test("legacy ARS 1990000 en DB se ignora: tarifa = N × 6999", async () => {
    const { sql } = makeSql(() => [
      {
        id: "b4",
        name: "Defe",
        slug: "defe",
        active_modules: ["loyalty"],
        created_at: "2026-01-01",
        billing_status: "vencido",
        monthly_amount_cents: 1_990_000,
        last_payment_at: null,
        next_due_at: null,
      },
    ])
    const result = await listBusinesses({ sql })
    const b = (
      result.body.businesses as {
        billing: { status: string; monthly_amount_cents: number }
      }[]
    )[0]
    expect(b.billing.status).toBe("vencido")
    expect(b.billing.monthly_amount_cents).toBe(6999)
    expect(b.billing.monthly_amount_cents).not.toBe(1_990_000)
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
    const { sql } = makeSql((q) => {
      call += 1
      if (q.includes("FROM businesses") && q.includes("billing_status")) {
        return [
          {
            id: "b1",
            name: "Carri",
            slug: "carri",
            active_modules: ["loyalty"],
            created_at: new Date("2026-01-01"),
            billing_status: "al_dia",
            monthly_amount_cents: 6999,
            last_payment_at: null,
            next_due_at: null,
            billing_notes: null,
          },
        ]
      }
      if (q.includes("FROM employees")) {
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
      if (q.includes("business_billing_payments")) {
        return [
          {
            id: "p1",
            amount_cents: 100,
            paid_at: new Date(),
            note: null,
            marked_by_admin_id: null,
          },
        ]
      }
      if (q.includes("business_module_subscriptions")) {
        return [
          {
            module_id: "loyalty",
            status: "active",
            activated_at: new Date("2026-09-01T12:00:00Z"),
            billing_anchor_at: new Date("2026-09-01T12:00:00Z"),
            deactivated_at: null,
          },
        ]
      }
      void call
      return []
    })
    const result = await getBusinessAdmin({ sql }, { businessId: "b1" })
    expect(result.status).toBe(200)
    const business = result.body.business as {
      contact: { name: string }
      employees: unknown[]
      module_subscriptions: unknown[]
      billing: { business_anchor_at: string | null }
    }
    expect(business.contact.name).toBe("Nobel")
    expect(business.employees).toHaveLength(1)
    expect(business.module_subscriptions).toHaveLength(1)
    expect(business.billing.business_anchor_at).toBe(
      "2026-09-01T12:00:00.000Z"
    )
  })

  test("detalle ignora monthly legacy 1990000 y muestra N × 6999", async () => {
    const { sql } = makeSql((q) => {
      if (q.includes("FROM businesses") && q.includes("billing_status")) {
        return [
          {
            id: "b1",
            name: "Defe",
            slug: "defe",
            active_modules: ["loyalty"],
            created_at: new Date("2026-01-01"),
            billing_status: "vencido",
            monthly_amount_cents: 1_990_000,
            last_payment_at: null,
            next_due_at: null,
            billing_notes: null,
          },
        ]
      }
      return []
    })
    const result = await getBusinessAdmin({ sql }, { businessId: "b1" })
    expect(result.status).toBe(200)
    const business = result.body.business as {
      billing: { monthly_amount_cents: number; status: string }
      saas_subscription: null
    }
    expect(business.billing.status).toBe("vencido")
    expect(business.billing.monthly_amount_cents).toBe(6999)
    expect(business.saas_subscription).toBeNull()
  })

  test("detalle con tenant_subscriptions expone saas_subscription y amount del plan", async () => {
    const { sql } = makeSql((q) => {
      if (q.includes("FROM businesses") && q.includes("billing_status")) {
        return [
          {
            id: "b1",
            name: "Nuevo",
            slug: "nuevo",
            active_modules: ["loyalty", "orders"],
            created_at: new Date("2026-10-01"),
            billing_status: "al_dia",
            monthly_amount_cents: 8999,
            last_payment_at: new Date("2026-10-01T15:00:00Z"),
            next_due_at: new Date("2026-11-01T15:00:00Z"),
            billing_notes: null,
          },
        ]
      }
      if (q.includes("FROM employees")) return []
      if (q.includes("business_billing_payments")) return []
      if (q.includes("business_module_subscriptions")) {
        return [
          {
            module_id: "loyalty",
            status: "active",
            activated_at: new Date("2026-10-01T15:00:00Z"),
            billing_anchor_at: new Date("2026-10-01T15:00:00Z"),
            deactivated_at: null,
          },
          {
            module_id: "orders",
            status: "active",
            activated_at: new Date("2026-10-01T15:00:00Z"),
            billing_anchor_at: new Date("2026-10-01T15:00:00Z"),
            deactivated_at: null,
          },
        ]
      }
      if (q.includes("tenant_subscriptions")) {
        return [
          {
            id: "ts1",
            plan_id: "pro",
            billing_interval: "month",
            module_ids: ["loyalty", "orders"],
            amount_cents: 8_999_000,
            currency: "ARS",
            price_version: 1,
            status: "active",
            provider: "mercadopago",
            provider_subscription_id: "preapproval-xyz",
            subscribed_at: new Date("2026-10-01T15:00:00Z"),
            current_period_end: new Date("2026-11-01T15:00:00Z"),
            grace_deadline_at: null,
          },
        ]
      }
      return []
    })
    const result = await getBusinessAdmin({ sql }, { businessId: "b1" })
    expect(result.status).toBe(200)
    const business = result.body.business as {
      billing: { monthly_amount_cents: number }
      saas_subscription: {
        plan_id: string
        plan_label: string
        status: string
        status_label: string
        subscribed_at: string | null
        module_ids: string[]
        amount_cents: number
        currency: string
        provider: string
        provider_subscription_id: string | null
        current_period_end: string | null
      } | null
    }
    expect(business.saas_subscription).toMatchObject({
      plan_id: "pro",
      plan_label: "Pro",
      status: "active",
      status_label: "Activa",
      module_ids: ["loyalty", "orders"],
      amount_cents: 8_999_000,
      currency: "ARS",
      provider: "mercadopago",
      provider_subscription_id: "preapproval-xyz",
    })
    expect(business.saas_subscription?.subscribed_at).toBe(
      "2026-10-01T15:00:00.000Z"
    )
    // SaaS: mostrar amount del ciclo (ARS snapshot), no N×6999
    expect(business.billing.monthly_amount_cents).toBe(8_999_000)
  })
})

describe("listBusinesses saas summary", () => {
  test("incluye saas_subscription resumida cuando hay fila", async () => {
    let call = 0
    const { sql } = makeSql((q) => {
      call += 1
      if (q.includes("FROM businesses") && q.includes("LEFT JOIN business_billing")) {
        return [
          {
            id: "b1",
            name: "Nuevo",
            slug: "nuevo",
            active_modules: ["loyalty"],
            created_at: new Date("2026-10-01"),
            billing_status: "al_dia",
            monthly_amount_cents: 3999,
            last_payment_at: null,
            next_due_at: null,
          },
        ]
      }
      if (q.includes("tenant_subscriptions")) {
        return [
          {
            business_id: "b1",
            plan_id: "basico",
            status: "active",
            subscribed_at: new Date("2026-10-01T12:00:00Z"),
            amount_cents: 3_999_000,
            currency: "ARS",
          },
        ]
      }
      void call
      return []
    })
    const result = await listBusinesses({ sql })
    expect(result.status).toBe(200)
    const b = (
      result.body.businesses as {
        saas_subscription: {
          plan_id: string
          plan_label: string
          status: string
          subscribed_at: string | null
        } | null
        billing: { monthly_amount_cents: number }
      }[]
    )[0]
    expect(b.saas_subscription).toMatchObject({
      plan_id: "basico",
      plan_label: "Básico",
      status: "active",
    })
    expect(b.billing.monthly_amount_cents).toBe(3_999_000)
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
