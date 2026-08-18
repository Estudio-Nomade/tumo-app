import { describe, expect, mock, test } from "bun:test"
import {
  parseBusinessUpdate,
  updateBusiness,
  type BusinessUpdateDeps,
} from "@/shell/business/update"
import type { Business } from "@/lib/modules"

const baseBusiness: Business = {
  id: "biz-1",
  name: "El Auténtico Carri",
  slug: "carri",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["loyalty"],
  points_needed: 10,
  point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
  reward_name: "hamburguesa gratis",
}

describe("parseBusinessUpdate", () => {
  test("acepta body parcial válido", () => {
    const r = parseBusinessUpdate({
      name: "  Nuevo  ",
      primary_color: "#ef4444",
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toEqual({
        name: "Nuevo",
        primary_color: "#EF4444",
      })
    }
  })

  test("rechaza nombre corto", () => {
    const r = parseBusinessUpdate({ name: "A" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/nombre/i)
  })

  test("rechaza hex inválido", () => {
    const r = parseBusinessUpdate({ primary_color: "naranja" })
    expect(r.ok).toBe(false)
  })

  test("rechaza body vacío", () => {
    const r = parseBusinessUpdate({})
    expect(r.ok).toBe(false)
  })
})

describe("updateBusiness", () => {
  test("owner actualiza y devuelve business", async () => {
    const updated = { ...baseBusiness, name: "Nuevo", primary_color: "#EF4444" }
    const deps: BusinessUpdateDeps = {
      updateBusinessRow: mock(() => Promise.resolve(updated)),
    }
    const result = await updateBusiness(deps, {
      businessId: "biz-1",
      role: "owner",
      patch: { name: "Nuevo", primary_color: "#EF4444" },
    })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      name: "Nuevo",
      primary_color: "#EF4444",
    })
    expect(deps.updateBusinessRow).toHaveBeenCalledWith("biz-1", {
      name: "Nuevo",
      primary_color: "#EF4444",
    })
  })

  test("employee recibe 403", async () => {
    const deps: BusinessUpdateDeps = {
      updateBusinessRow: mock(() => Promise.resolve(baseBusiness)),
    }
    const result = await updateBusiness(deps, {
      businessId: "biz-1",
      role: "employee",
      patch: { name: "Hack" },
    })
    expect(result.status).toBe(403)
    expect(deps.updateBusinessRow).not.toHaveBeenCalled()
  })
})
