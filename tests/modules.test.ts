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

  test("placeholder actual: array vacío aunque active_modules tenga loyalty", () => {
    const result = getActiveModules(business)
    expect(result).toEqual([])
    expect(business.active_modules).toContain("loyalty")
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
