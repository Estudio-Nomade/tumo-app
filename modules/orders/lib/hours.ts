export type DayHours = {
  open?: string | null
  close?: string | null
  closed?: boolean
}

/** Días 0–6 (0=domingo, como JS getDay). Día sin entrada = cerrado. */
export type OrdersHours = Record<string, DayHours | undefined>

export type OpeningInfo = {
  /** "hoy" | "mañana" | "el <día>" */
  dayLabel: string
  /** "HH:MM" */
  time: string
}

export const DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const

function parseHm(value: string | null | undefined): number | null {
  if (!value) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

function formatHm(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function entry(hours: OrdersHours, day: number): DayHours | undefined {
  return hours[String(day)]
}

function windowOpenNow(e: DayHours | undefined, mins: number): boolean {
  if (!e || e.closed) return false
  const open = parseHm(e.open)
  const close = parseHm(e.close)
  if (open == null || close == null) return false
  if (close > open) return mins >= open && mins < close
  if (close < open) return mins >= open // cruza medianoche: abierto hasta fin de día
  return false
}

function crossesIntoToday(e: DayHours | undefined, mins: number): boolean {
  if (!e || e.closed) return false
  const open = parseHm(e.open)
  const close = parseHm(e.close)
  if (open == null || close == null) return false
  // close < open significa que cerró al día siguiente
  return close < open && mins < close
}

export function isOpenNow(hours: OrdersHours, now: Date = new Date()): boolean {
  const day = now.getDay()
  const mins = now.getHours() * 60 + now.getMinutes()

  if (windowOpenNow(entry(hours, day), mins)) return true
  if (crossesIntoToday(entry(hours, (day + 6) % 7), mins)) return true
  return false
}

export function nextOpening(
  hours: OrdersHours,
  now: Date = new Date()
): OpeningInfo | null {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(start)
    d.setDate(d.getDate() + offset)
    const e = entry(hours, d.getDay())
    if (!e || e.closed) continue
    const open = parseHm(e.open)
    if (open == null) continue
    d.setHours(Math.floor(open / 60), open % 60, 0, 0)
    if (d.getTime() <= now.getTime()) continue

    const dayLabel =
      offset === 0 ? "hoy" : offset === 1 ? "mañana" : `el ${DAY_NAMES[d.getDay()]}`
    return { dayLabel, time: formatHm(open) }
  }

  return null
}

/** ¿Es una hora "HH:MM" válida (2 dígitos, 00–23 / 00–59)? */
export function isValidTime(value: unknown): value is string {
  if (typeof value !== "string") return false
  return /^\d{2}:\d{2}$/.test(value) && parseHm(value) != null
}

/**
 * Valida un día del horario. Devuelve null si es válido, o un mensaje llano.
 * Un día cerrado es válido; abierto requiere open/close válidos y distintos.
 */
export function validateDayHours(day: DayHours | undefined): string | null {
  if (!day || day.closed) return null
  if (!isValidTime(day.open) || !isValidTime(day.close)) {
    return "Elegí las horas de apertura y cierre."
  }
  if (parseHm(day.open) === parseHm(day.close)) {
    return "La apertura y el cierre no pueden ser iguales."
  }
  return null
}

/**
 * Normaliza y valida un `OrdersHours` completo (claves "0".."6").
 * Días ausentes se omiten (se interpretan como cerrados en isOpenNow).
 * Soporta cruce de medianoche (close < open).
 */
export function sanitizeHours(
  input: unknown
): { hours: OrdersHours } | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Horario inválido." }
  }
  const obj = input as Record<string, unknown>
  const hours: OrdersHours = {}
  for (let d = 0; d < 7; d++) {
    const key = String(d)
    const raw = obj[key]
    if (raw === undefined || raw === null) continue
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return { error: "Horario inválido." }
    }
    const day = raw as DayHours
    if (day.closed) {
      hours[key] = { closed: true }
      continue
    }
    const err = validateDayHours(day)
    if (err) return { error: err }
    hours[key] = {
      open: day.open as string,
      close: day.close as string,
      closed: false,
    }
  }
  return { hours }
}
