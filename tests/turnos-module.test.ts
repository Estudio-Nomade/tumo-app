import { describe, expect, test } from "bun:test"
import { getActiveModules, getModuleDashboardHref, type Business } from "@/lib/modules"
import { turnosModule } from "@/modules/turnos"

const business: Business = {
  id: "biz-1",
  name: "Barbería Norte",
  slug: "barberia-norte",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["loyalty", "orders", "turnos"],
  points_needed: 10,
  point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
  reward_name: "corte gratis",
}

describe("turnosModule", () => {
  test("id turnos", () => {
    expect(turnosModule.id).toBe("turnos")
  })

  test("name Turnos", () => {
    expect(turnosModule.name).toBe("Turnos")
  })

  test("icon calendar", () => {
    expect(turnosModule.icon).toBe("calendar")
  })

  test("dashboardPath turnos", () => {
    expect(turnosModule.dashboardPath).toBe("turnos")
  })

  test("expone HomeSection", () => {
    expect(typeof turnosModule.HomeSection).toBe("function")
  })

  test("href dashboard", () => {
    expect(getModuleDashboardHref("barberia-norte", turnosModule)).toBe(
      "/barberia-norte/dashboard/turnos"
    )
  })
})

describe("registry multi-módulo con turnos", () => {
  test("getActiveModules resuelve loyalty + orders + turnos en orden", () => {
    const mods = getActiveModules(business)
    expect(mods.map((m) => m.id)).toEqual(["loyalty", "orders", "turnos"])
    expect(mods.find((m) => m.id === "turnos")).toBe(turnosModule)
  })

  test("sin turnos en active_modules no aparece", () => {
    const mods = getActiveModules({
      ...business,
      active_modules: ["loyalty", "orders"],
    })
    expect(mods.map((m) => m.id)).not.toContain("turnos")
  })
})
