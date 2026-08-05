import { describe, expect, mock, test } from "bun:test"
import {
  parseProgramUpdate,
  updateProgram,
  type ProgramUpdateDeps,
} from "@/modules/loyalty/api/program"
import type { Business } from "@/lib/modules"

const baseBusiness: Business = {
  id: "biz-1",
  name: "El Auténtico Carri",
  slug: "carri",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["loyalty"],
  purchases_needed: 10,
  reward_name: "hamburguesa gratis",
}

describe("parseProgramUpdate", () => {
  test("acepta N y premio válidos", () => {
    const r = parseProgramUpdate({
      purchases_needed: 8,
      reward_name: "  milanesa  ",
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toEqual({
        purchases_needed: 8,
        reward_name: "milanesa",
      })
    }
  })

  test("rechaza N fuera de rango", () => {
    expect(parseProgramUpdate({ purchases_needed: 1 }).ok).toBe(false)
    expect(parseProgramUpdate({ purchases_needed: 51 }).ok).toBe(false)
  })

  test("rechaza premio corto", () => {
    const r = parseProgramUpdate({ reward_name: "x" })
    expect(r.ok).toBe(false)
  })
})

describe("updateProgram", () => {
  test("owner actualiza programa", async () => {
    const updated = {
      ...baseBusiness,
      purchases_needed: 8,
      reward_name: "milanesa",
    }
    const deps: ProgramUpdateDeps = {
      updateProgramRow: mock(() => Promise.resolve(updated)),
    }
    const result = await updateProgram(deps, {
      businessId: "biz-1",
      role: "owner",
      patch: { purchases_needed: 8, reward_name: "milanesa" },
    })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      purchases_needed: 8,
      reward_name: "milanesa",
    })
  })

  test("employee recibe 403", async () => {
    const deps: ProgramUpdateDeps = {
      updateProgramRow: mock(() => Promise.resolve(baseBusiness)),
    }
    const result = await updateProgram(deps, {
      businessId: "biz-1",
      role: "employee",
      patch: { purchases_needed: 5 },
    })
    expect(result.status).toBe(403)
    expect(deps.updateProgramRow).not.toHaveBeenCalled()
  })
})
