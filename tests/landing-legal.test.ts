import { describe, expect, test } from "bun:test"
import { LEGAL_MERCHANT } from "@/modules/landing/legal/merchant"
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  getTermsPlainText,
} from "@/modules/landing/legal/terms-of-purchase"

describe("LEGAL_MERCHANT (dLocal GO)", () => {
  test("expone datos legales exactos del registro merchant", () => {
    expect(LEGAL_MERCHANT.legalName).toBe("Martina Micaela Yaquinta Torres")
    expect(LEGAL_MERCHANT.documentType).toBe("CUIL")
    expect(LEGAL_MERCHANT.documentNumber).toBe("27428826804")
    expect(LEGAL_MERCHANT.documentNumberDisplay).toBe("27-42882680-4")
    expect(LEGAL_MERCHANT.dni).toBe("42882680")
    expect(LEGAL_MERCHANT.email).toBe("tumo.estudionomade@gmail.com")
    expect(LEGAL_MERCHANT.siteUrl).toBe("https://www.tumo.com.ar")
    expect(LEGAL_MERCHANT.productName).toBe("Tumo")
  })

  test("no usa placeholders ni razón social inventada", () => {
    expect(LEGAL_MERCHANT.legalName).not.toMatch(/ACME|PENDIENTE|ejemplo/i)
    expect(LEGAL_MERCHANT.documentNumber).not.toBe("20123456789")
    expect(LEGAL_MERCHANT.documentNumberDisplay).not.toBe("20-12345678-9")
  })
})

describe("terms-of-purchase content", () => {
  test("tiene secciones y fecha de vigencia", () => {
    expect(TERMS_EFFECTIVE_DATE.length).toBeGreaterThan(0)
    expect(TERMS_SECTIONS.length).toBeGreaterThanOrEqual(8)
    for (const section of TERMS_SECTIONS) {
      expect(section.id.length).toBeGreaterThan(0)
      expect(section.title.length).toBeGreaterThan(0)
      const body = Array.isArray(section.body)
        ? section.body.join(" ")
        : section.body
      expect(body.trim().length).toBeGreaterThan(20)
    }
  })

  test("incluye strings obligatorios de compra SaaS + merchant", () => {
    const text = getTermsPlainText()
    expect(text).toMatch(/[Tt]érminos/)
    expect(text).toMatch(/condiciones/)
    expect(text).toMatch(/suscripci[oó]n|compra|plan/i)
    expect(text).toMatch(/B[aá]sico/)
    expect(text).toMatch(/Pro/)
    expect(text).toMatch(/Full/)
    expect(text).toMatch(/ARS/)
    expect(text).not.toMatch(/USD|U\$S/i)
    expect(text).toMatch(/dLocal/)
    expect(text).toContain(LEGAL_MERCHANT.legalName)
    expect(text).toContain(LEGAL_MERCHANT.documentNumber)
    expect(text).toContain(LEGAL_MERCHANT.email)
    expect(text).not.toMatch(/ACME SA/)
    expect(text).not.toContain("20-12345678-9")
  })
})
