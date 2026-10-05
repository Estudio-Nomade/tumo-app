import { describe, expect, test } from "bun:test"
import {
  PLAN_CATALOG,
  PRICE_VERSION,
  cupoForPlan,
  getPlan,
  isValidModuleSelection,
  planLabel,
  saasStatusLabel,
  type PlanId,
} from "@/shell/billing/plan-catalog"

describe("plan-catalog", () => {
  test("PRICE_VERSION starts at 1", () => {
    expect(PRICE_VERSION).toBe(1)
  })

  test("three plans basico pro full with cupo and USD cents", () => {
    expect(PLAN_CATALOG.map((p) => p.id)).toEqual(["basico", "pro", "full"])
    expect(getPlan("basico")).toMatchObject({
      id: "basico",
      cupo: 1,
      amountUsdCentsMonth: 3999,
    })
    expect(getPlan("pro")).toMatchObject({ cupo: 3, amountUsdCentsMonth: 8999 })
    expect(getPlan("full")).toMatchObject({
      cupo: Number.POSITIVE_INFINITY,
      amountUsdCentsMonth: 12999,
    })
  })

  test("cupoForPlan matches catalog", () => {
    expect(cupoForPlan("basico")).toBe(1)
    expect(cupoForPlan("pro")).toBe(3)
    expect(cupoForPlan("full")).toBe(Number.POSITIVE_INFINITY)
  })

  test("isValidModuleSelection enforces cupo and known ids", () => {
    const registry = ["loyalty", "orders", "turnos"]
    expect(
      isValidModuleSelection("basico", ["loyalty"], registry)
    ).toEqual({ ok: true })
    expect(
      isValidModuleSelection("basico", ["loyalty", "orders"], registry)
    ).toEqual({ ok: false, error: "cupo" })
    expect(
      isValidModuleSelection("pro", ["loyalty", "orders", "turnos"], registry)
    ).toEqual({ ok: true })
    expect(
      isValidModuleSelection("pro", ["loyalty", "orders", "turnos", "loyalty"], registry)
    ).toEqual({ ok: true }) // unique collapses to 3
    expect(
      isValidModuleSelection("basico", ["loyalty", "orders", "turnos"], registry)
    ).toEqual({ ok: false, error: "cupo" })
    expect(
      isValidModuleSelection("basico", ["nope"], registry)
    ).toEqual({ ok: false, error: "unknown_module" })
    expect(
      isValidModuleSelection("basico", [], registry)
    ).toEqual({ ok: false, error: "empty" })
    expect(
      isValidModuleSelection("full", ["loyalty", "orders", "turnos"], registry)
    ).toEqual({ ok: true })
  })

  test("full requires all registered modules (no partial)", () => {
    const registry = ["loyalty", "orders", "turnos"]
    expect(
      isValidModuleSelection("full", ["loyalty", "orders"], registry)
    ).toEqual({ ok: false, error: "full_requires_all" })
  })

  test("planLabel and saasStatusLabel ES-AR", () => {
    expect(planLabel("basico")).toBe("Básico")
    expect(planLabel("pro")).toBe("Pro")
    expect(planLabel("full")).toBe("Full")
    expect(planLabel("nope" as PlanId)).toBe("nope")
    expect(saasStatusLabel("active")).toBe("Activa")
    expect(saasStatusLabel("past_due")).toBe("Pago pendiente")
    expect(saasStatusLabel("paused")).toBe("Pausada")
    expect(saasStatusLabel("cancelled")).toBe("Cancelada")
  })

  test("each plan has ARS amount cents for checkout snapshot", () => {
    for (const p of PLAN_CATALOG) {
      expect(p.amountArsCentsMonth).toBeGreaterThan(0)
      expect(Number.isInteger(p.amountArsCentsMonth)).toBe(true)
    }
  })
})
