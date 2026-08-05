import { describe, expect, test } from "bun:test"
import {
  getLoyaltyDisplayUrl,
  getLoyaltyPublicPath,
  getLoyaltyPublicUrl,
} from "@/lib/loyalty-url"

describe("getLoyaltyPublicPath", () => {
  test("slug normal", () => {
    expect(getLoyaltyPublicPath("carri")).toBe("/carri/loyalty")
  })

  test("trims slashes", () => {
    expect(getLoyaltyPublicPath("/carri/")).toBe("/carri/loyalty")
  })
})

describe("getLoyaltyPublicUrl", () => {
  test("junta origin y path", () => {
    expect(getLoyaltyPublicUrl("https://tumo.app", "carri")).toBe(
      "https://tumo.app/carri/loyalty"
    )
  })

  test("quita slash final del origin", () => {
    expect(getLoyaltyPublicUrl("https://tumo.app/", "carri")).toBe(
      "https://tumo.app/carri/loyalty"
    )
  })
})

describe("getLoyaltyDisplayUrl", () => {
  test("sin protocolo", () => {
    expect(getLoyaltyDisplayUrl("https://tumo.app", "carri")).toBe(
      "tumo.app/carri/loyalty"
    )
  })
})
