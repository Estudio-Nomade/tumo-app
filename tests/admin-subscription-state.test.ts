import { describe, expect, test } from "bun:test"
import {
  upsertModuleSubscription,
  syncDetailModuleState,
  type ModuleSubscriptionSnapshot,
} from "@/modules/admin/lib/subscription-state"

describe("upsertModuleSubscription", () => {
  test("reemplaza fechas de un módulo existente sin tocar los demás", () => {
    const prev: ModuleSubscriptionSnapshot[] = [
      {
        module_id: "loyalty",
        status: "active",
        activated_at: "2026-08-30T13:48:28.000Z",
        billing_anchor_at: "2026-08-30T13:48:28.000Z",
        deactivated_at: null,
      },
      {
        module_id: "orders",
        status: "active",
        activated_at: "2026-08-01T12:00:00.000Z",
        billing_anchor_at: "2026-08-01T12:00:00.000Z",
        deactivated_at: null,
      },
    ]
    const next = upsertModuleSubscription(prev, {
      module_id: "loyalty",
      status: "active",
      activated_at: "2026-09-09T12:00:00.000Z",
      billing_anchor_at: "2026-09-09T12:00:00.000Z",
      deactivated_at: null,
    })
    expect(next.find((s) => s.module_id === "loyalty")?.activated_at).toBe(
      "2026-09-09T12:00:00.000Z"
    )
    expect(next.find((s) => s.module_id === "orders")?.activated_at).toBe(
      "2026-08-01T12:00:00.000Z"
    )
  })

  test("agrega suscripción si no existía", () => {
    const next = upsertModuleSubscription([], {
      module_id: "turnos",
      status: "active",
      activated_at: "2026-09-01T12:00:00.000Z",
      billing_anchor_at: "2026-09-01T12:00:00.000Z",
      deactivated_at: null,
    })
    expect(next).toHaveLength(1)
    expect(next[0].module_id).toBe("turnos")
  })
})

describe("syncDetailModuleState", () => {
  test("toma active_modules y subscriptions frescas del business (post refresh)", () => {
    const stale: ModuleSubscriptionSnapshot[] = [
      {
        module_id: "loyalty",
        status: "active",
        activated_at: "2026-08-30T13:48:28.000Z",
        billing_anchor_at: "2026-08-30T13:48:28.000Z",
        deactivated_at: null,
      },
    ]
    const synced = syncDetailModuleState({
      active_modules: ["loyalty", "orders"],
      module_subscriptions: [
        {
          module_id: "loyalty",
          status: "active",
          activated_at: "2026-09-09T12:00:00.000Z",
          billing_anchor_at: "2026-09-09T12:00:00.000Z",
          deactivated_at: null,
        },
        {
          module_id: "orders",
          status: "active",
          activated_at: "2026-09-09T12:00:00.000Z",
          billing_anchor_at: "2026-09-09T12:00:00.000Z",
          deactivated_at: null,
        },
      ],
      previousSubscriptions: stale,
    })
    expect(synced.modules).toEqual(["loyalty", "orders"])
    expect(synced.subscriptions.find((s) => s.module_id === "loyalty")?.activated_at).toBe(
      "2026-09-09T12:00:00.000Z"
    )
  })
})
