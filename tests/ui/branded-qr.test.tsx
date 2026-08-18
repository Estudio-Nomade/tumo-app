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
    expect(src).toContain("object-contain")
  })

  test("ShareProgram copia y comparte URL real", () => {
    const src = read("modules/loyalty/dashboard/share-program.tsx")
    expect(src).toContain("navigator.clipboard")
    expect(src).toContain("Copiar link")
    expect(src).toContain("Copiado")
    expect(src).toContain("WhatsApp")
    expect(src).toContain("wa.me")
    expect(src).toContain("BrandedQr")
    expect(src).toContain("getLoyaltyPublicUrl")
    expect(src).toContain("Link2")
    expect(src).toContain("MessageCircle")
    expect(src).toContain("Share2")
    // feedback visual: ícono check verde al copiar
    expect(src).toContain("copied")
    expect(src).toContain("Check")
    expect(src).toContain("green-600")
    expect(src).toContain("border-green-500")
  })

  test("ShareProgram owner: pantalla única sin sheet (Pencil 7 simplificado)", () => {
    const src = read("modules/loyalty/dashboard/share-program.tsx")
    expect(src).toContain('variant === "owner"')
    // Sin Sheet ni shareOpen
    expect(src).not.toContain("Sheet")
    expect(src).not.toContain("shareOpen")
    // Botones: Descargar QR (primary), Copiar, WhatsApp, Más (share nativo)
    expect(src).toContain("Descargar QR")
    expect(src).toContain("navigator.share")
    expect(src).toContain("downloadQr")
    // Eliminado: Cerrar del sheet viejo
    expect(src).not.toContain("Compartir programa")
    expect(src).not.toContain("Invitá a tus clientes a sumar compras")
  })

  test("ShareProgram counter sigue layout Pencil 8 (empleado)", () => {
    const src = read("modules/loyalty/dashboard/share-program.tsx")
    expect(src).toContain('variant === "counter"')
    expect(src).toContain("Mostrale esta pantalla al cliente")
    expect(src).toContain("Brillo al máximo recomendado")
  })

  test("settings es marca/negocio, QR vive en loyalty", () => {
    const settings = read(
      "app/(dashboard)/[slug]/dashboard/settings/page.tsx"
    )
    const form = read("shell/ui/settings-form.tsx")
    expect(settings).toContain("SettingsForm")
    expect(settings).not.toContain("ShareProgram")
    expect(form).toContain("Nombre del comercio")
    expect(form).toContain("Ajustes de fidelización")
    expect(form).toContain("/dashboard/loyalty/programa")
    expect(form).not.toContain("Ver módulos")
  })

  test("panel tiene entrada a Mostrar QR y programa (owner)", () => {
    const src = read("modules/loyalty/dashboard/panel.tsx")
    expect(src).toContain("/dashboard/loyalty/qr")
    expect(src).toMatch(/QR|programa/)
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
    expect(view).toContain("max-w-md")
  })

  test("Descargar QR helper existe", () => {
    const src = read("lib/download-qr.ts")
    expect(src).toContain("downloadQrImage")
    expect(src).toContain("qrcode")
    expect(src).toContain("canvas")
    expect(src).toContain("png")
    expect(src).toContain("download")
  })
})
