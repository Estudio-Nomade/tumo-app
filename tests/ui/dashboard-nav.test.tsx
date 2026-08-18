import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("dashboard owner nav (Pencil)", () => {
  const src = read("shell/layouts/dashboard-layout.tsx")

  test("owner tabs incluyen Panel Actividad Módulos Ajustes", () => {
    expect(src).toContain("LayoutDashboard")
    expect(src).toContain("LayoutGrid")
    expect(src).toContain("Activity")
    expect(src).toContain("Settings")
    expect(src).toContain('label: "Panel"')
    expect(src).toContain('label: "Actividad"')
    expect(src).toContain('label: "Módulos"')
    expect(src).toContain('label: "Ajustes"')
    expect(src).toContain("/dashboard/modules")
    expect(src).toContain("/dashboard/activity")
    expect(src).toContain("/dashboard/settings")
  })

  test("pill nav matches Pencil sizing", () => {
    expect(src).toContain("rounded-[36px]")
    expect(src).toContain("rounded-[26px]")
    expect(src).toContain("h-[62px]")
    expect(src).toContain("text-[10px]")
  })

  test("mobile avatar is identity only (not logout button)", () => {
    // Avatar block should not wrap logout in a button on mobile header
    expect(src).toMatch(
      /md:hidden[\s\S]*?rounded-full bg-\[#1C1917\][\s\S]*?\{initial\}/
    )
    // Must not have button with aria-label Salir around the avatar
    expect(src).not.toMatch(
      /aria-label="Salir"[\s\S]{0,200}rounded-full bg-\[#1C1917\]/
    )
    // Desktop still has Salir
    expect(src).toContain("Salir")
    expect(src).toContain("onLogout")
  })

  test("header reads business.location when present", () => {
    expect(src).toContain("business.location")
  })

  test("QR programa usa canvas phone-first sin sidebar", () => {
    expect(src).toContain("isQrCanvas")
    expect(src).toContain("test(pathname)")
    expect(src).toContain("max-w-md")
    expect(src).toContain("md:rounded-[28px]")
  })

  test("settings usa form editable de negocio/marca", () => {
    const settings = read(
      "app/(dashboard)/[slug]/dashboard/settings/page.tsx"
    )
    const form = read("shell/ui/settings-form.tsx")
    expect(settings).toContain("SettingsForm")
    expect(settings).not.toContain("ShareProgram")
    expect(form).toContain("LogoutButton")
    expect(form).toContain("Tu comercio y tu cuenta")
    expect(form).toContain("Nombre del comercio")
    expect(form).toContain("Guardar cambios")
    expect(form).toContain("/api/business")
    expect(form).toContain("Ajustes de fidelización")
    expect(form).toContain("/dashboard/loyalty/programa")
    expect(form).not.toContain("Ver módulos")
    expect(form).not.toContain("contactá a soporte")
    expect(form).not.toContain(
      "Compras para canjear y nombre del premio se editan en el programa"
    )
  })
})

