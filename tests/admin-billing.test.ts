import { describe, expect, mock, test } from "bun:test"
import {
  markPaid,
  setBillingStatus,
  type AdminBillingDeps,
} from "@/modules/admin/api/billing"
import { PRICE_PER_MODULE_CENTS } from "@/shell/billing/pricing"

function makeDeps(activeModules: string[] = ["loyalty"]): {
  deps: AdminBillingDeps
  queries: string[]
  values: unknown[][]
} {
  const queries: string[] = []
  const values: unknown[][] = []
  const sql = mock((strings: TemplateStringsArray, ...vals: unknown[]) => {
    const q = strings.join(" ")
    queries.push(q)
    values.push(vals)
    if (q.includes("FROM businesses") && q.includes("active_modules")) {
      return Promise.resolve([{ id: "b1", active_modules: activeModules }])
    }
    if (q.includes("SELECT id FROM businesses")) {
      return Promise.resolve([{ id: "b1" }])
    }
    if (q.includes("INSERT INTO business_billing_payments")) {
      const amount = vals.find((v) => typeof v === "number") as number
      return Promise.resolve([
        {
          id: "pay-1",
          amount_cents: amount,
          paid_at: new Date("2026-08-30T12:00:00Z"),
          note: null,
        },
      ])
    }
    return Promise.resolve([])
  })
  return {
    deps: {
      sql: sql as unknown as AdminBillingDeps["sql"],
      now: () => new Date("2026-08-30T12:00:00.000Z"),
    },
    queries,
    values,
  }
}

describe("markPaid", () => {
  test("400 sin businessId", async () => {
    const { deps } = makeDeps()
    const result = await markPaid(deps, {})
    expect(result.status).toBe(400)
  })

  test("404 negocio", async () => {
    const sql = mock(() => Promise.resolve([]))
    const result = await markPaid(
      { sql: sql as unknown as AdminBillingDeps["sql"] },
      { businessId: "x" }
    )
    expect(result.status).toBe(404)
  })

  test("sin amount: 1 módulo → payment 6999 y monthly 6999", async () => {
    const { deps, values } = makeDeps(["loyalty"])
    const result = await markPaid(deps, {
      businessId: "b1",
      adminUserId: "admin-1",
    })
    expect(result.status).toBe(200)
    expect(result.body.status).toBe("al_dia")
    expect(result.body.last_payment_at).toBe("2026-08-30T12:00:00.000Z")
    expect(result.body.next_due_at).toBe("2026-09-30T12:00:00.000Z")
    expect(result.body.payment).toMatchObject({
      amount_cents: PRICE_PER_MODULE_CENTS,
    })
    const flat = values.flat()
    expect(flat).toContain(PRICE_PER_MODULE_CENTS)
    expect(flat).not.toContain(1_990_000)
  })

  test("sin amount: 2 módulos → 13998", async () => {
    const { deps } = makeDeps(["loyalty", "orders"])
    const result = await markPaid(deps, { businessId: "b1" })
    expect(result.status).toBe(200)
    expect(result.body.payment).toMatchObject({ amount_cents: 13998 })
  })

  test("sin amount: 0 módulos → 0", async () => {
    const { deps } = makeDeps([])
    const result = await markPaid(deps, { businessId: "b1" })
    expect(result.status).toBe(200)
    expect(result.body.payment).toMatchObject({ amount_cents: 0 })
  })

  test("override amountCents se respeta en payment", async () => {
    const { deps } = makeDeps(["loyalty", "orders"])
    const result = await markPaid(deps, {
      businessId: "b1",
      amountCents: 5000,
    })
    expect(result.status).toBe(200)
    expect(result.body.payment).toMatchObject({ amount_cents: 5000 })
  })
})

describe("setBillingStatus", () => {
  test("400 status inválido", async () => {
    const { deps } = makeDeps()
    const result = await setBillingStatus(deps, {
      businessId: "b1",
      status: "pagado",
    })
    expect(result.status).toBe(400)
  })

  test("200 marca vencido; INSERT usa fee por módulos no 1990000", async () => {
    const { deps, values } = makeDeps(["loyalty", "orders"])
    const result = await setBillingStatus(deps, {
      businessId: "b1",
      status: "vencido",
    })
    expect(result).toEqual({ status: 200, body: { status: "vencido" } })
    const flat = values.flat()
    expect(flat).toContain(13998)
    expect(flat).not.toContain(1_990_000)
  })
})
