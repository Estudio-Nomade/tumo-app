import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
  DashboardHome,
  GoalCard,
  TopCustomers,
} from "@/modules/loyalty/dashboard/widgets"

const metrics = {
  customers: 128,
  purchasesThisMonth: 47,
  redemptionsThisMonth: 9,
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

describe("DashboardHome", () => {
  test("saludo personalizado con nombre", () => {
    const html = renderToStaticMarkup(
      <DashboardHome
        metrics={metrics}
        employeeName="Nico"
        topCustomers={topCustomers}
        weeklyGoal={{ thisWeek: 4, lastWeek: 7 }}
        slug="carri"
      />
    )
    expect(html).toContain("Panel")
    expect(html).toContain("Hola, Nico. Así va tu comercio hoy.")
    expect(html).toContain("Atender clientes")
  })

  test("saludo sin nombre usa fallback", () => {
    const html = renderToStaticMarkup(
      <DashboardHome
        metrics={metrics}
        topCustomers={[]}
        weeklyGoal={{ thisWeek: 0, lastWeek: 0 }}
        slug="carri"
      />
    )
    expect(html).toContain("Hola. Así va tu comercio hoy.")
  })

  test("incluye meta y top con datos reales pasados por props", () => {
    const html = renderToStaticMarkup(
      <DashboardHome
        metrics={metrics}
        employeeName="Nico"
        topCustomers={topCustomers}
        weeklyGoal={{ thisWeek: 4, lastWeek: 7 }}
        slug="carri"
      />
    )
    expect(html).toContain("Meta de la semana")
    expect(html).toContain("4 / 7 canjes")
    expect(html).toContain("María Real")
    expect(html).toContain("Juan Listo")
    expect(html).not.toContain("Actividad reciente")
    expect(html).not.toContain("+12%")
  })

  test("métricas con labels Pencil sin trends inventados", () => {
    const html = renderToStaticMarkup(
      <DashboardHome
        metrics={metrics}
        employeeName="Nico"
        topCustomers={topCustomers}
        weeklyGoal={{ thisWeek: 1, lastWeek: 0 }}
        slug="carri"
      />
    )
    expect(html).toContain("Clientes")
    expect(html).toContain("Compras del mes")
    expect(html).toContain("Premios canjeados")
    expect(html).not.toContain("+12%")
    expect(html).not.toContain("+8%")
  })
})

describe("GoalCard", () => {
  test("muestra progreso real vs target", () => {
    const html = renderToStaticMarkup(
      <GoalCard current={4} target={7} />
    )
    expect(html).toContain("Meta de la semana")
    expect(html).toContain("4 / 7 canjes")
    expect(html).toContain("semana pasada")
  })
})

describe("TopCustomers", () => {
  test("lista clientes reales", () => {
    const html = renderToStaticMarkup(
      <TopCustomers customers={topCustomers} />
    )
    expect(html).toContain("Top clientes")
    expect(html).toContain("María Real")
    expect(html).toContain("Listo")
  })

  test("empty state sin inventar gente", () => {
    const html = renderToStaticMarkup(<TopCustomers customers={[]} />)
    expect(html).toContain("Compartí el QR")
    expect(html).not.toContain("María López")
  })
})
