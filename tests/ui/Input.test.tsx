import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import Input from "@/shell/ui/Input"

describe("Input", () => {
  test("renderiza label e input", () => {
    const html = renderToStaticMarkup(
      <Input label="Tu WhatsApp" name="phone" />
    )
    expect(html).toContain("Tu WhatsApp")
    expect(html).toContain("<input")
  })

  test("pasa props al input", () => {
    const html = renderToStaticMarkup(
      <Input
        label="Tu WhatsApp"
        name="phone"
        type="tel"
        placeholder="+54 9 11 1234-5678"
      />
    )
    expect(html).toContain('name="phone"')
    expect(html).toContain('type="tel"')
    expect(html).toContain('placeholder="+54 9 11 1234-5678"')
  })

  test("htmlFor usa id o name", () => {
    const withId = renderToStaticMarkup(
      <Input label="Email" id="email-field" name="email" />
    )
    expect(withId).toContain('for="email-field"')
    expect(withId).toContain('id="email-field"')

    const withName = renderToStaticMarkup(
      <Input label="Teléfono" name="phone" />
    )
    expect(withName).toContain('for="phone"')
    expect(withName).toContain('id="phone"')
  })
})
