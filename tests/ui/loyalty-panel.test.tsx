import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import {
  AVATAR_COLORS,
  filterCustomers,
  customerInitials,
  type CustomerView,
} from "@/modules/loyalty/dashboard/panel"
import { BusinessProvider } from "@/shell/context/business"
import type { Business } from "@/lib/modules"

const root = join(import.meta.dir, "../..")

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

const sample: CustomerView[] = [
  {
    id: "1",
    name: "María González",
    phone: "3515550101",
    code: "4821",
    purchases: 8,
    purchasesNeeded: 10,
    rewardName: "premio",
    canRedeem: false,
  },
  {
    id: "2",
    name: "Juan Rodríguez",
    phone: "3515550102",
    code: "7392",
    purchases: 10,
    purchasesNeeded: 10,
    rewardName: "premio",
    canRedeem: true,
  },
]

const business: Business = {
  id: "b1",
  name: "El Auténtico Carri",
  slug: "carri",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["loyalty"],
  purchases_needed: 10,
  reward_name: "hamburguesa gratis",
}

describe("filterCustomers", () => {
  test("filtra por nombre case-insensitive", () => {
    const result = filterCustomers(sample, "maría")
    expect(result).toHaveLength(1)
    expect(result[0].name).toContain("María")
  })

  test("filtra por teléfono parcial", () => {
    const result = filterCustomers(sample, "351")
    expect(result.length).toBe(2)
  })

  test("query vacío devuelve todos", () => {
    expect(filterCustomers(sample, "  ")).toHaveLength(sample.length)
  })

  test("sin match devuelve vacío", () => {
    expect(filterCustomers(sample, "zzzz-nope")).toEqual([])
  })
})

describe("customerInitials", () => {
  test("dos palabras → dos letras", () => {
    expect(customerInitials("María González")).toBe("MG")
  })

  test("una palabra → una letra", () => {
    expect(customerInitials("Pedro")).toBe("P")
  })
})

describe("loyalty panel source (Pencil EDNqK + real data)", () => {
  const src = read("modules/loyalty/dashboard/panel.tsx")

  test("header Clientes + negocio · Hoy + sandwich logo", () => {
    expect(src).toContain("Clientes")
    expect(src).toContain("· Hoy")
    expect(src).toContain("useBusiness")
    expect(src).toContain("Sandwich")
  })

  test("carga lista real por API, sin MOCK_CUSTOMERS", () => {
    expect(src).toContain("/api/loyalty/customers?list=1")
    expect(src).not.toContain("MOCK_CUSTOMERS")
    expect(src).toContain("/api/loyalty/purchases")
    expect(src).toContain("/api/loyalty/redemptions")
  })

  test("ingresar código busca por API code+slug (tarjeta del cliente)", () => {
    expect(src).toContain("Ingresar código")
    expect(src).toContain("URLSearchParams")
    expect(src).toContain("code: digits")
    expect(src).toContain("slug: business.slug")
    expect(src).toContain("/api/loyalty/customers?")
    expect(src).toContain("Código del cliente")
  })

  test("search live sin botón Buscar", () => {
    expect(src).toContain("Buscar por nombre o teléfono")
    expect(src).toContain("Search")
    expect(src).not.toMatch(/>Buscar</)
  })

  test("botones acción verde y dorado", () => {
    expect(src).toContain("+1 compra")
    expect(src).toContain("Canjear premio")
    expect(src).toContain("#16A34A")
    expect(src).toContain("#EAB308")
  })

  test("avatar colors cycle length 4", () => {
    expect(AVATAR_COLORS).toHaveLength(4)
  })
})

describe("BusinessProvider smoke", () => {
  test("provider wraps children", () => {
    const html = renderToStaticMarkup(
      <BusinessProvider business={business}>
        <span>{business.name}</span>
      </BusinessProvider>
    )
    expect(html).toContain("El Auténtico Carri")
  })
})
