import { describe, expect, mock, test } from "bun:test"
import { startCheckout } from "@/shell/billing/checkout/start"
import { createFakeMercadoPagoProvider } from "@/shell/billing/provider/fake"
import type { SqlTagged } from "@/modules/admin/lib/types"

function makeSql() {
  const calls: { q: string; values: unknown[] }[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join("?")
    calls.push({ q, values })
    return Promise.resolve([])
  })
  return { sql: sql as unknown as SqlTagged, sqlMock: sql, calls }
}

describe("startCheckout", () => {
  test("400 on invalid cupo", async () => {
    const { sql } = makeSql()
    const result = await startCheckout(
      {
        sql,
        provider: createFakeMercadoPagoProvider(),
        appBaseUrl: "http://localhost:3000",
      },
      {
        email: "a@b.com",
        password: "secret",
        businessName: "Local",
        payerName: "Ana",
        planId: "basico",
        moduleIds: ["loyalty", "orders"],
      }
    )
    expect(result.status).toBe(400)
    if (result.status !== 400) return
    expect(result.body.code).toBe("cupo")
  })

  test("200 inserts session, moves to awaiting_payment, returns redirect", async () => {
    const { sql, calls } = makeSql()
    const result = await startCheckout(
      {
        sql,
        provider: createFakeMercadoPagoProvider(),
        appBaseUrl: "http://localhost:3000/",
        newId: () => "11111111-2222-3333-4444-555555555555",
        hashPassword: (p) => `hash:${p}`,
        now: () => new Date("2026-10-05T12:00:00.000Z"),
      },
      {
        email: "Ana@Mail.com",
        password: "secreto123",
        businessName: "Mi Local",
        payerName: "Ana Perez",
        payerDocument: "30111222",
        planId: "basico",
        moduleIds: ["loyalty"],
      }
    )
    expect(result.status).toBe(200)
    if (result.status !== 200) return
    expect(result.body.sessionId).toBe("11111111-2222-3333-4444-555555555555")
    expect(result.body.redirectUrl).toContain("pref_fake_")
    expect(result.body.providerCheckoutId).toContain("pref_fake_")

    const joined = calls.map((c) => c.q).join("\n")
    expect(joined).toContain("INSERT INTO checkout_sessions")
    const allValues = calls.flatMap((c) => c.values)
    expect(allValues).toContain("awaiting_payment")
    // password hashed
    const insert = calls.find((c) => c.q.includes("INSERT INTO checkout_sessions"))
    expect(insert?.values).toContain("hash:secreto123")
    expect(insert?.values).toContain("ana@mail.com")
  })
})

describe("fake MP provider webhook", () => {
  test("approved → payment_succeeded", async () => {
    const p = createFakeMercadoPagoProvider()
    const ev = await p.parseAndVerifyWebhook(
      JSON.stringify({
        id: "pay_1",
        status: "approved",
        external_reference: "sess-1",
      }),
      {}
    )
    expect(ev.type).toBe("payment_succeeded")
    expect(ev.externalReference).toBe("sess-1")
  })
})
