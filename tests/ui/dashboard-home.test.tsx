import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import DashboardHome from "@/shell/dashboard/dashboard-home"
import {
  GoalCard,
  LoyaltyHomeQuickActions,
  LoyaltyTimeline,
  TopByPrizesList,
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

describe("TopCustomers (lista A — más cerca del premio)", () => {
  test("lista clientes reales y links a panel", () => {
    const html = renderToStaticMarkup(
      <TopCustomers customers={topCustomers} slug="carri" />
    )
    expect(html).toContain("Más cerca del premio")
    expect(html).toContain("María Real")
    expect(html).toContain("/carri/dashboard/loyalty?highlight=1")
    expect(html).toContain("Ver todos")
    expect(html).toContain("En curso")
    expect(html).toContain("Listo")
  })

  test("empty state empuja a mostrar QR del módulo", () => {
    const html = renderToStaticMarkup(
      <TopCustomers customers={[]} slug="carri" />
    )
    expect(html).toContain("Más cerca del premio")
    expect(html).toContain("Compartí el QR")
    expect(html).not.toContain("settings")
  })
})

describe("TopByPrizesList (lista B — más premios ganados)", () => {
  const byPrizes = [
    {
      id: "p1",
      name: "Ana Premios",
      prizes: 4,
      lastRedeemedAt: Date.parse("2026-08-04T12:00:00Z"),
    },
    {
      id: "p2",
      name: "Bob Premios",
      prizes: 1,
      lastRedeemedAt: null,
    },
  ]

  test("muestra header de canjeadores, filas y highlight", () => {
    const html = renderToStaticMarkup(
      <TopByPrizesList
        customers={byPrizes}
        redeemersCount={7}
        slug="carri"
      />
    )
    expect(html).toContain("Más premios ganados")
    expect(html).toContain("7 clientes canjearon")
    expect(html).toContain("Ana Premios")
    expect(html).toContain("4 premios")
    expect(html).toContain("1 premio")
    expect(html).toContain("/carri/dashboard/loyalty?highlight=p1")
  })

  test("singular en header con un solo canjeador", () => {
    const html = renderToStaticMarkup(
      <TopByPrizesList
        customers={[
          {
            id: "p1",
            name: "Solo Uno",
            prizes: 1,
            lastRedeemedAt: null,
          },
        ]}
        redeemersCount={1}
        slug="carri"
      />
    )
    expect(html).toContain("1 cliente canjeó")
    expect(html).toContain("1 premio")
  })

  test("empty state con cero canjeadores", () => {
    const html = renderToStaticMarkup(
      <TopByPrizesList customers={[]} redeemersCount={0} slug="carri" />
    )
    expect(html).toContain("Más premios ganados")
    expect(html).toContain("0 clientes canjearon")
    expect(html).toContain("Todavía nadie canjeó un premio.")
  })
})

describe("LoyaltyHomeSection wire ranking", () => {
  test("home-section carga ambos rankings y conteo de canjeadores", () => {
    const src = read("modules/loyalty/dashboard/home-section.tsx")
    expect(src).toContain("getTopCustomers")
    expect(src).toContain("getTopCustomersByPrizes")
    expect(src).toContain("countCustomersWithRedemptions")
    expect(src).toContain("TopByPrizesList")
    expect(src).toContain("TopCustomers")
    expect(src).not.toContain("LoyaltyHomeQuickActions")
  })
})

describe("LoyaltyTimeline (Pencil 6 · Actividad)", () => {
  test("nombre arriba, detalle con compras abajo, sin emojis", () => {
    const ts = new Date("2026-08-05T14:32:00").getTime()
    const html = renderToStaticMarkup(
      <LoyaltyTimeline
        events={[
          {
            timestamp: ts,
            icon: "purchase",
            title: "María González",
            description: "8° compra",
          },
          {
            timestamp: ts - 60_000,
            icon: "redemption",
            title: "Juan Rodríguez",
            description: "10° compra · ¡Premio canjeado!",
          },
        ]}
      />
    )
    expect(html).toContain("María González")
    expect(html).toContain("8° compra")
    expect(html).toContain("Juan Rodríguez")
    expect(html).toContain("10° compra · ¡Premio canjeado!")
    expect(html).toContain("14:32")
    expect(html).not.toContain("🎫")
    expect(html).not.toContain("🎁")
    expect(html).not.toContain("Visita sumada")
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
