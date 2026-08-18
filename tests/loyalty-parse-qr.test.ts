import { describe, expect, test } from "bun:test"
import {
  customerLoyaltyQrPath,
  parseLoyaltyQr,
} from "@/modules/loyalty/lib/parse-loyalty-qr"

describe("parseLoyaltyQr", () => {
  test("parsea URL absoluta de cliente", () => {
    expect(
      parseLoyaltyQr("https://app.tumo.com/carri/loyalty/c/1234")
    ).toEqual({ kind: "customer", slug: "carri", code: "1234" })
  })

  test("parsea path relativo", () => {
    expect(parseLoyaltyQr("/carri/loyalty/c/9999")).toEqual({
      kind: "customer",
      slug: "carri",
      code: "9999",
    })
  })

  test("parsea QR de registro", () => {
    expect(parseLoyaltyQr("https://x.com/carri/loyalty")).toEqual({
      kind: "register",
      slug: "carri",
    })
  })

  test("rechaza QR ajeno", () => {
    expect(parseLoyaltyQr("https://other.com/foo")).toBeNull()
  })

  test("filtra por expectedSlug", () => {
    expect(parseLoyaltyQr("/other/loyalty/c/1234", "carri")).toBeNull()
  })

  test("customerLoyaltyQrPath", () => {
    expect(customerLoyaltyQrPath("carri", "1234")).toBe(
      "/carri/loyalty/c/1234"
    )
  })
})
