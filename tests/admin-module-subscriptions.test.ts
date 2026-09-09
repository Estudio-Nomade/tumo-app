import { describe, expect, mock, test } from "bun:test"
import {
  activateModule,
  deactivateModule,
  patchModuleSubscription,
  type AdminModuleSubscriptionsDeps,
} from "@/modules/admin/api/module-subscriptions"
import { PRICE_PER_MODULE_CENTS } from "@/shell/billing/pricing"

type Store = {
  business?: { id: string; slug: string; active_modules: string[] }
  subs: {
    module_id: string
    status: string
    activated_at: Date
    billing_anchor_at: Date
    deactivated_at: Date | null
  }[]
  billing: {
    monthly_amount_cents: number
    status: string
    last_payment_at: Date | null
    next_due_at: Date | null
  } | null
}

function makeDeps(store: Store, now = new Date("2026-09-10T12:00:00.000Z")) {
  const queries: string[] = []
  const sql = mock(async (strings: TemplateStringsArray, ...vals: unknown[]) => {
    const q = strings.join(" ")
    queries.push(q)

    if (q.includes("FROM businesses") && q.includes("LIMIT 1") && !q.includes("UPDATE")) {
      if (!store.business) return []
      return [store.business]
    }
    if (q.includes("FROM business_module_subscriptions")) {
      return store.subs.map((s) => ({ ...s, business_id: store.business?.id }))
    }
    if (q.includes("FROM business_billing")) {
      return store.billing ? [store.billing] : []
    }
    if (q.includes("INSERT INTO business_module_subscriptions") || q.includes("ON CONFLICT (business_id, module_id)")) {
      const moduleId = vals.find((v) => typeof v === "string" && ["loyalty", "orders", "turnos"].includes(v as string)) as string | undefined
      // crude: last string module id in values
      const mid =
        [...vals].reverse().find(
          (v) => typeof v === "string" && !String(v).includes("-") && v.length < 20 && v !== "active" && v !== "inactive" && v !== "pendiente" && v !== "al_dia"
        ) as string | undefined
      const id = moduleId ?? mid ?? "loyalty"
      const dates = vals.filter((v) => v instanceof Date) as Date[]
      const activated = dates[0] ?? now
      const anchor = dates[1] ?? dates[0] ?? now
      const existing = store.subs.find((s) => s.module_id === id)
      if (existing) {
        existing.status = "active"
        existing.activated_at = activated
        existing.billing_anchor_at = anchor
        existing.deactivated_at = null
      } else {
        store.subs.push({
          module_id: id,
          status: "active",
          activated_at: activated,
          billing_anchor_at: anchor,
          deactivated_at: null,
        })
      }
      return [{ module_id: id, status: "active", activated_at: activated, billing_anchor_at: anchor }]
    }
    if (
      q.includes("UPDATE business_module_subscriptions") &&
      q.includes("deactivated_at")
    ) {
      const mid = vals.find((v) =>
        typeof v === "string" && store.subs.some((s) => s.module_id === v)
      ) as string
      const sub = store.subs.find((s) => s.module_id === mid)
      if (sub) {
        sub.status = "inactive"
        sub.deactivated_at = now
      }
      return sub
        ? [
            {
              ...sub,
              status: "inactive",
              deactivated_at: now,
            },
          ]
        : []
    }
    if (q.includes("UPDATE business_module_subscriptions") && q.includes("billing_anchor_at")) {
      const mid = vals.find((v) => typeof v === "string" && store.subs.some((s) => s.module_id === v)) as string
      const dates = vals.filter((v) => v instanceof Date) as Date[]
      const sub = store.subs.find((s) => s.module_id === mid)
      if (sub && dates[0]) {
        if (q.includes("activated_at")) sub.activated_at = dates[0]
        if (dates.length >= 2) sub.billing_anchor_at = dates[1]
        else if (q.includes("billing_anchor_at") && dates[0]) sub.billing_anchor_at = dates[dates.length - 1]
      }
      return sub ? [sub] : []
    }
    if (q.includes("UPDATE businesses") && q.includes("active_modules")) {
      const mods = vals.find((v) => Array.isArray(v)) as string[]
      if (store.business) store.business.active_modules = mods
      return store.business ? [store.business] : []
    }
    if (q.includes("INSERT INTO business_billing") || q.includes("UPDATE business_billing")) {
      const monthly = vals.find((v) => typeof v === "number") as number | undefined
      const nextDue = vals.find((v) => v instanceof Date) as Date | undefined
      if (!store.billing) {
        store.billing = {
          monthly_amount_cents: monthly ?? 0,
          status: "pendiente",
          last_payment_at: null,
          next_due_at: nextDue ?? null,
        }
      } else {
        if (monthly != null) store.billing.monthly_amount_cents = monthly
        if (q.includes("next_due_at") && nextDue) store.billing.next_due_at = nextDue
        if (q.includes("status") && vals.includes("pendiente")) store.billing.status = "pendiente"
      }
      return store.billing ? [store.billing] : []
    }
    return []
  })

  return {
    deps: {
      sql: sql as unknown as AdminModuleSubscriptionsDeps["sql"],
      getRegisteredIds: () => ["loyalty", "orders", "turnos"],
      now: () => now,
    } satisfies AdminModuleSubscriptionsDeps,
    store,
    queries,
  }
}

