import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import DashboardHome from "@/shell/dashboard/dashboard-home"
import {
  GoalCard,
  LoyaltyHomeQuickActions,
  TopCustomers,
} from "@/modules/loyalty/dashboard/widgets"

const root = join(import.meta.dir, "../..")

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

const topCustomers = [
  {
    id: "1",
    name: "María Real",
    purchases: 9,
    purchasesNeeded: 10,
    rewardName: "premio",
    canRedeem: false,
  },
  {
    id: "2",
    name: "Juan Listo",
    purchases: 10,
    purchasesNeeded: 10,
    rewardName: "premio",
    canRedeem: true,
  },
]

describe("DashboardHome shell (multi-módulo)", () => {
  test("saludo personalizado con nombre", () => {
    const html = renderToStaticMarkup(
      <DashboardHome employeeName="Nico">
        <div>sección módulo</div>
      </DashboardHome>
    )
    expect(html).toContain("Panel")
    expect(html).toContain("Hola, Nico. Así va tu comercio hoy.")
    expect(html).toContain("sección módulo")
  })

  test("saludo sin nombre usa fallback", () => {
    const html = renderToStaticMarkup(
      <DashboardHome>
        <span>x</span>
      </DashboardHome>
    )
    expect(html).toContain("Hola. Así va tu comercio hoy.")
  })

  test("page itera módulos, no importa metrics de loyalty directo", () => {
    const src = read("app/(dashboard)/[slug]/dashboard/page.tsx")
    expect(src).toContain("getActiveModules")
    expect(src).toContain("HomeSection")
    expect(src).not.toContain("from \"@/modules/loyalty/api/metrics\"")
  })
})

describe("Loyalty home section (lectura, no operación)", () => {
  test("home-section no monta CTAs Atender/Mostrar QR", () => {
    const src = read("modules/loyalty/dashboard/home-section.tsx")
    expect(src).toContain("Abrir Fidelización")
    expect(src).not.toContain("LoyaltyHomeQuickActions")
    expect(src).not.toContain("Atender clientes")
    expect(src).not.toContain("Mostrar QR")
  })

  test("quick actions siguen existiendo para reuso en panel si hace falta", () => {
    const html = renderToStaticMarkup(
      <LoyaltyHomeQuickActions slug="carri" />
    )
    expect(html).toContain("Atender clientes")
    expect(html).toContain("Mostrar QR")
  })
})

describe("GoalCard", () => {
  test("muestra progreso real vs target", () => {
    const html = renderToStaticMarkup(<GoalCard current={4} target={7} />)
    expect(html).toContain("Meta de la semana")
    expect(html).toContain("4 / 7 canjes")
    expect(html).toContain("semana pasada")
  })
})

describe("TopCustomers", () => {
  test("lista clientes reales y links a panel", () => {
    const html = renderToStaticMarkup(
      <TopCustomers customers={topCustomers} slug="carri" />
    )
    expect(html).toContain("Top clientes")
    expect(html).toContain("María Real")
    expect(html).toContain("/carri/dashboard/loyalty?highlight=1")
    expect(html).toContain("Ver todos")
  })

  test("empty state sin inventar gente", () => {
    const html = renderToStaticMarkup(
      <TopCustomers customers={[]} slug="carri" />
    )
    expect(html).toContain("Compartí el QR")
  })
})

describe("multi-módulo wiring", () => {
  test("loyalty exporta HomeSection", () => {
    const src = read("modules/loyalty/index.ts")
    expect(src).toContain("HomeSection")
    expect(src).toContain("LoyaltyHomeSection")
  })

  test("activity mergea módulos", () => {
    const src = read("app/(dashboard)/[slug]/dashboard/activity/page.tsx")
    expect(src).toContain("collectRecentActivity")
    expect(src).toContain("getActiveModules")
  })

  test("hub de módulos existe", () => {
    const src = read("app/(dashboard)/[slug]/dashboard/modules/page.tsx")
    expect(src).toContain("Módulos")
    expect(src).toContain("getActiveModules")
  })
})
