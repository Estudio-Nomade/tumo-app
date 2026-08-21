import { describe, expect, test } from "bun:test"
import { getActiveModules, type Business } from "@/lib/modules"
import { ordersModule } from "@/modules/orders"

const business: Business = {
  id: "biz-1",
  name: "El Auténtico Carri",
  slug: "carri",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["orders"],
  points_needed: 10,
  point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
  reward_name: "hamburguesa gratis",
}

describe("ordersModule", () => {
  test("id orders", () => {
    expect(ordersModule.id).toBe("orders")
  })

  test("name Pedidos", () => {
    expect(ordersModule.name).toBe("Pedidos")
  })

  test("dashboardPath orders", () => {
    expect(ordersModule.dashboardPath).toBe("orders")
  })
})

describe("registry", () => {
  test("orders se resuelve como módulo activo", () => {
    const mods = getActiveModules(business)
    expect(mods.map((m) => m.id)).toContain("orders")
    expect(mods.find((m) => m.id === "orders")).toBe(ordersModule)
  })
})
