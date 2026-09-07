import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  DAY_ORDER,
  editorStateToHours,
  hoursToEditorState,
  normalizeHm,
  validateTurnosDayWindow,
  validateEditorState,
  type DayEditorState,
} from "@/modules/turnos/lib/hours-editor"
import type { HoursMap } from "@/modules/turnos/lib/availability"

const root = join(import.meta.dir, "..")

function closedDay(): DayEditorState {
  return { closed: true, windows: [{ open: "09:00", close: "18:00" }] }
}

function openDay(
  windows: Array<{ open: string; close: string }>
): DayEditorState {
  return { closed: false, windows }
}

function allClosedExcept(
  patch: Partial<Record<(typeof DAY_ORDER)[number]["key"], DayEditorState>>
): Record<(typeof DAY_ORDER)[number]["key"], DayEditorState> {
  const out = {} as Record<(typeof DAY_ORDER)[number]["key"], DayEditorState>
  for (const { key } of DAY_ORDER) {
    out[key] = patch[key] ?? closedDay()
  }
  return out
}

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
    expect(state.tue).toEqual(closedDay())
    expect(state.mon).toEqual(openDay([{ open: "10:00", close: "14:00" }]))
  })

  test("multi-ventana carga todas las franjas", () => {
    const state = hoursToEditorState({
      wed: [
        ["09:00", "12:00"],
        ["13:00", "15:00"],
        ["16:00", "20:00"],
      ],
    })
    expect(state.wed).toEqual(
      openDay([
        { open: "09:00", close: "12:00" },
        { open: "13:00", close: "15:00" },
        { open: "16:00", close: "20:00" },
      ])
    )
  })

  test("cerrado omite la key; abierto multi → N ventanas", () => {
    const editor = allClosedExcept({
      mon: openDay([
        { open: "09:00", close: "12:00" },
        { open: "13:00", close: "15:00" },
        { open: "16:00", close: "20:00" },
      ]),
    })
    const hours = editorStateToHours(editor)
    expect(hours).toEqual({
      mon: [
        ["09:00", "12:00"],
        ["13:00", "15:00"],
        ["16:00", "20:00"],
      ],
    } satisfies HoursMap)
    expect(hours.tue).toBeUndefined()
  })

  test("round-trip multi-ventana sin pérdida", () => {
    const original: HoursMap = {
      mon: [
        ["09:00", "12:00"],
        ["13:00", "15:00"],
        ["16:00", "20:00"],
      ],
    }
    const hours = editorStateToHours(hoursToEditorState(original))
    expect(hours).toEqual(original)
  })

  test("hours string JSON o basura → editor cerrado seguro", () => {
    expect(hoursToEditorState('{"mon":[["09:00","12:00"]]}').mon.closed).toBe(
      false
    )
    expect(hoursToEditorState("nope").mon.closed).toBe(true)
    expect(hoursToEditorState([] as unknown as HoursMap).fri.closed).toBe(true)
  })
})

describe("normalizeHm / validateTurnosDayWindow", () => {
  test("normaliza HH:MM:SS y H:MM", () => {
    expect(normalizeHm("9:30")).toBe("09:30")
    expect(normalizeHm("09:30:00")).toBe("09:30")
  })

  test("cierra > abre → ok", () => {
    expect(validateTurnosDayWindow("09:00", "18:00")).toBeNull()
    expect(validateTurnosDayWindow("9:00", "18:00")).toBeNull()
    expect(validateTurnosDayWindow("09:00:00", "18:00:00")).toBeNull()
  })

  test("cierra ≤ abre → error", () => {
    expect(validateTurnosDayWindow("18:00", "09:00")).toMatch(/cierre/i)
    expect(validateTurnosDayWindow("10:00", "10:00")).toMatch(/cierre/i)
  })

  test("formato inválido → error", () => {
    expect(validateTurnosDayWindow("xx", "18:00")).toMatch(/horario/i)
    expect(validateTurnosDayWindow("", "18:00")).toMatch(/horario/i)
  })

  test("franjas superpuestas en el mismo día → error", () => {
    const editor = allClosedExcept({
      mon: openDay([
        { open: "09:00", close: "13:00" },
        { open: "12:00", close: "15:00" },
      ]),
    })
    expect(validateEditorState(editor)).toMatch(/superpon/i)
  })

  test("franjas contiguas sin overlap → ok", () => {
    const editor = allClosedExcept({
      mon: openDay([
        { open: "09:00", close: "12:00" },
        { open: "12:00", close: "15:00" },
      ]),
    })
    expect(validateEditorState(editor)).toBeNull()
  })
})

describe("source contracts UI", () => {
  test("hours-editor UI multi-franja + labels Abierto|Cerrado", () => {
    const ui = readFileSync(
      join(root, "modules/turnos/dashboard/turnos-hours-editor.tsx"),
      "utf8"
    )
    const lib = readFileSync(
      join(root, "modules/turnos/lib/hours-editor.ts"),
      "utf8"
    )
    expect(lib).toMatch(/Lunes/)
    expect(ui).toMatch(/Abierto/)
    expect(ui).toMatch(/Cerrado/)
    expect(ui).toMatch(/day\.closed \? "Cerrado" : "Abierto"/)
    expect(ui).toMatch(/aria-checked=\{!day\.closed\}/)
    expect(ui).toMatch(/bg-green-500/)
    expect(ui).toMatch(/Abre/)
    expect(ui).toMatch(/Cierra/)
    expect(ui).toMatch(/Agregar franja/)
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

  test("booking-wizard nextDays usa fecha local, no toISOString slice", () => {
    const src = readFileSync(
      join(root, "modules/turnos/public/booking-wizard.tsx"),
      "utf8"
    )
    expect(src).toMatch(/localDateIso|getFullYear/)
    expect(src).not.toMatch(/toISOString\(\)\.slice\(0,\s*10\)/)
  })
})
