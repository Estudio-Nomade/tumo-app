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

export type WindowEditor = { open: string; close: string }

export type DayEditorState = {
  closed: boolean
  windows: WindowEditor[]
}

const DEFAULT_OPEN = "09:00"
const DEFAULT_CLOSE = "18:00"
const DEFAULT_WINDOW: WindowEditor = {
  open: DEFAULT_OPEN,
  close: DEFAULT_CLOSE,
}

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

function readWindows(windows: unknown): WindowEditor[] {
  if (!Array.isArray(windows) || windows.length === 0) return []
  const out: WindowEditor[] = []
  for (const first of windows) {
    if (!Array.isArray(first) || first.length < 2) continue
    const open = normalizeHm(String(first[0] ?? ""))
    const close = normalizeHm(String(first[1] ?? ""))
    if (!open && !close) continue
    out.push({
      open: open || DEFAULT_OPEN,
      close: close || DEFAULT_CLOSE,
    })
  }
  return out
}

export function defaultWindow(): WindowEditor {
  return { ...DEFAULT_WINDOW }
}

export function hoursToEditorState(
  hours: HoursMap | null | undefined | unknown
): Record<DayKey, DayEditorState> {
  const src = coerceHoursMap(hours)
  const out = {} as Record<DayKey, DayEditorState>
  for (const { key } of DAY_ORDER) {
    const windows = readWindows(src[key])
    if (windows.length > 0) {
      out[key] = { closed: false, windows }
    } else {
      out[key] = { closed: true, windows: [defaultWindow()] }
    }
  }
  return out
}

/** Serializa el editor a HoursMap (N franjas por día abierto). */
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
    const windows = (d.windows ?? [])
      .map((w) => [normalizeHm(w.open), normalizeHm(w.close)] as [string, string])
      .filter(([o, c]) => o && c)
    if (windows.length === 0) continue
    out[key] = windows
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

function windowsOverlap(
  a: WindowEditor,
  b: WindowEditor
): boolean {
  const a0 = parseHm(a.open)
  const a1 = parseHm(a.close)
  const b0 = parseHm(b.open)
  const b1 = parseHm(b.close)
  if (a0 == null || a1 == null || b0 == null || b1 == null) return false
  return a0 < b1 && b0 < a1
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
    const windows = d.windows ?? []
    if (windows.length === 0) {
      return `${label}: agregá al menos una franja o marcá Cerrado.`
    }
    for (let i = 0; i < windows.length; i++) {
      const err = validateTurnosDayWindow(windows[i].open, windows[i].close)
      if (err) return `${label}: ${err}`
    }
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        if (windowsOverlap(windows[i], windows[j])) {
          return `${label}: las franjas no se pueden superponer.`
        }
      }
    }
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
