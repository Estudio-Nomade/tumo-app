import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import MetricCard from "@/shell/ui/MetricCard"

describe("MetricCard", () => {
  test("renderiza value y label", () => {
    const html = renderToStaticMarkup(
      <MetricCard value={0} label="Clientes" />
    )
    expect(html).toContain("text-3xl")
    expect(html).toContain(">0<")
    expect(html).toContain("Clientes")
    expect(html).toContain("text-sm")
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
})
