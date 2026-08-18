import { describe, expect, mock, test } from "bun:test"
import {
  collectRecentActivity,
  getActiveModules,
  getModuleDashboardHref,
  type Business,
  type Module,
} from "@/lib/modules"
import { loyaltyModule } from "@/modules/loyalty"

const business: Business = {
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

  test("icon gift (Lucide)", () => {
    expect(loyaltyModule.icon).toBe("gift")
  })

  test("expone HomeSection y getRecentActivity", () => {
    expect(typeof loyaltyModule.HomeSection).toBe("function")
    expect(typeof loyaltyModule.getRecentActivity).toBe("function")
  })
})

describe("getModuleDashboardHref", () => {
  test("usa dashboardPath o id", () => {
    expect(getModuleDashboardHref("carri", loyaltyModule)).toBe(
      "/carri/dashboard/loyalty"
    )
  })
})

describe("collectRecentActivity", () => {
  test("mergea y ordena por timestamp", async () => {
    const a: Module = {
      id: "a",
      name: "A",
      icon: "a",
      getRecentActivity: mock(() =>
        Promise.resolve([
          {
            timestamp: 100,
            icon: "1",
            title: "old",
            description: "x",
          },
          {
            timestamp: 300,
            icon: "1",
            title: "new-a",
            description: "x",
          },
        ])
      ),
    }
    const b: Module = {
      id: "b",
      name: "B",
      icon: "b",
      getRecentActivity: mock(() =>
        Promise.resolve([
          {
            timestamp: 200,
            icon: "2",
            title: "mid",
            description: "y",
          },
        ])
      ),
    }

    const events = await collectRecentActivity([a, b], "biz-1", 10)
    expect(events.map((e) => e.title)).toEqual(["new-a", "mid", "old"])
  })

  test("respeta limit", async () => {
    const mod: Module = {
      id: "a",
      name: "A",
      icon: "a",
      getRecentActivity: async () =>
        [1, 2, 3, 4, 5].map((n) => ({
          timestamp: n * 100,
          icon: "i",
          title: `e${n}`,
          description: "",
        })),
    }
    const events = await collectRecentActivity([mod], "biz", 2)
    expect(events).toHaveLength(2)
    expect(events[0].title).toBe("e5")
  })

  test("módulos sin activity no rompen", async () => {
    const mod: Module = { id: "x", name: "X", icon: "x" }
    const events = await collectRecentActivity([mod], "biz", 5)
    expect(events).toEqual([])
  })
})
