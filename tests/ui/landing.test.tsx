import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { LandingPage } from "@/modules/landing/landing-page"

describe("LandingPage", () => {
  test("hero con voz de par, sin tarjeta de puntos", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("No venimos a enseñarte")
    expect(html).toContain("el negocio")
    expect(html).toContain("tecnología no te frene")

    expect(html).not.toContain("Tu tarjeta")
    expect(html).not.toContain("1.240 pts")
    expect(html).not.toContain("landing-glow-breathe")
  })

  test("un solo camino fuerte de WhatsApp en hero", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("wa.me/542494512494")
    expect(html).toContain("Escribinos por WhatsApp")
    expect(html).not.toContain("Dejanos tu teléfono y te llamamos")
  })

  test("qué hacemos: fidelización y a medida; pedidos humilde", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("Fidelización")
    expect(html).toContain("Lo desarrollamos")
    expect(html).toContain("Pedidos")
    expect(html).toContain("lo estamos armando")
    expect(html).not.toContain("En desarrollo")
  })

  test("precio $30.000 ARS por módulo / mes, sin desde 19.900", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("30.000")
    expect(html).toContain("ARS")
    expect(html).toMatch(/por m[oó]dulo|cada m[oó]dulo/i)
    expect(html).not.toContain("19.900")
    expect(html).not.toMatch(/\bDesde\b/)
    expect(html).toContain("30.000%2Fmes%20por%20m%C3%B3dulo")
  })

  test("casos y FAQ esenciales", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("Carri")
    expect(html).toContain("Defe")
    expect(html).toContain("¿Cuánto sale?")
    expect(html).toContain("¿Es difícil de usar?")
  })

  test("media stock y tokens oscuros", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('data-landing-media="hero"')
    expect(html).toContain('data-landing-media="case-carri"')
    expect(html).toContain("background-color:#000000")
    expect(html).toContain("text-[#FFFFFF]")
    expect(html).toContain("overflow-x-hidden")
    expect(html).toContain("min-h-[52px]")
  })

  test("reveal y navbar glass siguen", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("data-landing-reveal")
    expect(html).toContain("data-landing-nav")
  })

  test("usa logo oficial PNG + wordmark", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("/landing/tumo-logo-no-text.png")
    expect(html).toContain(">tumo<")
  })

  test("craft visual: grain, kickers y composición", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("landing-grain")
    expect(html).toContain("landing-kicker")
    expect(html).toContain('data-landing-craft="hero"')
    expect(html).toContain("landing-frame")
    expect(html).toContain("landing-index")
  })

  test("polish 5-11: rules, shine, parallax, img skeleton", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("landing-section-rule")
    expect(html).toContain("data-landing-rule")
    expect(html).toContain("landing-btn-shine")
    expect(html).toContain("data-landing-parallax")
    expect(html).toContain("landing-img-skeleton")
    expect(html).toContain('data-landing-img="loading"')
  })
})



