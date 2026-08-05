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
  })

  test("settings incluye ShareProgram del programa", () => {
    const src = read("app/(dashboard)/[slug]/dashboard/settings/page.tsx")
    expect(src).toContain("ShareProgram")
    expect(src).not.toContain("Próximamente")
  })

  test("panel tiene entrada a Mostrar QR", () => {
    const src = read("modules/loyalty/dashboard/panel.tsx")
    expect(src).toContain("Mostrar QR")
    expect(src).toContain("/dashboard/loyalty/qr")
  })

  test("ruta fullscreen QR del empleado existe", () => {
    const src = read(
      "app/(dashboard)/[slug]/dashboard/loyalty/qr/page.tsx"
    )
    expect(src).toContain("ShareProgram")
    expect(src).toContain("Escaneá")
    expect(src).toContain("Volver")
    expect(src).toContain('variant="fullscreen"')
  })
})
