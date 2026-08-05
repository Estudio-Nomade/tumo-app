import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("owner settings + program forms", () => {
  test("settings form: paleta en diálogo, custom color, dirty save", () => {
    const src = read("shell/ui/settings-form.tsx")
    expect(src).toContain("BRAND_SWATCHES")
    expect(src).toContain("Dialog")
    expect(src).toContain("Elegí un color")
    expect(src).toContain("Cambiar color")
    expect(src).toContain("Otro color")
    expect(src).toContain("Abrir paleta de colores")
    expect(src).toContain('type="color"')
    expect(src).toContain("colorInputRef")
    expect(src).toContain("Ver como cliente")
    expect(src).toContain("getClientBrandPreviews")
    expect(src).toContain("activeModuleIds")
    expect(src).toContain("Así te ven tus clientes")
    expect(src).toContain("disabled={!canSave}")
    expect(src).toContain('method: "PATCH"')
    expect(src).toContain("Listo, se guardó")
    expect(src).toContain("router.refresh")
  })

  test("client brand previews se filtran por módulos activos", () => {
    const reg = read("shell/ui/client-brand-preview-registry.ts")
    expect(reg).toContain("CLIENT_BRAND_PREVIEWS")
    expect(reg).toContain('id: "loyalty"')
    expect(reg).toContain("getClientBrandPreviews")
    expect(reg).not.toContain("orders")
    expect(reg).not.toContain("Pedidos")
  })

  test("program form: stepper + reward + API", () => {
    const src = read("modules/loyalty/dashboard/program-form.tsx")
    expect(src).toContain("Compras para canjear")
    expect(src).toContain("Nombre del premio")
    expect(src).toContain("/api/loyalty/program")
    expect(src).toContain("clampNeeded")
    expect(src).toContain("compras →")
    expect(src).toContain("Guardar cambios")
  })

  test("program page owner-only", () => {
    const page = read(
      "app/(dashboard)/[slug]/dashboard/loyalty/programa/page.tsx"
    )
    expect(page).toContain('session.role !== "owner"')
    expect(page).toContain("ProgramForm")
    expect(page).toContain("purchases_needed")
    expect(page).toContain("reward_name")
  })

  test("API routes PATCH owner handlers", () => {
    const biz = read("app/api/business/route.ts")
    const prog = read("app/api/loyalty/program/route.ts")
    expect(biz).toContain("export async function PATCH")
    expect(biz).toContain("parseBusinessUpdate")
    expect(biz).toContain("updateBusinessBrand")
    expect(prog).toContain("export async function PATCH")
    expect(prog).toContain("parseProgramUpdate")
    expect(prog).toContain("updateBusinessProgram")
  })
})
