import { describe, expect, mock, test } from "bun:test"
import { applyProviderEvent } from "@/shell/billing/checkout/apply-event"
import { createFakeMercadoPagoProvider } from "@/shell/billing/provider/fake"
import type { SqlTagged } from "@/modules/admin/lib/types"
import type { ProviderEvent } from "@/shell/billing/provider/types"
import type { CheckoutStatus } from "@/shell/billing/checkout/session"

type SessionRow = {
  id: string
  status: CheckoutStatus
  email: string
  password_hash: string
  business_name: string
  payer_name: string
  payer_document: string | null
  plan_id: string
  billing_interval: string
  module_ids: string[]
  price_version: number
  amount_cents: number
  currency: string
  provider: string
  provider_checkout_id: string | null
  provider_payment_id: string | null
  provider_subscription_id: string | null
  business_id: string | null
  provision_error: string | null
}

type Store = {
  sessions: Map<string, SessionRow>
  events: Map<string, { provider_event_id: string; type: string; external_reference: string; processed_at: Date | null }>
  businesses: { id: string; slug: string; name: string; active_modules: string[] }[]
  ownerAccounts: { id: string; email: string; password_hash: string }[]
  employees: { id: string; name: string; phone: string; role: string; business_id: string; owner_account_id: string | null }[]
  moduleSubs: { business_id: string; module_id: string; status: string }[]
  tenantSubs: { business_id: string; plan_id: string; status: string; checkout_session_id: string | null; amount_cents: number }[]
  billing: Map<string, { monthly_amount_cents: number; status: string; last_payment_at: Date | null; next_due_at: Date | null }>
  payments: { business_id: string; amount_cents: number }[]
}

function baseSession(over: Partial<SessionRow> = {}): SessionRow {
  return {
    id: "sess-1",
    status: "awaiting_payment",
    email: "ana@mail.com",
    password_hash: "hash:x",
    business_name: "Mi Local",
    payer_name: "Ana",
    payer_document: null,
    plan_id: "basico",
    billing_interval: "month",
    module_ids: ["loyalty"],
    price_version: 1,
    amount_cents: 3_999_000,
    currency: "ARS",
    provider: "mercadopago_fake",
    provider_checkout_id: "pref_1",
    provider_payment_id: null,
    provider_subscription_id: null,
    business_id: null,
    provision_error: null,
    ...over,
  }
}

function makeStore(session?: SessionRow | null): Store {
  const sessions = new Map<string, SessionRow>()
  if (session) sessions.set(session.id, session)
  return {
    sessions,
    events: new Map(),
    businesses: [],
    ownerAccounts: [],
    employees: [],
    moduleSubs: [],
    tenantSubs: [],
    billing: new Map(),
    payments: [],
  }
}

