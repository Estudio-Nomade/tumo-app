import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { SignupForm } from "@/modules/signup/public/signup-form"
import { MODULE_OPTIONS } from "@/modules/signup/public/module-options"
import {
  cupoCounterLabel,
  defaultModulesForPlan,
  modulesAfterPlanChange,
  toggleModuleSelection,
} from "@/modules/signup/public/module-selection"

describe("module-selection cupo", () => {
  test("defaults por plan", () => {
    expect(defaultModulesForPlan("basico")).toEqual(["loyalty"])
    expect(defaultModulesForPlan("pro")).toEqual(["loyalty", "orders"])
    expect(defaultModulesForPlan("full")).toEqual([
      "loyalty",
      "orders",
      "turnos",
    ])
  })

  test("basico: tap reemplaza el único slot; no deja vacío", () => {
    expect(toggleModuleSelection("basico", ["loyalty"], "orders")).toEqual([
      "orders",
    ])
    expect(toggleModuleSelection("basico", ["orders"], "loyalty")).toEqual([
      "loyalty",
    ])
    expect(toggleModuleSelection("basico", ["loyalty"], "loyalty")).toEqual([
      "loyalty",
    ])
  })

  test("pro: hasta 3; deselect último no deja vacío; unselect de 3 ok", () => {
    expect(toggleModuleSelection("pro", ["loyalty"], "orders")).toEqual([
      "loyalty",
      "orders",
    ])
    const three = ["loyalty", "orders", "turnos"]
    expect(toggleModuleSelection("pro", three, "loyalty")).toEqual([
      "orders",
      "turnos",
    ])
    expect(toggleModuleSelection("pro", ["loyalty"], "loyalty")).toEqual([
      "loyalty",
    ])
  })

  test("full: locked — toggle no-op", () => {
    const all = ["loyalty", "orders", "turnos"]
    expect(toggleModuleSelection("full", all, "loyalty")).toEqual(all)
    expect(toggleModuleSelection("full", all, "orders")).toEqual(all)
  })

  test("plan change reaplica cupo", () => {
    expect(
      modulesAfterPlanChange("basico", ["loyalty", "orders"])
    ).toEqual(["loyalty"])
    expect(modulesAfterPlanChange("full", ["loyalty"])).toEqual([
      "loyalty",
      "orders",
      "turnos",
    ])
    expect(
      modulesAfterPlanChange("pro", ["loyalty", "orders", "turnos"])
    ).toEqual(["loyalty", "orders", "turnos"])
  })

  test("contador cupo", () => {
    expect(cupoCounterLabel("basico", 1)).toBe("Cupo completo")
    expect(cupoCounterLabel("pro", 2)).toBe("Elegiste 2 de 3")
    expect(cupoCounterLabel("pro", 3)).toBe("Cupo completo")
    expect(cupoCounterLabel("full", 3)).toBe("Incluido en Full")
  })
})

describe("MODULE_OPTIONS copy from TOOLS", () => {
  test("loyalty orders turnos con título y descripción", () => {
    expect(MODULE_OPTIONS.map((m) => m.id)).toEqual([
      "loyalty",
      "orders",
      "turnos",
    ])
    for (const m of MODULE_OPTIONS) {
      expect(m.title.length).toBeGreaterThan(0)
      expect(m.description.length).toBeGreaterThan(10)
    }
    expect(MODULE_OPTIONS.find((m) => m.id === "loyalty")?.title).toBe(
      "Fidelización"
    )
  })
})

describe("SignupForm markup", () => {
  test("plan cards (no select nativo como único control) + Pro destacado", () => {
    const html = renderToStaticMarkup(<SignupForm initialPlan="pro" />)
    expect(html).toContain("Básico")
    expect(html).toContain("Pro")
    expect(html).toContain("Full")
    expect(html).toContain("Más elegido")
    expect(html).toContain('data-plan-picker="true"')
    expect(html).toContain('aria-checked="true"')
    expect(html).not.toMatch(/<select[\s>]/)
    expect(html).toMatch(/39\.99|89\.99|129\.99/)
  })

  test("module cards con descripción y aria-pressed, no checkbox crudo visible", () => {
    const html = renderToStaticMarkup(<SignupForm initialPlan="basico" />)
    expect(html).toContain("Fidelización")
    expect(html).toContain("Pedidos")
    expect(html).toContain("Turnos")
    expect(html).toContain("Tarjeta de puntos digital")
    expect(html).toContain('data-module-picker="true"')
    expect(html).toContain("Cupo completo")
    // no bare checkbox-only UI as primary control
    expect(html).not.toMatch(/type="checkbox"/)
  })

  test("full muestra incluido en Full", () => {
    const html = renderToStaticMarkup(<SignupForm initialPlan="full" />)
    expect(html).toContain("Incluido en Full")
    expect(html).toContain("incluido en Full")
  })

  test("CTA y subtítulo sin fake MP", () => {
    const html = renderToStaticMarkup(<SignupForm initialPlan="pro" />)
    expect(html).toContain("Continuar al pago")
    expect(html).toMatch(/Mercado Pago|pago/i)
    expect(html).not.toContain("fake MP")
    expect(html).not.toContain("cobro demo local")
  })
})
