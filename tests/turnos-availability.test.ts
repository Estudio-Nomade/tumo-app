import { describe, expect, test } from "bun:test"
import { generateSlots } from "@/modules/turnos/lib/availability"

describe("generateSlots", () => {
  const hours = {
    mon: [["09:00", "12:00"]],
  }

  test("día cerrado → vacío", () => {
    // 2026-08-30 is Sunday
    const slots = generateSlots({
      day: "2026-08-30",
      durationMinutes: 30,
      hours,
      existing: [],
      paused: false,
    })
    expect(slots).toEqual([])
  })

  test("genera slots de 30 min en ventana", () => {
    // 2026-08-31 is Monday
    const slots = generateSlots({
      day: "2026-08-31",
      durationMinutes: 30,
      hours,
      existing: [],
      paused: false,
    })
    expect(slots[0]).toBe("09:00")
    expect(slots).toContain("11:30")
    expect(slots).not.toContain("12:00")
  })

  test("excluye solapes con bookings", () => {
    const slots = generateSlots({
      day: "2026-08-31",
      durationMinutes: 30,
      hours,
      existing: [{ startsAt: "2026-08-31T09:00:00.000Z", endsAt: "2026-08-31T09:30:00.000Z" }],
      paused: false,
      timeZoneOffsetMinutes: 0,
    })
    expect(slots).not.toContain("09:00")
    expect(slots).toContain("09:30")
  })

  test("paused → vacío", () => {
    const slots = generateSlots({
      day: "2026-08-31",
      durationMinutes: 30,
      hours,
      existing: [],
      paused: true,
    })
    expect(slots).toEqual([])
  })
})
