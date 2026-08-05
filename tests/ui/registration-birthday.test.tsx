import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
  join(import.meta.dir, "../../modules/loyalty/public/registration.tsx"),
  "utf8"
)

describe("LoyaltyRegistration birthday field (Pencil bd)", () => {
  test("label es ¿Fecha de cumpleaños? (no Cumpleaños solo)", () => {
    expect(src).toContain("¿Fecha de cumpleaños?")
    expect(src).not.toMatch(/label=["']Cumpleaños/)
  })

  test("tiene switch para habilitar la fecha", () => {
    expect(src).toMatch(/role=["']switch["']/)
    expect(src).toMatch(/birthdayEnabled|setBirthdayEnabled/)
  })

  test("el date picker vive dentro de un contenedor con borde (no vuela)", () => {
    expect(src).toMatch(/type=["']date["']/)
    expect(src).toMatch(/id=["']birthday-field["']/)
    expect(src).toMatch(
      /birthday-field[\s\S]{0,200}h-\[52px\][\s\S]{0,120}border-\[#E7E5E4\]/
    )
    expect(src).toContain("Calendar")
    expect(src).not.toMatch(
      /<Input[\s\S]*label=["']Cumpleaños[\s\S]*type=["']date["']/
    )
  })

  test("solo envía birthday si el switch está activo", () => {
    expect(src).toContain(
      "birthday: birthdayEnabled ? birthday || undefined : undefined"
    )
  })

  test("switch y date tienen a11y básica (labelledby + controls)", () => {
    expect(src).toContain('id="birthday-label"')
    expect(src).toContain('aria-labelledby="birthday-label"')
    expect(src).toContain('aria-controls="birthday-field"')
  })
})
