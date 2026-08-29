/** Day-of-week keys matching JS getUTCDay / local: 0=sun … 6=sat mapped to mon..sun labels. */
const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

export type HoursMap = Partial<
  Record<(typeof DOW)[number], Array<[string, string]>>
>

export type ExistingBooking = {
  startsAt: string // ISO
  endsAt: string
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map((x) => Number(x))
  return h * 60 + m
}

function formatHm(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** day = YYYY-MM-DD in business-local calendar (no TZ convert unless offset given). */
export function generateSlots(input: {
  day: string
  durationMinutes: number
  hours: HoursMap
  existing: ExistingBooking[]
  paused: boolean
  /** Minutes east of UTC for interpreting existing ISO vs day; default 0 (UTC day). */
  timeZoneOffsetMinutes?: number
}): string[] {
  if (input.paused) return []
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    return []
  }

  const [y, mo, d] = input.day.split("-").map(Number)
  if (!y || !mo || !d) return []

  // Build noon UTC then apply — use UTC date parts for DOW of the calendar day string
  const utcNoon = Date.UTC(y, mo - 1, d, 12, 0, 0)
  const dow = DOW[new Date(utcNoon).getUTCDay()]
  const windows = input.hours[dow] ?? []
  if (!windows.length) return []

  const offset = input.timeZoneOffsetMinutes ?? 0
  const dayStartUtc = Date.UTC(y, mo - 1, d, 0, 0, 0) - offset * 60_000

  const busy = input.existing.map((b) => ({
    start: new Date(b.startsAt).getTime(),
    end: new Date(b.endsAt).getTime(),
  }))

  const slots: string[] = []
  for (const [openHm, closeHm] of windows) {
    const open = parseHm(openHm)
    const close = parseHm(closeHm)
    for (let t = open; t + input.durationMinutes <= close; t += input.durationMinutes) {
      const startMs = dayStartUtc + t * 60_000
      const endMs = startMs + input.durationMinutes * 60_000
      const overlaps = busy.some((b) => startMs < b.end && endMs > b.start)
      if (!overlaps) slots.push(formatHm(t))
    }
  }
  return slots
}
