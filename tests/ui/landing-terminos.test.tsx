import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { TermsOfPurchasePage } from "@/modules/landing/legal/terms-page"
import { LEGAL_MERCHANT } from "@/modules/landing/legal/merchant"

describe("TermsOfPurchasePage", () => {
  test("heading de TyC de compra y datos del prestador visibles", () => {
    const html = renderToStaticMarkup(<TermsOfPurchasePage />)
    expect(html).toMatch(/Términos y condiciones de compra/i)
    expect(html).toContain(LEGAL_MERCHANT.legalName)
    expect(html).toContain(LEGAL_MERCHANT.documentNumber)
    expect(html).toMatch(/CUIL/)
    expect(html).toContain(LEGAL_MERCHANT.email)
    expect(html).toContain("tumo.com.ar")
  })

  test("incluye cláusulas mínimas de servicio SaaS", () => {
    const html = renderToStaticMarkup(<TermsOfPurchasePage />)
    expect(html).toMatch(/objeto|servicio|acceso|SaaS|software|m[oó]dulo/i)
    expect(html).toMatch(/precio|cobro|ARS|pago/i)
    expect(html).not.toMatch(/USD|U\$S/i)
    expect(html).toMatch(/arrepentimiento|cancelaci[oó]n|baja|renovaci[oó]n/i)
    expect(html).toMatch(/soporte|contacto|WhatsApp|email/i)
    expect(html).toMatch(/limitaci[oó]n|responsabilidad/i)
  })

  test("link volver al home", () => {
    const html = renderToStaticMarkup(<TermsOfPurchasePage />)
    expect(html).toContain('href="/"')
  })
})
