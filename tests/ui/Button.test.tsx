import { describe, expect, test } from "bun:test"
import { isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import Button from "@/shell/ui/Button"

describe("Button", () => {
  test("variante primary por default", () => {
    const html = renderToStaticMarkup(<Button>Ingresar</Button>)
    expect(html).toContain("bg-[var(--color-primary")
    expect(html).toContain("text-white")
    expect(html).toContain("Ingresar")
  })

  test("variante outline", () => {
    const html = renderToStaticMarkup(
      <Button variant="outline">Descargar QR</Button>
    )
    expect(html).toContain("bg-transparent")
    expect(html).toContain("border border-[var(--color-primary")
    expect(html).toContain("Descargar QR")
  })

  test("pasa props nativas", () => {
    const el = (
      <Button type="submit" disabled>
        Enviar
      </Button>
    )
    expect(isValidElement(el)).toBe(true)
    expect(el.props.type).toBe("submit")
    expect(el.props.disabled).toBe(true)

    const html = renderToStaticMarkup(el)
    expect(html).toContain('type="submit"')
    expect(html).toContain("disabled")
  })

  test("renderiza children", () => {
    const html = renderToStaticMarkup(
      <Button>
        <span>Hola</span>
      </Button>
    )
    expect(html).toContain("<span>Hola</span>")
  })
})
