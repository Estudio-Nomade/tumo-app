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

  test("hero apunta a planes y WhatsApp de soporte", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("wa.me/542494512494")
    expect(html).toMatch(/Elegí tu plan|Ver planes|#precios/i)
    expect(html).toContain("39.99")
    expect(html).not.toContain("Dejanos tu teléfono y te llamamos")
    expect(html).not.toContain("69.99")
  })

  test("qué hacemos: Fidelización, Pedidos, Turnos Disponibles + A medida; sin EN CAMINO", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("Fidelización")
    expect(html).toContain("Pedidos")
    expect(html).toContain("Turnos")
    expect(html).toContain("Reserva online")
    expect(html).toContain("Disponible")
    expect(html).toContain("Lo desarrollamos")
    expect(html).toMatch(/menú|retirar|pedido/i)
    expect(html).not.toContain("EN CAMINO")
    expect(html).not.toContain("lo estamos armando")
    expect(html).not.toContain("En desarrollo")
    const fidelizacion = html.indexOf("Fidelización")
    const pedidos = html.indexOf(">Pedidos<")
    const turnos = html.indexOf(">Turnos<")
    const aMedida = html.indexOf("A medida de tu rubro")
    expect(pedidos).toBeGreaterThan(fidelizacion)
    expect(turnos).toBeGreaterThan(pedidos)
    expect(aMedida).toBeGreaterThan(turnos)
  })

  test("precios: 3 planes Básico/Pro/Full, sin 69.99 ni 30.000/19.900", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("Básico")
    expect(html).toContain("Pro")
    expect(html).toContain("Full")
    expect(html).toContain("39.99")
    expect(html).toContain("89.99")
    expect(html).toContain("129.99")
    expect(html).toContain("11.99")
    expect(html).toContain("25.99")
    expect(html).toContain("36.99")
    expect(html).toMatch(/1 m[oó]dulo/i)
    expect(html).toMatch(/hasta 3|3 m[oó]dulos/i)
    expect(html).toMatch(/todos los m[oó]dulos|todos/i)
    expect(html).toMatch(/ARS|pesos/i)
    expect(html).toMatch(/mes/i)
    expect(html).not.toContain("69.99")
    expect(html).not.toContain("30.000")
    expect(html).not.toContain("19.900")
    // WA prefill por plan (encoded)
    expect(html).toMatch(/plan%20B%C3%A1sico|plan%20Basico|B%C3%A1sico/i)
  })

  test("casos y FAQ esenciales", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("Carri")
    expect(html).toContain("Defe")
    expect(html).toContain("¿Cuánto sale?")
    expect(html).toContain("¿Es difícil de usar?")
    expect(html).toMatch(/C[oó]mo empiezo/i)
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

  test("footer con mail de Estudio Nómade", () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain("tumo.estudionomade@gmail.com")
    expect(html).not.toContain("hola@tumo.com.ar")
    expect(html).not.toContain("estudionomade2025@gmail.com")
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
