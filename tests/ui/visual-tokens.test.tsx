import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

/** Brand shell for employee auth — Pencil ts7NR: orange→primary→deep, never near-white. */
const AUTH_GRADIENT_MARKERS = [
  "var(--color-primary",
  "from-[color-mix(in_srgb,var(--color-primary",
]

describe("visual tokens vs Pencil", () => {
  test("login gradient stays saturated (no 55% white wash)", () => {
    const src = read("shell/auth/login/login-form.tsx")
    expect(src).not.toContain("primary,#F97316)_55%,white")
    expect(src).toContain("var(--color-primary")
    // top stop must keep most of the primary hue
    expect(src).toMatch(/from-\[color-mix\(in_srgb,var\(--color-primary[^)]*\)_(8[5-9]|9\d)%,white\)\]/)
  })

  test("verify shares the same saturated auth gradient", () => {
    const src = read("shell/auth/login/verify-form.tsx")
    expect(src).not.toContain("primary,#F97316)_55%,white")
    expect(src).toMatch(/from-\[color-mix\(in_srgb,var\(--color-primary[^)]*\)_(8[5-9]|9\d)%,white\)\]/)
  })

  test("public registration uses white surface, not full-page orange gradient", () => {
    const src = read("modules/loyalty/public/registration.tsx")
    expect(src).not.toMatch(/shellClassName[\s\S]*bg-gradient-to-b/)
    expect(src).toContain('bg-white')
  })

  test("public card uses white surface; gradient only on reward block", () => {
    const src = read("modules/loyalty/public/card.tsx")
    expect(src).not.toMatch(/shellClassName[\s\S]*bg-gradient-to-b from-\[color-mix/)
    expect(src).toContain('bg-white')
    expect(src).toContain("from-[var(--color-primary")
  })

  test("MetricCard matches Pencil metric tile (soft fill, left stack)", () => {
    const src = read("shell/ui/MetricCard.tsx")
    expect(src).toContain("rounded-[18px]")
    expect(src).toContain("text-[22px]")
    expect(src).toContain("font-extrabold")
    expect(src).not.toContain("items-center justify-center")
  })

  test("dashboard mobile nav is pill with labels", () => {
    const src = read("shell/layouts/dashboard-layout.tsx")
    expect(src).toContain("rounded-[36px]")
    expect(src).toContain("rounded-[26px]")
    expect(src).toContain("flex-col items-center justify-center")
    // label text visible on mobile, not icon-only
    expect(src).toContain("{item.label}")
    expect(src).toContain("text-[10px]")
  })

  test("employee panel search uses surface-soft bar styling", () => {
    const src = read("modules/loyalty/dashboard/panel.tsx")
    expect(src).toContain("!bg-[#F5F5F4]")
    expect(src).toContain("rounded-[14px]")
  })
})
