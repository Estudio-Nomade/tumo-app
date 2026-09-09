import { describe, expect, test } from "bun:test"
import {
  PRICE_PER_MODULE_CENTS,
  monthlyAmountCentsForModuleCount,
} from "@/shell/billing/pricing"

describe("billing pricing USD por módulo", () => {
  test("PRICE_PER_MODULE_CENTS es 6999 ($69.99)", () => {
    expect(PRICE_PER_MODULE_CENTS).toBe(6999)
  })

  test("0 módulos → 0", () => {
    expect(monthlyAmountCentsForModuleCount(0)).toBe(0)
  })

  test("1 módulo → 6999", () => {
    expect(monthlyAmountCentsForModuleCount(1)).toBe(6999)
  })

  test("2 módulos → 13998", () => {
    expect(monthlyAmountCentsForModuleCount(2)).toBe(13998)
  })

  test("3 módulos → 20997", () => {
    expect(monthlyAmountCentsForModuleCount(3)).toBe(20997)
  })

  test("negativo y NaN → 0", () => {
    expect(monthlyAmountCentsForModuleCount(-3)).toBe(0)
    expect(monthlyAmountCentsForModuleCount(Number.NaN)).toBe(0)
    expect(monthlyAmountCentsForModuleCount(1.9)).toBe(6999)
  })
})
