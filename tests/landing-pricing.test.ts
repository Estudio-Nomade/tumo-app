import { describe, expect, test } from "bun:test"
import { metadata } from "@/app/page"
import {
  FAQ_ITEMS,
  PRICE_PER_MODULE_ARS,
} from "@/modules/landing/config"

describe("landing pricing copy", () => {
  test("precio por módulo es $30.000 ARS", () => {
    expect(PRICE_PER_MODULE_ARS).toBe("30.000")
  })

  test("FAQ ¿Cuánto sale? habla de $30.000 por módulo / mes, sin 19.900 ni Desde", () => {
    const item = FAQ_ITEMS.find((f) => f.question === "¿Cuánto sale?")
    expect(item).toBeDefined()
    const answer = item!.answer
    expect(answer).toContain("$30.000")
    expect(answer.toLowerCase()).toMatch(/módulo/)
    expect(answer.toLowerCase()).toMatch(/mes/)
    expect(answer).not.toContain("19.900")
    expect(answer).not.toContain("Desde")
  })

  test("ningún FAQ menciona 19.900", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.answer).not.toContain("19.900")
      expect(item.question).not.toContain("19.900")
    }
  })

  test("metadata SEO/OG/Twitter usa $30.000 por módulo, sin 19.900 ni Desde", () => {
    const descriptions = [
      metadata.description,
      metadata.openGraph?.description,
      metadata.twitter?.description,
    ]
    for (const description of descriptions) {
      expect(description).toBeString()
      expect(description).toContain("$30.000")
      expect(description!.toLowerCase()).toMatch(/módulo/)
      expect(description).not.toContain("19.900")
      expect(description).not.toContain("Desde")
    }
  })
})