describe("activateModule", () => {
  test("400 sin businessId o moduleId", async () => {
    const { deps } = makeDeps({ business: undefined, subs: [], billing: null })
    expect((await activateModule(deps, {})).status).toBe(400)
  })

  test("404 negocio", async () => {
    const { deps } = makeDeps({ business: undefined, subs: [], billing: null })
    const r = await activateModule(deps, {
      businessId: "missing",
      moduleId: "loyalty",
      activatedAt: "2026-09-01",
    })
    expect(r.status).toBe(404)
  })

  test("400 módulo no registrado", async () => {
    const { deps } = makeDeps({
      business: { id: "b1", slug: "carri", active_modules: [] },
      subs: [],
      billing: null,
    })
    const r = await activateModule(deps, {
      businessId: "b1",
      moduleId: "hacker",
    })
    expect(r.status).toBe(400)
  })

  test("activa loyalty 2026-09-01 sin pago → monthly 6999, next_due 2026-10-01, active_modules sync", async () => {
    const store: Store = {
      business: { id: "b1", slug: "carri", active_modules: [] },
      subs: [],
      billing: null,
    }
    const { deps } = makeDeps(store)
    const r = await activateModule(deps, {
      businessId: "b1",
      moduleId: "loyalty",
      activatedAt: "2026-09-01",
    })
    expect(r.status).toBe(200)
    expect(r.body.active_modules).toEqual(["loyalty"])
    expect(r.body.monthly_amount_cents).toBe(PRICE_PER_MODULE_CENTS)
    expect(r.body.next_due_at).toBe("2026-10-01T12:00:00.000Z")
    expect(store.business?.active_modules).toEqual(["loyalty"])
    expect(store.subs[0]?.status).toBe("active")
  })

  test("2º módulo mid-cycle no mueve next_due; sube monthly a 13998", async () => {
    const store: Store = {
      business: { id: "b1", slug: "carri", active_modules: ["loyalty"] },
      subs: [
        {
          module_id: "loyalty",
          status: "active",
          activated_at: new Date("2026-09-01T12:00:00.000Z"),
          billing_anchor_at: new Date("2026-09-01T12:00:00.000Z"),
          deactivated_at: null,
        },
      ],
      billing: {
        monthly_amount_cents: 6999,
        status: "al_dia",
        last_payment_at: new Date("2026-09-15T12:00:00.000Z"),
        next_due_at: new Date("2026-10-15T12:00:00.000Z"),
      },
    }
    const { deps } = makeDeps(store)
    const r = await activateModule(deps, {
      businessId: "b1",
      moduleId: "orders",
      activatedAt: "2026-09-20",
    })
    expect(r.status).toBe(200)
    expect(r.body.monthly_amount_cents).toBe(13998)
    expect(r.body.next_due_at).toBe("2026-10-15T12:00:00.000Z")
    expect(r.body.active_modules).toEqual(["loyalty", "orders"])
  })
})

