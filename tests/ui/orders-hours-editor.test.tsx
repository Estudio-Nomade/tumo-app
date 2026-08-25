import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const editor = readFileSync(
  join(root, "modules/orders/dashboard/hours-editor.tsx"),
  "utf8"
)

describe("HoursEditor (source contracts)", () => {
  test("renderiza los 7 días con DAY_NAMES", () => {
    expect(editor).toContain("DAY_NAMES")
  })

  test("switch Cerrado todo el día por día", () => {
    expect(editor).toContain("Cerrado todo el día")
    expect(editor).toContain("role=\"switch\"")
  })

  test("inputs de hora (type=time) para apertura y cierre", () => {
    expect(editor).toContain('type="time"')
  })

  test("botón guardar ≥56px (elderly-UX)", () => {
    expect(editor).toMatch(/min-h-\[56px\]/)
  })

  test("guarda vía PATCH a /settings/hours", () => {
    expect(editor).toContain("/api/orders/settings/hours")
    expect(editor).toContain("PATCH")
  })

  test("dep-inyectado: recibe updateHours", () => {
    expect(editor).toMatch(/updateHours/)
  })
})
