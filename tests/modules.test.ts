import { describe, expect, test } from "bun:test"
import { getActiveModules, type Business } from "@/lib/modules"
import { loyaltyModule } from "@/modules/loyalty"

const business: Business = {
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

describe("getActiveModules", () => {
  test("existe y es una función", () => {
    expect(typeof getActiveModules).toBe("function")
  })

  test("devuelve un array", () => {
    const result = getActiveModules(business)
    expect(Array.isArray(result)).toBe(true)
  })

  test("incluye loyalty cuando active_modules lo lista", () => {
    const result = getActiveModules(business)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("loyalty")
    expect(result[0]).toBe(loyaltyModule)
  })

  test("respeta el orden de active_modules", () => {
    const result = getActiveModules({
      ...business,
      active_modules: ["unknown", "loyalty"],
    })
    expect(result.map((m) => m.id)).toEqual(["loyalty"])
  })

  test("vacío si no hay módulos activos conocidos", () => {
    const result = getActiveModules({
      ...business,
      active_modules: [],
    })
    expect(result).toEqual([])
  })
})

describe("loyaltyModule", () => {
  test("id loyalty", () => {
    expect(loyaltyModule.id).toBe("loyalty")
  })

  test("name Fidelización", () => {
    expect(loyaltyModule.name).toBe("Fidelización")
  })

  test("icon Gift", () => {
    expect(loyaltyModule.icon).toBe("Gift")
  })
})
