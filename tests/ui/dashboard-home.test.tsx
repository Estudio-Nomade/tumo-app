import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
  DashboardHome,
  GoalCard,
  TopCustomers,
} from "@/modules/loyalty/dashboard/widgets"

describe("DashboardHome", () => {
  const metrics = {
    customers: 128,
    purchasesThisMonth: 47,
    redemptionsThisMonth: 9,
  }

  test("saludo personalizado con nombre", () => {
    const html = renderToStaticMarkup(
      <DashboardHome metrics={metrics} employeeName="Nico" />
    )
    expect(html).toContain("Panel")
    expect(html).toContain("Hola, Nico. Así va tu comercio hoy.")
  })

  test("saludo sin nombre usa fallback", () => {
    const html = renderToStaticMarkup(<DashboardHome metrics={metrics} />)
    expect(html).toContain("Hola. Así va tu comercio hoy.")
  })

  test("incluye meta semanal y top clientes, no actividad", () => {
    const html = renderToStaticMarkup(
      <DashboardHome metrics={metrics} employeeName="Nico" />
    )
    expect(html).toContain("Meta de la semana")
    expect(html).toContain("Top clientes")
    expect(html).not.toContain("Actividad reciente")
  })

  test("métricas con labels Pencil", () => {
    const html = renderToStaticMarkup(
      <DashboardHome metrics={metrics} employeeName="Nico" />
    )
    expect(html).toContain("Clientes")
    expect(html).toContain("Compras del mes")
    expect(html).toContain("Premios canjeados")
    expect(html).toContain("+12%")
  })
})

describe("GoalCard", () => {
  test("muestra progreso y mensaje eta", () => {
    const html = renderToStaticMarkup(
      <GoalCard current={18} target={25} eta="sábado" />
    )
    expect(html).toContain("Meta de la semana")
    expect(html).toContain("18 / 25 canjes")
    expect(html).toContain("A este ritmo, cumplís la meta el sábado.")
    expect(html).toContain("from-[var(--color-primary")
    expect(html).toContain("to-[var(--color-primary-deep,#EA580C)]")
  })
})

describe("TopCustomers", () => {
  test("lista clientes mock con acciones", () => {
    const html = renderToStaticMarkup(<TopCustomers />)
    expect(html).toContain("Top clientes")
    expect(html).toContain("Ver todos")
    expect(html).toMatch(/Canjear|\+1 compra/)
  })
})
