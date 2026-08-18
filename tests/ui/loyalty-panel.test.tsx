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
    points: 8,
    pointsNeeded: 10,
    rewardName: "premio",
    canRedeem: false,
  },
  {
    id: "2",
    name: "Juan Rodríguez",
    phone: "3515550102",
    code: "7392",
    points: 10,
    pointsNeeded: 10,
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
  points_needed: 10,
  point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
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

describe("loyalty panel source (scanner + points)", () => {
  const src = read("modules/loyalty/dashboard/panel.tsx")
  const sheet = read("modules/loyalty/dashboard/customer-action-sheet.tsx")
  const scanner = read("modules/loyalty/dashboard/loyalty-scanner.tsx")

  test("scanner es vista principal + plan B QR", () => {
    expect(src).toContain("LoyaltyScanner")
    expect(src).toContain("Escanear")
    expect(src).toContain("¿No funciona el QR?")
    expect(src).toContain("Ingresar código")
    expect(scanner).toContain("@yudiel/react-qr-scanner")
  })

  test("sheet de acción + APIs points/redemptions", () => {
    expect(src).toContain("CustomerActionSheet")
    expect(sheet).toContain("/api/loyalty/points")
    expect(sheet).toContain("/api/loyalty/redemptions")
    expect(sheet).toContain("SUMAR PUNTOS")
    expect(sheet).toContain('side="bottom"')
  })

  test("carga lista real por API, sin MOCK_CUSTOMERS", () => {
    expect(src).toContain("/api/loyalty/customers?list=1")
    expect(src).not.toContain("MOCK_CUSTOMERS")
  })

  test("código 4 dígitos busca por API", () => {
    expect(src).toContain("code: digits")
    expect(src).toContain("slug: business.slug")
    expect(src).toContain("/api/loyalty/customers?")
  })

  test("deep link ?c= abre lookup", () => {
    expect(src).toContain('searchParams.get("c")')
    expect(src).toContain("codeFromUrl")
  })

  test("panel ancho full mobile", () => {
    const rootMatch = src.match(
      /<div className="(relative mx-auto flex w-full flex-col gap-4[^"]*)">/
    )
    expect(rootMatch).not.toBeNull()
    expect(rootMatch![1]).toContain("md:max-w-2xl")
  })

  test("avatar colors cycle length 4", () => {
    expect(AVATAR_COLORS).toHaveLength(4)
  })

  test("contador puntos en fila", () => {
    expect(src).toContain("{customer.points}/{customer.pointsNeeded}")
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
