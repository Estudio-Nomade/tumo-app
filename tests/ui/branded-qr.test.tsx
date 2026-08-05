import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("BrandedQr + ShareProgram (prod)", () => {
  test("BrandedQr usa qrcode y branding del business", () => {
    const src = read("shell/ui/branded-qr.tsx")
    expect(src).toContain("qrcode")
    expect(src).toContain("primary_color")
    expect(src).toContain("business.name")
    expect(src).toContain("getLoyaltyPublicUrl")
  })

  test("ShareProgram copia y comparte URL real", () => {
    const src = read("modules/loyalty/dashboard/share-program.tsx")
    expect(src).toContain("navigator.clipboard")
    expect(src).toContain("Copiar link")
    expect(src).toContain("Compartir")
    expect(src).toContain("BrandedQr")
    expect(src).toContain("getLoyaltyPublicUrl")
    expect(src).toContain("navigator.share")
    expect(src).toContain("Link2")
    expect(src).toContain("Share2")
  })

  test("ShareProgram owner sigue layout Pencil 7 (CTAs, tip, poster)", () => {
    const src = read("modules/loyalty/dashboard/share-program.tsx")
    expect(src).toContain('variant === "owner"')
    expect(src).toContain("Los clientes escanean y se registran")
    expect(src).toContain("Próximamente: poster para imprimir")
    expect(src).toContain("Lightbulb")
    expect(src).toContain("Imprimí el QR o mostralo en el mostrador")
    expect(src).toContain("bg-[var(--color-primary,#F97316)]")
    expect(src).toContain("bg-[#FFF7ED]")
  })

  test("Compartir abre sheet Pencil 9 (Copiar / WhatsApp / Más)", () => {
    const src = read("modules/loyalty/dashboard/share-program.tsx")
    expect(src).toContain("Sheet")
    expect(src).toContain('side="bottom"')
    expect(src).toContain("Compartir programa")
    expect(src).toContain("Invitá a tus clientes a sumar compras")
    expect(src).toContain("WhatsApp")
    expect(src).toContain("wa.me")
    expect(src).toContain("Más")
    expect(src).toContain("Cerrar")
    expect(src).toContain("setShareOpen")
    // CTA Compartir abre sheet, no native share directo
    expect(src).toMatch(/setShareOpen\(true\)[\s\S]{0,400}Compartir/)
  })

  test("ShareProgram counter sigue layout Pencil 8 (empleado)", () => {
    const src = read("modules/loyalty/dashboard/share-program.tsx")
    expect(src).toContain('variant === "counter"')
    expect(src).toContain("Mostrale esta pantalla al cliente")
    expect(src).toContain("Copiar {display")
    expect(src).toContain("Brillo al máximo recomendado")
    expect(src).not.toMatch(/variant === "counter"[\s\S]{0,800}Compartir/)
  })

  test("settings es marca/negocio, QR vive en loyalty", () => {
    const settings = read(
      "app/(dashboard)/[slug]/dashboard/settings/page.tsx"
    )
    const form = read("shell/ui/settings-form.tsx")
    expect(settings).toContain("SettingsForm")
    expect(settings).not.toContain("ShareProgram")
    expect(form).toContain("Nombre del comercio")
    expect(form).toContain("Programa de fidelización")
    expect(form).toContain("Ver módulos")
  })

  test("panel tiene entrada a Mostrar QR y programa (owner)", () => {
    const src = read("modules/loyalty/dashboard/panel.tsx")
    expect(src).toContain("Mostrar QR")
    expect(src).toContain("/dashboard/loyalty/qr")
    expect(src).toContain("/dashboard/loyalty/programa")
    expect(src).toContain("canEditProgram")
  })

  test("ruta QR ramifica dueño vs empleado según role", () => {
    const page = read(
      "app/(dashboard)/[slug]/dashboard/loyalty/qr/page.tsx"
    )
    const view = read("modules/loyalty/dashboard/loyalty-qr-view.tsx")
    expect(page).toContain("LoyaltyQrView")
    expect(page).toContain("session.role")
    expect(view).toContain('variant="owner"')
    expect(view).toContain('variant="counter"')
    expect(view).toContain("Ajustes")
    expect(view).toContain("Programa y cuenta")
    expect(view).toContain("NEGOCIO")
    expect(view).toContain("Escaneá para sumar")
    expect(view).toContain("Volver al panel")
    expect(view).toContain("router.back")
  })
})
