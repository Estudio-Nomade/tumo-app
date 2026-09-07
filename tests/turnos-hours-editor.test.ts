import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  DAY_ORDER,
  editorStateToHours,
  hoursToEditorState,
  validateTurnosDayWindow,
  type DayEditorState,
} from "@/modules/turnos/lib/hours-editor"
import type { HoursMap } from "@/modules/turnos/lib/availability"

const root = join(import.meta.dir, "..")

describe("DAY_ORDER", () => {
  test("lunes a domingo en ES-AR", () => {
    expect(DAY_ORDER.map((d) => d.label)).toEqual([
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ])
    expect(DAY_ORDER.map((d) => d.key)).toEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ])
  })
})

describe("hoursToEditorState / editorStateToHours", () => {
  test("día ausente o [] → cerrado con defaults 09:00–18:00", () => {
    const state = hoursToEditorState({ mon: [["10:00", "14:00"]] })
    expect(state.tue).toEqual({ closed: true, open: "09:00", close: "18:00" })
    expect(state.mon).toEqual({ closed: false, open: "10:00", close: "14:00" })
  })

  test("multi-ventana toma la primera", () => {
    const state = hoursToEditorState({
      wed: [
        ["09:00", "12:00"],
        ["15:00", "18:00"],
      ],
    })
    expect(state.wed).toEqual({ closed: false, open: "09:00", close: "12:00" })
  })

  test("cerrado omite la key; abierto → [[open, close]]", () => {
    const editor: Record<(typeof DAY_ORDER)[number]["key"], DayEditorState> = {
      mon: { closed: false, open: "10:00", close: "14:00" },
      tue: { closed: true, open: "09:00", close: "18:00" },
      wed: { closed: true, open: "09:00", close: "18:00" },
      thu: { closed: true, open: "09:00", close: "18:00" },
      fri: { closed: true, open: "09:00", close: "18:00" },
      sat: { closed: true, open: "09:00", close: "18:00" },
      sun: { closed: true, open: "09:00", close: "18:00" },
    }
    const hours = editorStateToHours(editor)
    expect(hours).toEqual({ mon: [["10:00", "14:00"]] } satisfies HoursMap)
    expect(hours.tue).toBeUndefined()
  })
})

describe("validateTurnosDayWindow", () => {
  test("cierra > abre → ok", () => {
    expect(validateTurnosDayWindow("09:00", "18:00")).toBeNull()
  })

  test("cierra ≤ abre → error", () => {
    expect(validateTurnosDayWindow("18:00", "09:00")).toMatch(/cierre/i)
    expect(validateTurnosDayWindow("10:00", "10:00")).toMatch(/cierre/i)
  })

  test("formato inválido → error", () => {
    expect(validateTurnosDayWindow("9:00", "18:00")).toMatch(/horario/i)
    expect(validateTurnosDayWindow("", "18:00")).toMatch(/horario/i)
  })
})

describe("source contracts UI", () => {
  test("hours-editor UI tiene Lunes, Cerrado, Abre, Cierra", () => {
    const ui = readFileSync(
      join(root, "modules/turnos/dashboard/turnos-hours-editor.tsx"),
      "utf8"
    )
    const lib = readFileSync(
      join(root, "modules/turnos/lib/hours-editor.ts"),
      "utf8"
    )
    expect(lib).toMatch(/Lunes/)
    expect(ui).toMatch(/Cerrado/)
    expect(ui).toMatch(/Abre/)
    expect(ui).toMatch(/Cierra/)
    expect(ui).toMatch(/deja de ofrecerse/)
    expect(ui).not.toMatch(/from ["']@\/modules\/orders/)
    expect(lib).not.toMatch(/from ["']@\/modules\/orders/)
  })

  test("settings-form no hardcodea mon–sáb al guardar", () => {
    const src = readFileSync(
      join(root, "modules/turnos/dashboard/settings-form.tsx"),
      "utf8"
    )
    expect(src).not.toMatch(/mon:\s*\[\s*\[\s*["']09:00["']\s*,\s*["']18:00["']/)
    expect(src).toMatch(/Contacto para reservas/)
    expect(src).toMatch(/No es envío automático/)
    expect(src).toMatch(/editorStateToHours/)
  })

  test("panel link Ajustes legible a /turnos/ajustes", () => {
    const src = readFileSync(
      join(root, "modules/turnos/dashboard/panel.tsx"),
      "utf8"
    )
    expect(src).toMatch(/dashboard\/turnos\/ajustes/)
    expect(src).toMatch(/>\s*Ajustes\s*</)
  })
})
