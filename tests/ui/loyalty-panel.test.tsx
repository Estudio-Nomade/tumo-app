import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import {
  AVATAR_COLORS,
  MOCK_CUSTOMERS,
  filterCustomers,
  customerInitials,
} from "@/modules/loyalty/dashboard/panel"
import { BusinessProvider } from "@/shell/context/business"
import type { Business } from "@/lib/modules"

const root = join(import.meta.dir, "../..")

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

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
    const result = filterCustomers(MOCK_CUSTOMERS, "maría")
    expect(result).toHaveLength(1)
    expect(result[0].name).toContain("María")
  })

  test("filtra por teléfono parcial", () => {
    const result = filterCustomers(MOCK_CUSTOMERS, "351")
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((c) => c.phone.includes("351"))).toBe(true)
  })

  test("query vacío devuelve todos", () => {
    expect(filterCustomers(MOCK_CUSTOMERS, "  ")).toHaveLength(
      MOCK_CUSTOMERS.length
    )
  })

  test("sin match devuelve vacío", () => {
    expect(filterCustomers(MOCK_CUSTOMERS, "zzzz-nope")).toEqual([])
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

describe("MOCK_CUSTOMERS", () => {
  test("al menos 4 clientes con canRedeem mixto", () => {
    expect(MOCK_CUSTOMERS.length).toBeGreaterThanOrEqual(4)
    expect(MOCK_CUSTOMERS.some((c) => c.canRedeem)).toBe(true)
    expect(MOCK_CUSTOMERS.some((c) => !c.canRedeem)).toBe(true)
  })

  test("avatar colors cycle length 4", () => {
    expect(AVATAR_COLORS).toHaveLength(4)
  })
})

describe("loyalty panel source (Pencil EDNqK)", () => {
  const src = read("modules/loyalty/dashboard/panel.tsx")

  test("header Clientes + negocio · Hoy + sandwich logo", () => {
    expect(src).toContain("Clientes")
    expect(src).toContain("· Hoy")
    expect(src).toContain("useBusiness")
    expect(src).toContain("Sandwich")
    expect(src).toContain("h-10 w-10")
    expect(src).toContain("rounded-[12px]")
  })

  test("search live sin botón Buscar", () => {
    expect(src).toContain("Buscar por nombre o teléfono")
    expect(src).toContain("Search")
    expect(src).not.toMatch(/>Buscar</)
    expect(src).toContain("onChange")
  })

  test("botones acción verde y dorado con gift", () => {
    expect(src).toContain("+1 compra")
    expect(src).toContain("Canjear premio")
    expect(src).toContain("#16A34A")
    expect(src).toContain("#EAB308")
    expect(src).toContain("Gift")
  })

  test("ingresar código con Keyboard debajo de lista", () => {
    expect(src).toContain("Ingresar código")
    expect(src).toContain("Keyboard")
  })

  test("empty filter copy", () => {
    expect(src).toContain("No se encontraron clientes.")
  })

  test("progress bar fixed width ~88px", () => {
    expect(src).toContain("w-[88px]")
    expect(src).toContain("h-1.5")
  })
})

describe("BusinessProvider smoke for panel exports", () => {
  test("provider wraps children", () => {
    const html = renderToStaticMarkup(
      <BusinessProvider business={business}>
        <span>{business.name}</span>
      </BusinessProvider>
    )
    expect(html).toContain("El Auténtico Carri")
  })
})
