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

const DAY_NAMES = [
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
