import { describe, expect, mock, test } from "bun:test"
import { postSignupCheckout } from "@/modules/signup/api/checkout"
import type { SqlTagged } from "@/modules/admin/lib/types"
import { createFakeMercadoPagoProvider } from "@/shell/billing/provider/fake"

function makeSql() {
  const calls: { q: string; values: unknown[] }[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join("?")
    calls.push({ q, values })
    return Promise.resolve([])
  })
  return { sql: sql as unknown as SqlTagged, calls }
}

describe("postSignupCheckout", () => {
  test("403 when self-service disabled", async () => {
    const { sql } = makeSql()
    const r = await postSignupCheckout(
      {
        sql,
        provider: createFakeMercadoPagoProvider(),
        appBaseUrl: "http://localhost:3000",
        selfServiceEnabled: false,
      },
      {
        email: "a@b.com",
        password: "x",
        businessName: "L",
        payerName: "A",
        planId: "basico",
        moduleIds: ["loyalty"],
      }
    )
    expect(r.status).toBe(403)
  })

  test("200 when enabled", async () => {
    const { sql } = makeSql()
    const r = await postSignupCheckout(
      {
        sql,
        provider: createFakeMercadoPagoProvider(),
        appBaseUrl: "http://localhost:3000",
        selfServiceEnabled: true,
        newId: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        hashPassword: (p) => `h:${p}`,
        now: () => new Date("2026-10-05T12:00:00.000Z"),
      },
      {
        email: "a@b.com",
        password: "secret",
        businessName: "Local",
        payerName: "Ana",
        planId: "basico",
        moduleIds: ["loyalty"],
      }
    )
    expect(r.status).toBe(200)
    if (r.status !== 200) return
    expect(r.body.redirectUrl).toContain("pref_fake_")
    expect(r.body.sessionId).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
  })
})
