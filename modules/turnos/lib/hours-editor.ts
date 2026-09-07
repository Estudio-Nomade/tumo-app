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

/** Acepta HH:MM, H:MM o HH:MM:SS del input type=time. */
export function normalizeHm(hm: string): string {
  const m = String(hm ?? "")
    .trim()
    .match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/)
  if (!m) return String(hm ?? "").trim()
  return `${m[1].padStart(2, "0")}:${m[2]}`
}

function parseHm(hm: string): number | null {
  const n = normalizeHm(hm)
  if (!HM_RE.test(n)) return null
  const [h, m] = n.split(":").map(Number)
  return h * 60 + m
}

function coerceHoursMap(hours: unknown): HoursMap {
  if (hours == null) return {}
  let raw: unknown = hours
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown
    } catch {
      return {}
    }
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {}
  }
  return raw as HoursMap
}

function readWindow(
  windows: unknown
): { open: string; close: string } | null {
  if (!Array.isArray(windows) || windows.length === 0) return null
  const first = windows[0]
  if (!Array.isArray(first) || first.length < 2) return null
  const open = normalizeHm(String(first[0] ?? ""))
  const close = normalizeHm(String(first[1] ?? ""))
  if (!open && !close) return null
  return {
    open: open || DEFAULT_OPEN,
    close: close || DEFAULT_CLOSE,
  }
}

export function hoursToEditorState(
  hours: HoursMap | null | undefined | unknown
): Record<DayKey, DayEditorState> {
  const src = coerceHoursMap(hours)
  const out = {} as Record<DayKey, DayEditorState>
  for (const { key } of DAY_ORDER) {
    const w = readWindow(src[key])
    if (w) {
      out[key] = { closed: false, open: w.open, close: w.close }
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

/**
 * Serializa el editor a HoursMap.
 * Días no tocados conservan ventanas originales (multi-franja).
 * Días tocados: cerrado → omit; abierto → una sola [[open, close]].
 */
export function editorStateToHours(
  state: Record<DayKey, DayEditorState>,
  options?: {
    original?: HoursMap | null | unknown
    touched?: ReadonlySet<DayKey> | DayKey[]
  }
): HoursMap {
  const original = coerceHoursMap(options?.original)
  const touched = new Set(
    options?.touched
      ? Array.isArray(options.touched)
        ? options.touched
        : [...options.touched]
      : DAY_ORDER.map((d) => d.key)
  )
  const out: HoursMap = {}
  for (const { key } of DAY_ORDER) {
    if (!touched.has(key)) {
      const prev = original[key]
      if (Array.isArray(prev) && prev.length > 0) {
        out[key] = prev as Array<[string, string]>
      }
      continue
    }
    const d = state[key]
    if (!d || d.closed) continue
    out[key] = [[normalizeHm(d.open), normalizeHm(d.close)]]
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
  state: Record<DayKey, DayEditorState>,
  touched?: ReadonlySet<DayKey> | DayKey[]
): string | null {
  const keys = touched
    ? new Set(Array.isArray(touched) ? touched : [...touched])
    : null
  for (const { key, label } of DAY_ORDER) {
    if (keys && !keys.has(key)) continue
    const d = state[key]
    if (!d || d.closed) continue
    const err = validateTurnosDayWindow(d.open, d.close)
    if (err) return `${label}: ${err}`
  }
  return null
}

export function dayHasMultiWindow(
  hours: HoursMap | null | unknown,
  key: DayKey
): boolean {
  const src = coerceHoursMap(hours)
  const w = src[key]
  return Array.isArray(w) && w.length > 1
}
