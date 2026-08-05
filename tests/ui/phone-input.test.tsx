import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  composePhoneE164,
  filterCountries,
  flagEmoji,
  isPhoneValid,
  listCountries,
  parsePhoneParts,
} from "@/lib/countries"

const root = join(import.meta.dir, "../..")

describe("countries helpers", () => {
  test("lista incluye AR con prefijo 54 y nombre en español", () => {
    const ar = listCountries().find((c) => c.iso2 === "AR")
    expect(ar).toBeDefined()
    expect(ar!.dialCode).toBe("54")
    expect(ar!.name.toLowerCase()).toContain("argentina")
  })

  test("flagEmoji genera regional indicator", () => {
    expect(flagEmoji("AR")).toBe("🇦🇷")
    expect(flagEmoji("US")).toBe("🇺🇸")
  })

  test("filterCountries busca por nombre y por prefijo", () => {
    const byName = filterCountries("argen")
    expect(byName.some((c) => c.iso2 === "AR")).toBe(true)
    const byDial = filterCountries("54")
    expect(byDial.some((c) => c.iso2 === "AR")).toBe(true)
  })

  test("composePhoneE164 arma número con prefijo de país", () => {
    expect(composePhoneE164("AR", "91112345678")).toMatch(/^\+54911/)
    expect(composePhoneE164("US", "2025551234")).toMatch(/^\+1202/)
  })

  test("parsePhoneParts detecta país desde E.164", () => {
    const parts = parsePhoneParts("+5491112345678")
    expect(parts.country).toBe("AR")
    expect(parts.nationalDigits.length).toBeGreaterThan(6)
  })

  test("parsePhoneParts vacío default AR", () => {
    const parts = parsePhoneParts("")
    expect(parts.country).toBe("AR")
    expect(parts.nationalDigits).toBe("")
  })

  test("isPhoneValid acepta AR móvil completo", () => {
    expect(isPhoneValid("+5491112345678")).toBe(true)
    expect(isPhoneValid("+54")).toBe(false)
    expect(isPhoneValid("")).toBe(false)
  })
})

describe("PhoneInput UI", () => {
  test("componente existe y usa Popover + Command (shadcn)", () => {
    const path = join(root, "shell/ui/phone-input.tsx")
    expect(existsSync(path)).toBe(true)
    const src = readFileSync(path, "utf8")
    expect(src).toMatch(/from ["']@\/components\/ui\/popover["']/)
    expect(src).toMatch(/from ["']@\/components\/ui\/command["']/)
    expect(src).toMatch(/CommandInput|Buscar país/)
    expect(src).toContain("flagEmoji")
  })

  test("registration usa PhoneInput en register y login", () => {
    const src = readFileSync(
      join(root, "modules/loyalty/public/registration.tsx"),
      "utf8"
    )
    expect(src).toContain('import PhoneInput from "@/shell/ui/phone-input"')
    expect(src.match(/<PhoneInput/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(src).not.toMatch(
      /label=["']WhatsApp["'][\s\S]{0,80}type=["']tel["']/
    )
  })
})