function makeSql(store: Store, now: Date): SqlTagged {
  const sql = mock(async (strings: TemplateStringsArray, ...vals: unknown[]) => {
    const q = strings.join("?")

    if (q.includes("INSERT INTO provider_events")) {
      const provider = String(vals[0] ?? "mercadopago")
      const eventId = String(vals[1])
      const type = String(vals[2])
      const ext = vals[3] == null ? null : String(vals[3])
      const key = `${provider}:${eventId}`
      if (store.events.has(key)) {
        return [] // ON CONFLICT DO NOTHING
      }
      store.events.set(key, {
        provider_event_id: eventId,
        type,
        external_reference: ext ?? "",
        processed_at: null,
      })
      return [{ id: `evt-row-${store.events.size}`, provider_event_id: eventId }]
    }

    if (q.includes("UPDATE provider_events") && q.includes("processed_at")) {
      const eventId = String(vals.find((v) => typeof v === "string" && store.events.has(`mercadopago:${v}`)) ?? vals[vals.length - 1])
      for (const [k, e] of store.events) {
        if (e.provider_event_id === eventId || k.endsWith(`:${eventId}`)) {
          e.processed_at = now
        }
      }
      // also match by first string id vals
      for (const v of vals) {
        if (typeof v === "string") {
          for (const e of store.events.values()) {
            if (e.provider_event_id === v) e.processed_at = now
          }
        }
      }
      return []
    }

    if (q.includes("FROM checkout_sessions") && q.includes("WHERE id")) {
      const id = String(vals[0])
      const s = store.sessions.get(id)
      return s ? [s] : []
    }

    if (q.includes("UPDATE checkout_sessions")) {
      const id =
        (vals.find((v) => typeof v === "string" && store.sessions.has(v as string)) as string) ??
        String(vals[vals.length - 1])
      const s = store.sessions.get(id)
      if (!s) return []
      const status = vals.find((v) =>
        typeof v === "string" &&
        ["paid", "failed", "provisioned", "awaiting_payment", "started"].includes(v as string)
      ) as CheckoutStatus | undefined
      if (status) s.status = status
      const pay = vals.find(
        (v) => typeof v === "string" && String(v).startsWith("pay_")
      ) as string | undefined
      if (pay) s.provider_payment_id = pay
      const bid = vals.find(
        (v) => typeof v === "string" && store.businesses.some((b) => b.id === v)
      ) as string | undefined
      if (bid) s.business_id = bid
      return [s]
    }

    if (q.includes("INSERT INTO businesses")) {
      const name = String(vals[0])
      const slug = String(vals[1])
      const modules = (vals.find((v) => Array.isArray(v)) as string[]) ?? []
      const id = `biz-${store.businesses.length + 1}`
      // conflict slug?
      if (store.businesses.some((b) => b.slug === slug)) {
        throw new Error("duplicate slug")
      }
      store.businesses.push({ id, slug, name, active_modules: modules })
      return [{ id, slug, name }]
    }

    if (q.includes("FROM businesses") && q.includes("slug")) {
      const slug = String(vals[0])
      return store.businesses.filter((b) => b.slug === slug)
    }

    if (q.includes("INSERT INTO owner_accounts")) {
      const email = String(vals[0])
      const hash = String(vals[1])
      const existing = store.ownerAccounts.find((o) => o.email === email)
      if (existing) return [existing]
      const id = `oa-${store.ownerAccounts.length + 1}`
      const row = { id, email, password_hash: hash }
      store.ownerAccounts.push(row)
      return [row]
    }

    if (q.includes("FROM owner_accounts")) {
      const email = String(vals[0])
      return store.ownerAccounts.filter((o) => o.email === email)
    }

    if (q.includes("INSERT INTO employees")) {
      const name = String(vals[0])
      const phone = String(vals[1])
      const role = String(vals[2] ?? "owner")
      const businessId = String(vals[3])
      const oa = vals[4] == null ? null : String(vals[4])
      const id = `emp-${store.employees.length + 1}`
      const row = {
        id,
        name,
        phone,
        role,
        business_id: businessId,
        owner_account_id: oa,
      }
      store.employees.push(row)
      return [row]
    }

    if (q.includes("INSERT INTO business_module_subscriptions") || q.includes("ON CONFLICT (business_id, module_id)")) {
      const businessId = String(vals[0])
      const moduleId = String(vals[1])
      const existing = store.moduleSubs.find(
        (m) => m.business_id === businessId && m.module_id === moduleId
      )
      if (existing) existing.status = "active"
      else store.moduleSubs.push({ business_id: businessId, module_id: moduleId, status: "active" })
      return []
    }

    if (q.includes("UPDATE businesses") && q.includes("active_modules")) {
      const modules = vals.find((v) => Array.isArray(v)) as string[] | undefined
      const businessId = String(vals.find((v) => typeof v === "string" && String(v).startsWith("biz-")) ?? vals[vals.length - 1])
      const b = store.businesses.find((x) => x.id === businessId)
      if (b && modules) b.active_modules = modules
      return []
    }

    if (q.includes("INSERT INTO tenant_subscriptions")) {
      const businessId = String(vals[0])
      const planId = String(vals.find((v) => v === "basico" || v === "pro" || v === "full") ?? "basico")
      const amount = Number(vals.find((v) => typeof v === "number") ?? 0)
      const sessionId =
        (vals.find((v) => typeof v === "string" && store.sessions.has(v as string)) as string) ??
        null
      store.tenantSubs.push({
        business_id: businessId,
        plan_id: planId,
        status: "active",
        checkout_session_id: sessionId,
        amount_cents: amount,
      })
      return [{ id: `ts-${store.tenantSubs.length}` }]
    }

    if (q.includes("FROM tenant_subscriptions")) {
      const businessId = String(vals[0])
      return store.tenantSubs.filter((t) => t.business_id === businessId)
    }

    if (q.includes("INSERT INTO business_billing")) {
      const businessId = String(vals[0])
      const monthly = Number(vals[1])
      const statusVal = vals.find(
        (v) => typeof v === "string" && ["al_dia", "pendiente", "vencido"].includes(v as string)
      )
      const status = String(statusVal ?? "al_dia")
      const dates = vals.filter((v) => v instanceof Date) as Date[]
      const last = dates[0] ?? now
      const next = dates[1] ?? new Date(last.getTime() + 30 * 864e5)
      store.billing.set(businessId, {
        monthly_amount_cents: monthly,
        status,
        last_payment_at: last,
        next_due_at: next,
      })
      return []
    }

    if (q.includes("INSERT INTO business_billing_payments")) {
      const businessId = String(vals[0])
      const amount = Number(vals[1])
      store.payments.push({ business_id: businessId, amount_cents: amount })
      return [{ id: `payrow-${store.payments.length}` }]
    }

    return []
  })
  return sql as unknown as SqlTagged
}

