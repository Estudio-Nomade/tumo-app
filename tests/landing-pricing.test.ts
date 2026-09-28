import { describe, expect, test } from "bun:test"
import { metadata } from "@/app/page"
import {
  FAQ_ITEMS,
  PLANS,
  TOOLS,
  PRICE_FROM_USD,
} from "@/modules/landing/config"

describe("landing plans pricing", () => {
  test("PLANS: Básico 39.99 (1) · Pro 89.99 (hasta 3) · Full 129.99 (todos)", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["basico", "pro", "full"])

    const basico = PLANS.find((p) => p.id === "basico")!
    expect(basico.name).toBe("Básico")
    expect(basico.priceUsdMonth).toBe("39.99")
    expect(basico.priceUsdWeek).toBe("11.99")
    expect(basico.cupoLabel.toLowerCase()).toMatch(/1 m[oó]dulo/)

    const pro = PLANS.find((p) => p.id === "pro")!
    expect(pro.name).toBe("Pro")
    expect(pro.priceUsdMonth).toBe("89.99")
    expect(pro.priceUsdWeek).toBe("25.99")
    expect(pro.cupoLabel.toLowerCase()).toMatch(/3/)
    expect(pro.highlighted).toBe(true)

    const full = PLANS.find((p) => p.id === "full")!
    expect(full.name).toBe("Full")
    expect(full.priceUsdMonth).toBe("129.99")
    expect(full.priceUsdWeek).toBe("36.99")
    expect(full.cupoLabel.toLowerCase()).toMatch(/todos/)
  })

  test("precio de entrada (desde) es 39.99", () => {
    expect(PRICE_FROM_USD).toBe("39.99")
  })

  test("FAQ ¿Cuánto sale? habla de los 3 planes, cobro ARS, sin 69.99/30.000/19.900", () => {
    const item = FAQ_ITEMS.find((f) => f.question === "¿Cuánto sale?")
    expect(item).toBeDefined()
    const answer = item!.answer
    expect(answer).toContain("39.99")
    expect(answer).toContain("89.99")
    expect(answer).toContain("129.99")
    expect(answer).toMatch(/B[aá]sico/i)
    expect(answer).toMatch(/Pro/i)
    expect(answer).toMatch(/Full/i)
    expect(answer).toMatch(/ARS|pesos/i)
    expect(answer.toLowerCase()).toMatch(/mes/)
    expect(answer).not.toContain("69.99")
    expect(answer).not.toContain("30.000")
    expect(answer).not.toContain("19.900")
  })

  test("FAQ incluye cómo empiezo (plan → pago → cuenta)", () => {
    const item = FAQ_ITEMS.find(
      (f) =>
        f.question.toLowerCase().includes("cómo empiezo") ||
        f.question.toLowerCase().includes("como empiezo"),
    )
    expect(item).toBeDefined()
    const a = item!.answer.toLowerCase()
    expect(a).toMatch(/plan/)
    expect(a).toMatch(/pag/)
    expect(a).toMatch(/cuenta/)
  })

  test("ningún FAQ menciona 19.900, 30.000 ni 69.99", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.answer).not.toContain("19.900")
      expect(item.answer).not.toContain("30.000")
      expect(item.answer).not.toContain("69.99")
      expect(item.question).not.toContain("19.900")
      expect(item.question).not.toContain("30.000")
      expect(item.question).not.toContain("69.99")
    }
  })

  test("metadata SEO/OG/Twitter: planes desde 39.99, sin 69.99/30.000/19.900", () => {
    const descriptions = [
      metadata.description,
      metadata.openGraph?.description,
      metadata.twitter?.description,
    ]
    for (const description of descriptions) {
      expect(description).toBeString()
      expect(description).toContain("39.99")
      expect(description).toMatch(/USD|plan/i)
      expect(description).not.toContain("69.99")
      expect(description).not.toContain("30.000")
      expect(description).not.toContain("19.900")
    }
  })
})

describe("landing tools", () => {
  test("TOOLS: Fidelización → Pedidos → Turnos → A medida (Pedidos Disponible)", () => {
    const ids = TOOLS.map((t) => t.id)
    expect(ids).toEqual(["loyalty", "orders", "turnos", "custom"])

    const orders = TOOLS.find((t) => t.id === "orders")
    expect(orders).toBeDefined()
    expect(orders!.title).toContain("Pedidos")
    expect(orders!.statusLabel).toBe("Disponible")
    expect(orders!.highlighted).toBeFalsy()
    expect(orders!.description.toLowerCase()).toMatch(/menú|retirar|pedido/)

    const turnos = TOOLS.find((t) => t.id === "turnos")
    expect(turnos).toBeDefined()
    expect(turnos!.title).toBe("Turnos")
    expect(turnos!.statusLabel).toBe("Disponible")
    expect(turnos!.highlighted).toBeFalsy()

    const custom = TOOLS.find((t) => t.id === "custom")
    expect(custom!.highlighted).toBe(true)
    expect(custom!.statusLabel).toBe("Lo desarrollamos")
  })
})