describe("deactivateModule", () => {
  test("desactiva loyalty → monthly baja; next_due intacto", async () => {
    const store: Store = {
      business: {
        id: "b1",
        slug: "carri",
        active_modules: ["loyalty", "orders"],
      },
      subs: [
        {
          module_id: "loyalty",
          status: "active",
          activated_at: new Date("2026-09-01T12:00:00.000Z"),
          billing_anchor_at: new Date("2026-09-01T12:00:00.000Z"),
          deactivated_at: null,
        },
        {
          module_id: "orders",
          status: "active",
          activated_at: new Date("2026-09-20T12:00:00.000Z"),
          billing_anchor_at: new Date("2026-09-20T12:00:00.000Z"),
          deactivated_at: null,
        },
      ],
      billing: {
        monthly_amount_cents: 13998,
        status: "al_dia",
        last_payment_at: new Date("2026-09-15T12:00:00.000Z"),
        next_due_at: new Date("2026-10-15T12:00:00.000Z"),
      },
    }
    const { deps } = makeDeps(store)
    const r = await deactivateModule(deps, {
      businessId: "b1",
      moduleId: "loyalty",
    })
    expect(r.status).toBe(200)
    expect(r.body.active_modules).toEqual(["orders"])
    expect(r.body.monthly_amount_cents).toBe(6999)
    expect(r.body.next_due_at).toBe("2026-10-15T12:00:00.000Z")
    expect(store.subs.find((s) => s.module_id === "loyalty")?.status).toBe(
      "inactive"
    )
  })

  test("0 módulos → monthly 0, next_due null", async () => {
    const store: Store = {
      business: { id: "b1", slug: "carri", active_modules: ["loyalty"] },
      subs: [
        {
          module_id: "loyalty",
          status: "active",
          activated_at: new Date("2026-09-01T12:00:00.000Z"),
          billing_anchor_at: new Date("2026-09-01T12:00:00.000Z"),
          deactivated_at: null,
        },
      ],
      billing: {
        monthly_amount_cents: 6999,
        status: "pendiente",
        last_payment_at: null,
        next_due_at: new Date("2026-10-01T12:00:00.000Z"),
      },
    }
    const { deps } = makeDeps(store)
    const r = await deactivateModule(deps, {
      businessId: "b1",
      moduleId: "loyalty",
    })
    expect(r.status).toBe(200)
    expect(r.body.active_modules).toEqual([])
    expect(r.body.monthly_amount_cents).toBe(0)
    expect(r.body.next_due_at).toBeNull()
  })
})

describe("patchModuleSubscription", () => {
  test("editar ancla sin pagos regenera next_due", async () => {
    const store: Store = {
      business: { id: "b1", slug: "carri", active_modules: ["loyalty"] },
      subs: [
        {
          module_id: "loyalty",
          status: "active",
          activated_at: new Date("2026-09-01T12:00:00.000Z"),
          billing_anchor_at: new Date("2026-09-01T12:00:00.000Z"),
          deactivated_at: null,
        },
      ],
      billing: {
        monthly_amount_cents: 6999,
        status: "pendiente",
        last_payment_at: null,
        next_due_at: new Date("2026-10-01T12:00:00.000Z"),
      },
    }
    const { deps } = makeDeps(store)
    const r = await patchModuleSubscription(deps, {
      businessId: "b1",
      moduleId: "loyalty",
      billingAnchorAt: "2026-09-05",
    })
    expect(r.status).toBe(200)
    expect(r.body.next_due_at).toBe("2026-10-05T12:00:00.000Z")
  })

  test("editar ancla con last_payment no mueve next_due", async () => {
    const store: Store = {
      business: { id: "b1", slug: "carri", active_modules: ["loyalty"] },
      subs: [
        {
          module_id: "loyalty",
          status: "active",
          activated_at: new Date("2026-09-01T12:00:00.000Z"),
          billing_anchor_at: new Date("2026-09-01T12:00:00.000Z"),
          deactivated_at: null,
        },
      ],
      billing: {
        monthly_amount_cents: 6999,
        status: "al_dia",
        last_payment_at: new Date("2026-09-15T12:00:00.000Z"),
        next_due_at: new Date("2026-10-15T12:00:00.000Z"),
      },
    }
    const { deps } = makeDeps(store)
    const r = await patchModuleSubscription(deps, {
      businessId: "b1",
      moduleId: "loyalty",
      billingAnchorAt: "2026-09-05",
    })
    expect(r.status).toBe(200)
    expect(r.body.next_due_at).toBe("2026-10-15T12:00:00.000Z")
  })
})
