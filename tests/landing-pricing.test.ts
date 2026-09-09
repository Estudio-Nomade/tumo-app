import { describe, expect, test } from "bun:test"
import { metadata } from "@/app/page"
import {
  FAQ_ITEMS,
  PRICE_PER_MODULE_USD,
  TOOLS,
} from "@/modules/landing/config"

describe("landing pricing copy", () => {
  test("precio por módulo es $69.99 USD", () => {
    expect(PRICE_PER_MODULE_USD).toBe("69.99")
  })

  test("FAQ ¿Cuánto sale? habla de $69.99 USD por módulo / mes, sin 30.000/ARS/19.900/Desde", () => {
    const item = FAQ_ITEMS.find((f) => f.question === "¿Cuánto sale?")
    expect(item).toBeDefined()
    const answer = item!.answer
    expect(answer).toContain("$69.99")
    expect(answer).toMatch(/USD|US\$|dólar/i)
    expect(answer.toLowerCase()).toMatch(/módulo/)
    expect(answer.toLowerCase()).toMatch(/mes/)
    expect(answer).not.toContain("30.000")
    expect(answer).not.toContain("19.900")
    expect(answer).not.toContain("ARS")
    expect(answer).not.toContain("Desde")
  })

  test("ningún FAQ menciona 19.900 ni 30.000", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.answer).not.toContain("19.900")
      expect(item.answer).not.toContain("30.000")
      expect(item.question).not.toContain("19.900")
      expect(item.question).not.toContain("30.000")
    }
  })

  test("metadata SEO/OG/Twitter usa $69.99 USD por módulo, sin 30.000/ARS/19.900/Desde", () => {
    const descriptions = [
      metadata.description,
      metadata.openGraph?.description,
      metadata.twitter?.description,
    ]
    for (const description of descriptions) {
      expect(description).toBeString()
      expect(description).toContain("$69.99")
      expect(description).toMatch(/USD/)
      expect(description!.toLowerCase()).toMatch(/módulo/)
      expect(description).not.toContain("30.000")
      expect(description).not.toContain("19.900")
      expect(description).not.toContain("ARS")
      expect(description).not.toContain("Desde")
    }
  })
})

describe("landing tools", () => {
  test("TOOLS incluye Turnos Disponible entre Fidelización y A medida", () => {
    const ids = TOOLS.map((t) => t.id)
    expect(ids).toContain("loyalty")
    expect(ids).toContain("turnos")
    expect(ids).toContain("custom")
    expect(ids.indexOf("turnos")).toBeGreaterThan(ids.indexOf("loyalty"))
    expect(ids.indexOf("turnos")).toBeLessThan(ids.indexOf("custom"))

    const turnos = TOOLS.find((t) => t.id === "turnos")
    expect(turnos).toBeDefined()
    expect(turnos!.title).toBe("Turnos")
    expect(turnos!.statusLabel).toBe("Disponible")
    expect(turnos!.highlighted).toBeFalsy()

    const custom = TOOLS.find((t) => t.id === "custom")
    expect(custom!.highlighted).toBe(true)
  })
})