describe("applyProviderEvent", () => {
  const now = new Date("2026-10-05T15:00:00.000Z")

  test("payment_succeeded marks paid and provisions once", async () => {
    const store = makeStore(baseSession())
    const sql = makeSql(store, now)
    const event: ProviderEvent = {
      type: "payment_succeeded",
      providerEventId: "pay_1",
      externalReference: "sess-1",
      providerPaymentId: "pay_1",
      raw: { status: "approved" },
    }

    const r1 = await applyProviderEvent(
      {
        sql,
        now: () => now,
        newId: () => "11111111-aaaa-bbbb-cccc-ddddeeee0001",
        providerName: "mercadopago",
      },
      event
    )
    expect(r1.status).toBe(200)
    if (r1.status !== 200) return
    expect(r1.body.duplicate).toBe(false)
    expect(store.sessions.get("sess-1")?.status).toBe("provisioned")
    expect(store.businesses).toHaveLength(1)
    expect(store.ownerAccounts).toHaveLength(1)
    expect(store.ownerAccounts[0].email).toBe("ana@mail.com")
    expect(store.employees).toHaveLength(1)
    expect(store.employees[0].role).toBe("owner")
    expect(store.moduleSubs.map((m) => m.module_id)).toEqual(["loyalty"])
    expect(store.tenantSubs).toHaveLength(1)
    expect(store.tenantSubs[0].plan_id).toBe("basico")
    expect(store.billing.get(store.businesses[0].id)?.status).toBe("al_dia")
    expect(store.events.get("mercadopago:pay_1")?.processed_at).toEqual(now)

    // replay same event
    const r2 = await applyProviderEvent(
      {
        sql,
        now: () => now,
        newId: () => "should-not-use",
        providerName: "mercadopago",
      },
      event
    )
    expect(r2.status).toBe(200)
    if (r2.status !== 200) return
    expect(r2.body.duplicate).toBe(true)
    expect(store.businesses).toHaveLength(1)
    expect(store.tenantSubs).toHaveLength(1)
  })

  test("payment_failed moves session to failed", async () => {
    const store = makeStore(baseSession())
    const sql = makeSql(store, now)
    const event: ProviderEvent = {
      type: "payment_failed",
      providerEventId: "pay_fail",
      externalReference: "sess-1",
      raw: {},
    }
    const r = await applyProviderEvent(
      { sql, now: () => now, providerName: "mercadopago" },
      event
    )
    expect(r.status).toBe(200)
    expect(store.sessions.get("sess-1")?.status).toBe("failed")
    expect(store.businesses).toHaveLength(0)
  })

  test("missing session still records event and returns 404", async () => {
    const store = makeStore(null)
    const sql = makeSql(store, now)
    const r = await applyProviderEvent(
      { sql, now: () => now, providerName: "mercadopago" },
      {
        type: "payment_succeeded",
        providerEventId: "pay_x",
        externalReference: "nope",
        raw: {},
      }
    )
    expect(r.status).toBe(404)
    expect(store.events.has("mercadopago:pay_x")).toBe(true)
  })
})

describe("fake webhook → apply", () => {
  test("approved body through fake provider provisions", async () => {
    const now = new Date("2026-10-05T16:00:00.000Z")
    const store = makeStore(baseSession({ id: "sess-2", email: "bob@mail.com" }))
    const sql = makeSql(store, now)
    const provider = createFakeMercadoPagoProvider()
    const event = await provider.parseAndVerifyWebhook(
      JSON.stringify({
        id: "pay_bob",
        status: "approved",
        external_reference: "sess-2",
      }),
      {}
    )
    const r = await applyProviderEvent(
      {
        sql,
        now: () => now,
        newId: () => "22222222-aaaa-bbbb-cccc-ddddeeee0002",
        providerName: "mercadopago",
      },
      event
    )
    expect(r.status).toBe(200)
    expect(store.sessions.get("sess-2")?.status).toBe("provisioned")
    expect(store.businesses[0]?.name).toBe("Mi Local")
  })
})
