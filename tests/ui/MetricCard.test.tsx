import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import MetricCard from "@/shell/ui/MetricCard"

describe("MetricCard", () => {
  test("renderiza value y label", () => {
    const html = renderToStaticMarkup(
      <MetricCard value={0} label="Clientes" />
    )
    expect(html).toContain("text-[22px]")
    expect(html).toContain(">0<")
    expect(html).toContain("Clientes")
    expect(html).toContain("text-[11px]")
  })

  test("acepta className extra", () => {
    const html = renderToStaticMarkup(
      <MetricCard value={12} label="Compras" className="extra-class" />
    )
    expect(html).toContain("extra-class")
  })

  test("value string o number", () => {
    const asNumber = renderToStaticMarkup(
      <MetricCard value={42} label="Premios" />
    )
    const asString = renderToStaticMarkup(
      <MetricCard value="N/A" label="Premios" />
    )
    expect(asNumber).toContain(">42<")
    expect(asString).toContain(">N/A<")
  })

  test("renderiza icon y trend badge", () => {
    const html = renderToStaticMarkup(
      <MetricCard
        value={128}
        label="Clientes"
        icon={<span data-testid="metric-icon">U</span>}
        trend="+12%"
      />
    )
    expect(html).toContain("metric-icon")
    expect(html).toContain("+12%")
    expect(html).toContain("h-[34px]")
    expect(html).toContain("w-[34px]")
    expect(html).toContain("rounded-[10px]")
    expect(html).toContain("#DCFCE7")
  })

  test("variant highlight usa fondo amarillo", () => {
    const html = renderToStaticMarkup(
      <MetricCard value={9} label="Premios canjeados" variant="highlight" />
    )
    expect(html).toContain("bg-[#FEF9C3]")
    expect(html).toContain("border-[#FDE68A]")
  })

  test("variant default usa fondo naranja suave", () => {
    const html = renderToStaticMarkup(
      <MetricCard value={3} label="Compras" variant="default" />
    )
    expect(html).toContain("bg-[#FFF7ED]")
    expect(html).toContain("border-[#FED7AA]")
  })
})
