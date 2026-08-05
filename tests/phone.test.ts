import { describe, expect, test } from "bun:test"
import { normalizePhone, phonesMatch } from "@/lib/phone"

describe("normalizePhone", () => {
  test("quita espacios guiones y plus", () => {
    expect(normalizePhone("+54 9 11 1234-5678")).toBe("5491112345678")
  })

  test("vacío", () => {
    expect(normalizePhone("")).toBe("")
    expect(normalizePhone("  ")).toBe("")
  })
})

describe("phonesMatch", () => {
  test("mismo número con distinto formato", () => {
    expect(phonesMatch("+54 9 11 1234-5678", "5491112345678")).toBe(true)
  })

  test("distintos", () => {
    expect(phonesMatch("111", "222")).toBe(false)
  })
})
