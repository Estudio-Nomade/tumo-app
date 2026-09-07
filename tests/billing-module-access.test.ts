import { describe, expect, test } from "bun:test"
import type { Business } from "@/lib/modules"
import {
  evaluateModuleAccess,
  hasModuleAccess,
  isBillingOverdue,
  type BusinessBillingSnapshot,
} from "@/shell/billing/access"

const baseBusiness: Business = {
  id: "biz-1",
  name: "Test",
  slug: "test",
  logo: null,
  primary_color: "#000",
  secondary_color: "#fff",
  active_modules: ["loyalty", "orders", "turnos"],
  points_needed: 10,
  reward_name: "premio",
  point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
}

const now = new Date("2026-09-07T15:00:00.000Z")

describe("isBillingOverdue", () => {
  test("sin billing no bloquea", () => {
    expect(isBillingOverdue(null, now)).toBe(false)
    expect(isBillingOverdue(undefined, now)).toBe(false)
  })

  test("status vencido bloquea aunque next_due futuro", () => {
    const b: BusinessBillingSnapshot = {
      status: "vencido",
      next_due_at: "2026-12-01T00:00:00.000Z",
    }
    expect(isBillingOverdue(b, now)).toBe(true)
  })

  test("al_dia con next_due futuro no bloquea", () => {
    expect(
      isBillingOverdue(
        { status: "al_dia", next_due_at: "2026-10-01T00:00:00.000Z" },
        now
      )
    ).toBe(false)
  })

  test("al_dia con next_due pasado bloquea (lazy)", () => {
    expect(
      isBillingOverdue(
        { status: "al_dia", next_due_at: "2026-09-01T00:00:00.000Z" },
        now
      )
    ).toBe(true)
  })

  test("pendiente sin next_due no bloquea", () => {
    expect(
      isBillingOverdue({ status: "pendiente", next_due_at: null }, now)
    ).toBe(false)
  })

  test("pendiente con next_due pasado bloquea", () => {
    expect(
      isBillingOverdue(
        { status: "pendiente", next_due_at: new Date("2026-08-01T00:00:00.000Z") },
        now
      )
    ).toBe(true)
  })

  test("next_due_at exactamente igual a now bloquea", () => {
    expect(
      isBillingOverdue(
        { status: "al_dia", next_due_at: now.toISOString() },
        now
      )
    ).toBe(true)
  })
})

describe("hasModuleAccess", () => {
  test("false si el módulo no está contratado", () => {
    const biz: Business = {
      ...baseBusiness,
      active_modules: ["loyalty"],
      billing_status: "al_dia",
      billing_next_due_at: "2026-10-01T00:00:00.000Z",
    }
    expect(hasModuleAccess(biz, "orders", now)).toBe(false)
    expect(hasModuleAccess(biz, "loyalty", now)).toBe(true)
  })

  test("false si contratado pero billing vencido", () => {
    const biz: Business = {
      ...baseBusiness,
      billing_status: "vencido",
      billing_next_due_at: null,
    }
    expect(hasModuleAccess(biz, "orders", now)).toBe(false)
    expect(hasModuleAccess(biz, "turnos", now)).toBe(false)
    expect(hasModuleAccess(biz, "loyalty", now)).toBe(false)
  })

  test("false si next_due pasado aunque status al_dia", () => {
    const biz: Business = {
      ...baseBusiness,
      billing_status: "al_dia",
      billing_next_due_at: "2026-01-01T00:00:00.000Z",
    }
    expect(hasModuleAccess(biz, "orders", now)).toBe(false)
  })

  test("true si contratado y al día", () => {
    const biz: Business = {
      ...baseBusiness,
      billing_status: "al_dia",
      billing_next_due_at: "2026-10-07T00:00:00.000Z",
    }
    expect(hasModuleAccess(biz, "orders", now)).toBe(true)
  })

  test("true si sin campos billing (legacy)", () => {
    expect(hasModuleAccess(baseBusiness, "orders", now)).toBe(true)
  })
})

describe("evaluateModuleAccess", () => {
  test("ok si contratado y al día", () => {
    const biz: Business = {
      ...baseBusiness,
      billing_status: "al_dia",
      billing_next_due_at: "2026-10-07T00:00:00.000Z",
    }
    expect(evaluateModuleAccess(biz, "orders", now)).toEqual({
      ok: true,
      reason: "ok",
    })
  })

  test("not_contracted si no está en active_modules", () => {
    const biz: Business = {
      ...baseBusiness,
      active_modules: ["loyalty"],
      billing_status: "al_dia",
      billing_next_due_at: "2026-10-01T00:00:00.000Z",
    }
    expect(evaluateModuleAccess(biz, "orders", now)).toEqual({
      ok: false,
      reason: "not_contracted",
    })
  })

  test("billing_overdue si contratado pero mora (prioridad sobre contrato)", () => {
    const biz: Business = {
      ...baseBusiness,
      billing_status: "vencido",
      billing_next_due_at: null,
    }
    expect(evaluateModuleAccess(biz, "orders", now)).toEqual({
      ok: false,
      reason: "billing_overdue",
    })
  })

  test("not_contracted gana si no tiene el módulo aunque también esté vencido", () => {
    const biz: Business = {
      ...baseBusiness,
      active_modules: ["loyalty"],
      billing_status: "vencido",
    }
    expect(evaluateModuleAccess(biz, "orders", now)).toEqual({
      ok: false,
      reason: "not_contracted",
    })
  })
})
