import { describe, expect, test } from "bun:test"
import { toBirthdayDate } from "@/modules/loyalty/lib/birthday"

describe("toBirthdayDate", () => {
  test("encode valid month/day as 2000-MM-DD", () => {
    expect(toBirthdayDate(3, 15)).toBe("2000-03-15")
    expect(toBirthdayDate(12, 1)).toBe("2000-12-01")
  })

  test("Feb 29 is valid (year 2000 is leap)", () => {
    expect(toBirthdayDate(2, 29)).toBe("2000-02-29")
  })

  test("invalid returns null", () => {
    expect(toBirthdayDate(0, 1)).toBeNull()
    expect(toBirthdayDate(13, 1)).toBeNull()
    expect(toBirthdayDate(1, 0)).toBeNull()
    expect(toBirthdayDate(1, 32)).toBeNull()
    expect(toBirthdayDate(4, 31)).toBeNull()
    expect(toBirthdayDate(2, 30)).toBeNull()
    expect(toBirthdayDate(NaN, 1)).toBeNull()
  })

  test("nullish partial returns null", () => {
    expect(toBirthdayDate(null, 1)).toBeNull()
    expect(toBirthdayDate(3, null)).toBeNull()
    expect(toBirthdayDate(undefined, undefined)).toBeNull()
  })
})
