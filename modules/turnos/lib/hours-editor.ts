import type { HoursMap } from "@/modules/turnos/lib/availability"

export const DAY_ORDER = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
] as const

export type DayKey = (typeof DAY_ORDER)[number]["key"]

export type DayEditorState = {
  closed: boolean
  open: string
  close: string
}

const DEFAULT_OPEN = "09:00"
const DEFAULT_CLOSE = "18:00"

const HM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseHm(hm: string): number | null {
  if (!HM_RE.test(hm)) return null
  const [h, m] = hm.split(":").map(Number)
  return h * 60 + m
}

export function hoursToEditorState(
  hours: HoursMap | null | undefined
): Record<DayKey, DayEditorState> {
  const src = hours ?? {}
  const out = {} as Record<DayKey, DayEditorState>
  for (const { key } of DAY_ORDER) {
    const windows = src[key]
    if (windows && windows.length > 0) {
      const [open, close] = windows[0]
      out[key] = {
        closed: false,
        open: open || DEFAULT_OPEN,
        close: close || DEFAULT_CLOSE,
      }
    } else {
      out[key] = {
        closed: true,
        open: DEFAULT_OPEN,
        close: DEFAULT_CLOSE,
      }
    }
  }
  return out
}

export function editorStateToHours(
  state: Record<DayKey, DayEditorState>
): HoursMap {
  const out: HoursMap = {}
  for (const { key } of DAY_ORDER) {
    const d = state[key]
    if (!d || d.closed) continue
    out[key] = [[d.open, d.close]]
  }
  return out
}

/** null = ok; string = mensaje de error llano */
export function validateTurnosDayWindow(
  open: string,
  close: string
): string | null {
  const o = parseHm(open)
  const c = parseHm(close)
  if (o == null || c == null) {
    return "Usá un horario válido (HH:MM)."
  }
  if (c <= o) {
    return "El cierre tiene que ser después de la apertura el mismo día."
  }
  return null
}

export function validateEditorState(
  state: Record<DayKey, DayEditorState>
): string | null {
  for (const { key, label } of DAY_ORDER) {
    const d = state[key]
    if (!d || d.closed) continue
    const err = validateTurnosDayWindow(d.open, d.close)
    if (err) return `${label}: ${err}`
  }
  return null
}
