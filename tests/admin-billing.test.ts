import { describe, expect, mock, test } from "bun:test"
import {
  markPaid,
  setBillingStatus,
  type AdminBillingDeps,
} from "@/modules/admin/api/billing"
import { DEFAULT_MONTHLY_AMOUNT_CENTS } from "@/modules/admin/lib/types"

function makeDeps(): {
  deps: AdminBillingDeps
  queries: string[]
} {
  const queries: string[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    void values
    const q = strings.join(" ")
    queries.push(q)
    if (q.includes("SELECT id FROM businesses")) {
      return Promise.resolve([{ id: "b1" }])
    }
    if (q.includes("INSERT INTO business_billing_payments")) {
      return Promise.resolve([
        {
          id: "pay-1",
          amount_cents: DEFAULT_MONTHLY_AMOUNT_CENTS,
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

  test("200 al_dia + payment + next_due +1 month UTC", async () => {
    const { deps, queries } = makeDeps()
    const result = await markPaid(deps, {
      businessId: "b1",
      adminUserId: "admin-1",
    })
    expect(result.status).toBe(200)
    expect(result.body.status).toBe("al_dia")
    expect(result.body.last_payment_at).toBe("2026-08-30T12:00:00.000Z")
    expect(result.body.next_due_at).toBe("2026-09-30T12:00:00.000Z")
    expect(
      queries.some((q) => q.includes("INSERT INTO business_billing_payments"))
    ).toBe(true)
    expect(
      queries.some((q) => q.includes("INSERT INTO business_billing"))
    ).toBe(true)
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

  test("200 marca vencido", async () => {
    const { deps } = makeDeps()
    const result = await setBillingStatus(deps, {
      businessId: "b1",
      status: "vencido",
    })
    expect(result).toEqual({ status: 200, body: { status: "vencido" } })
  })
})
