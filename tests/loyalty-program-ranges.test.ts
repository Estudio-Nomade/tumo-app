import { describe, expect, test } from "bun:test"
import {
  parseProgramUpdate,
  validatePointRanges,
} from "@/modules/loyalty/api/program"

describe("validatePointRanges", () => {
  test("acepta tramos contiguos con último abierto", () => {
    const r = validatePointRanges([
      { min_cents: 0, max_cents: 1000000, points: 0 },
      { min_cents: 1000000, max_cents: 2000000, points: 50 },
      { min_cents: 2000000, max_cents: null, points: 100 },
    ])
    expect(r.ok).toBe(true)
  })

  test("rechaza hueco", () => {
    const r = validatePointRanges([
      { min_cents: 0, max_cents: 1000, points: 10 },
      { min_cents: 2000, max_cents: null, points: 20 },
    ])
    expect(r.ok).toBe(false)
  })

  test("rechaza último cerrado", () => {
    const r = validatePointRanges([
      { min_cents: 0, max_cents: 1000, points: 10 },
    ])
    expect(r.ok).toBe(false)
  })

  test("rechaza dos bandas de 0 pts", () => {
    const r = validatePointRanges([
      { min_cents: 0, max_cents: 100, points: 0 },
      { min_cents: 100, max_cents: null, points: 0 },
    ])
    expect(r.ok).toBe(false)
  })
})

describe("parseProgramUpdate", () => {
  test("parsea points_needed y point_ranges", () => {
    const r = parseProgramUpdate({
      points_needed: 150,
      reward_name: "cafe",
      point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.points_needed).toBe(150)
      expect(r.value.point_ranges?.[0].points).toBe(1)
    }
  })
})
