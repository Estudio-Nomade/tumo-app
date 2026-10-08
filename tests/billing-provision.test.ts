import { describe, expect, mock, test } from "bun:test"
import { provisionTenant } from "@/shell/billing/checkout/provision"
import type { SqlTagged } from "@/modules/admin/lib/types"
import type { CheckoutStatus } from "@/shell/billing/checkout/session"

type SessionRow = {
  id: string
  status: CheckoutStatus
  email: string
  password_hash: string
  business_name: string
  payer_name: string
  plan_id: string
  billing_interval: string
  module_ids: string[]
  price_version: number
  amount_cents: number
  currency: string
  provider: string
  provider_payment_id: string | null
  provider_subscription_id: string | null
  business_id: string | null
}

function makeSql(store: {
  session: SessionRow
  businesses: { id: string; slug: string }[]
  tenantSubs: number
}) {
  const sql = mock(async (strings: TemplateStringsArray, ...vals: unknown[]) => {
    const q = strings.join("?")
    if (q.includes("FROM checkout_sessions")) {
      return [store.session]
    }
    if (q.includes("FROM businesses") && q.includes("slug")) {
      return store.businesses.filter((b) => b.slug === String(vals[0]))
    }
    if (q.includes("INSERT INTO businesses")) {
      const id = `biz-${store.businesses.length + 1}`
      const slug = String(vals[1])
      store.businesses.push({ id, slug })
      store.session.business_id = id
      return [{ id, slug, name: String(vals[0]) }]
    }
    if (q.includes("FROM owner_accounts")) return []
    if (q.includes("INSERT INTO owner_accounts")) {
      return [{ id: "oa-1", email: store.session.email, password_hash: "h" }]
    }
    if (q.includes("INSERT INTO employees")) {
      return [
        {
          id: "emp-1",
          name: store.session.payer_name,
          phone: String(vals[1]),
          role: "owner",
          business_id: store.session.business_id,
          owner_account_id: "oa-1",
        },
      ]
    }
    if (q.includes("INSERT INTO business_module_subscriptions")) return []
    if (q.includes("UPDATE businesses")) return []
    if (q.includes("INSERT INTO business_billing")) return []
    if (q.includes("INSERT INTO business_billing_payments")) return [{ id: "p1" }]
    if (q.includes("INSERT INTO tenant_subscriptions")) {
      store.tenantSubs += 1
      return [{ id: `ts-${store.tenantSubs}` }]
    }
    if (q.includes("UPDATE checkout_sessions")) {
      if (vals.includes("provisioned")) store.session.status = "provisioned"
      const bid = vals.find(
        (v) => typeof v === "string" && String(v).startsWith("biz-")
      )
      if (bid) store.session.business_id = String(bid)
      return [store.session]
    }
    return []
  })
  return sql as unknown as SqlTagged
}

describe("provisionTenant", () => {
  test("creates tenant from paid session", async () => {
    const session: SessionRow = {
      id: "sess-p",
      status: "paid",
      email: "x@y.com",
      password_hash: "h",
      business_name: "Café Norte",
      payer_name: "X",
      plan_id: "pro",
      billing_interval: "month",
      module_ids: ["loyalty", "orders"],
      price_version: 1,
      amount_cents: 8_999_000,
      currency: "ARS",
      provider: "mercadopago",
      provider_payment_id: "pay_z",
      provider_subscription_id: null,
      business_id: null,
    }
    const store = { session, businesses: [] as { id: string; slug: string }[], tenantSubs: 0 }
    const sql = makeSql(store)
    const r = await provisionTenant(
      { sql, now: () => new Date("2026-10-05T12:00:00.000Z") },
      { sessionId: "sess-p", paidAt: new Date("2026-10-05T12:00:00.000Z") }
    )
    expect(r.status).toBe(200)
    if (r.status !== 200) return
    expect(r.body.alreadyProvisioned).toBe(false)
    expect(r.body.businessId).toBeTruthy()
    expect(store.tenantSubs).toBe(1)
    expect(session.status).toBe("provisioned")
  })

  test("second call is idempotent when already provisioned", async () => {
    const session: SessionRow = {
      id: "sess-p2",
      status: "provisioned",
      email: "x@y.com",
      password_hash: "h",
      business_name: "Café",
      payer_name: "X",
      plan_id: "basico",
      billing_interval: "month",
      module_ids: ["loyalty"],
      price_version: 1,
      amount_cents: 1,
      currency: "ARS",
      provider: "mercadopago",
      provider_payment_id: null,
      provider_subscription_id: null,
      business_id: "biz-existing",
    }
    const store = {
      session,
      businesses: [{ id: "biz-existing", slug: "cafe" }],
      tenantSubs: 1,
    }
    const sql = makeSql(store)
    const r = await provisionTenant({ sql }, { sessionId: "sess-p2" })
    expect(r.status).toBe(200)
    if (r.status !== 200) return
    expect(r.body.alreadyProvisioned).toBe(true)
    expect(r.body.businessId).toBe("biz-existing")
    expect(store.tenantSubs).toBe(1)
  })

  test("rejects non-paid session", async () => {
    const session: SessionRow = {
      id: "sess-w",
      status: "awaiting_payment",
      email: "x@y.com",
      password_hash: "h",
      business_name: "A",
      payer_name: "X",
      plan_id: "basico",
      billing_interval: "month",
      module_ids: ["loyalty"],
      price_version: 1,
      amount_cents: 1,
      currency: "ARS",
      provider: "mercadopago",
      provider_payment_id: null,
      provider_subscription_id: null,
      business_id: null,
    }
    const store = { session, businesses: [], tenantSubs: 0 }
    const sql = makeSql(store)
    const r = await provisionTenant({ sql }, { sessionId: "sess-w" })
    expect(r.status).toBe(400)
    if (r.status !== 400) return
    expect(r.body.code).toBe("not_paid")
  })
})
