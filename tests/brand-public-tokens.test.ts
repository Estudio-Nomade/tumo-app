import { describe, expect, test } from "bun:test"
import {
  isNeutralSurface,
  publicBrandCssVars,
} from "@/shell/brand/public-tokens"

describe("isNeutralSurface", () => {
  test("treats white and near-defaults as classic", () => {
    expect(isNeutralSurface("#FFFFFF")).toBe(true)
    expect(isNeutralSurface("#ffffff")).toBe(true)
    expect(isNeutralSurface("#FFF")).toBe(true)
    expect(isNeutralSurface(null)).toBe(true)
    expect(isNeutralSurface(undefined)).toBe(true)
    expect(isNeutralSurface("")).toBe(true)
  })

  test("treats tinted brand surfaces as non-classic", () => {
    expect(isNeutralSurface("#e7f4f8")).toBe(false)
    expect(isNeutralSurface("#E7F4F8")).toBe(false)
  })

  test("invalid surface falls back to classic white", () => {
    expect(isNeutralSurface("naranja")).toBe(true)
    expect(isNeutralSurface("#GGGGGG")).toBe(true)
    expect(isNeutralSurface("#FFFFFF00")).toBe(true)
  })
})

describe("publicBrandCssVars", () => {
  test("Carri-like classic keeps ink and muted neutrals", () => {
    const vars = publicBrandCssVars({
      primary_color: "#F97316",
      secondary_color: "#FACC15",
      surface_color: "#FFFFFF",
    })
    expect(vars["--color-surface-public"]).toBe("#FFFFFF")
    expect(vars["--color-ink-public"]).toBe("#1C1917")
    expect(vars["--color-muted-public"]).toBe("#78716C")
    expect(vars["--color-progress-fill"]).toBe("#FACC15")
    expect(vars["--color-hint-public"]).toBe("#A8A29E")
    expect(vars["--color-reward-label"]).toBe("#FFEDD5")
    expect(vars["--color-share-bg"]).toBe("#FFF7ED")
    expect(vars["--color-card-to"]).toContain("#9a3412")
  })

  test("Defe-like tinted uses primary/secondary hierarchy", () => {
    const vars = publicBrandCssVars({
      primary_color: "#577e99",
      secondary_color: "#84a7c2",
      surface_color: "#e7f4f8",
    })
    expect(vars["--color-surface-public"]).toBe("#e7f4f8")
    expect(vars["--color-ink-public"]).toBe("#577e99")
    expect(vars["--color-muted-public"]).toBe("#84a7c2")
    expect(vars["--color-progress-fill"]).toBe("#FFFFFF")
    expect(vars["--color-card-to"]).toContain("black")
    expect(vars["--color-card-to"]).not.toContain("#9a3412")
  })
})
