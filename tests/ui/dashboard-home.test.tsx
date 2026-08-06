import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import DashboardHome from "@/shell/dashboard/dashboard-home"
import {
  FeaturedCustomers,
  GoalCard,
  HomeActivityMetrics,
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

describe("Loyalty home section (hub tarjeta módulo)", () => {
  test("tarjeta Programa de premios con CTAs Atender y Cómo va", () => {
    const src = read("modules/loyalty/dashboard/home-section.tsx")
    expect(src).toContain("Programa de premios")
    expect(src).toContain("Atender clientes")
    expect(src).toContain("Cómo va el programa")
    expect(src).toContain("/dashboard/loyalty/numeros")
    expect(src).not.toContain("Fidelización")
    expect(src).not.toContain("Abrir Fidelización")
    expect(src).not.toContain("FeaturedCustomers")
    expect(src).not.toContain("HomeActivityMetrics")
  })

  test("empty 0 clientes prioriza Mostrar el QR", () => {
    const src = read("modules/loyalty/dashboard/home-section.tsx")
    expect(src).toContain("Mostrar el QR")
    expect(src).toContain("/dashboard/loyalty/qr")
  })

  test("quick actions siguen existiendo para reuso", () => {
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

describe("HomeActivityMetrics (Panel medio)", () => {
  test("solo clientes y compras del mes", () => {
    const html = renderToStaticMarkup(
      <HomeActivityMetrics customers={2} purchasesThisMonth={12} />
    )
    expect(html).toContain("Clientes")
    expect(html).toContain("Compras del mes")
    expect(html).toContain(">2<")
    expect(html).toContain(">12<")
    expect(html).not.toContain("Premios canjeados")
  })
})

describe("FeaturedCustomers (destacados por volumen)", () => {
  test("lista por total de compras e highlight", () => {
    const html = renderToStaticMarkup(
      <FeaturedCustomers
        customers={[
          { id: "1", name: "Ana Heavy", totalPurchases: 40 },
          { id: "2", name: "Bob Light", totalPurchases: 1 },
        ]}
        slug="carri"
      />
    )
    expect(html).toContain("Clientes destacados")
    expect(html).toContain("Ana Heavy")
    expect(html).toContain("40 compras")
    expect(html).toContain("1 compra")
    expect(html).toContain("/carri/dashboard/loyalty?highlight=1")
    expect(html).not.toContain("Más cerca del premio")
    expect(html).not.toContain("premios ganados")
  })

  test("empty empuja a QR", () => {
    const html = renderToStaticMarkup(
      <FeaturedCustomers customers={[]} slug="carri" />
    )
    expect(html).toContain("Clientes destacados")
    expect(html).toContain("Compartí el QR")
  })
})

describe("LoyaltyHomeSection hub wire", () => {
  test("hub usa metrics y weekly; sin rankings en home", () => {
    const src = read("modules/loyalty/dashboard/home-section.tsx")
    expect(src).toContain("getMetrics")
    expect(src).toContain("getWeeklyRedemptions")
    expect(src).not.toContain("GoalCard")
    expect(src).not.toContain("TopByPrizesList")
    expect(src).not.toContain("FeaturedCustomers")
    expect(src).not.toContain("LoyaltyHomeQuickActions")
  })
})

describe("Loyalty operate vs observe IA", () => {
  test("página loyalty solo opera — sin insights", () => {
    const page = read("app/(dashboard)/[slug]/dashboard/loyalty/page.tsx")
    expect(page).toContain("LoyaltyPanel")
    expect(page).not.toContain("LoyaltyModuleInsights")
    expect(page).not.toMatch(/border-t/)
  })

  test("página numeros monta insights + volver a clientes", () => {
    const page = read(
      "app/(dashboard)/[slug]/dashboard/loyalty/numeros/page.tsx"
    )
    expect(page).toContain("LoyaltyModuleInsights")
    expect(page).toContain("Volver a clientes")
    expect(page).toContain("Cómo va el programa")
    expect(page).toContain("Atender clientes")
    const insights = read("modules/loyalty/dashboard/module-insights.tsx")
    expect(insights).toContain("GoalCard")
    expect(insights).toContain("TopCustomers")
    expect(insights).toContain("TopByPrizesList")
    expect(insights).toContain("getWeeklyRedemptions")
  })
})

describe("MetricCard a11y baseline", () => {
  test("label de KPI usa al menos text-base (16px)", () => {
    const src = read("shell/ui/MetricCard.tsx")
    expect(src).toMatch(/text-base|text-\[1[6-9]px\]|text-\[2\dpx\]/)
    expect(src).not.toContain('text-[11px]')
  })
})

describe("DashboardHome saludo legible", () => {
  test("saludo usa al menos 16px", () => {
    const src = read("shell/dashboard/dashboard-home.tsx")
    expect(src).toMatch(/text-base|text-\[1[6-9]px\]|text-\[2\dpx\]/)
    expect(src).not.toContain('text-[13px]')
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
