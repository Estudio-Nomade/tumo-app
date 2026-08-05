import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const src = readFileSync(
  join(root, "shell/layouts/dashboard-layout.tsx"),
  "utf8"
)

describe("employee dashboard chrome", () => {
  test("bottom nav only for owner", () => {
    expect(src).toMatch(/showBottomNav|isOwner &&/)
    // mobile bottom nav gated
    expect(src).toMatch(
      /(showBottomNav|isOwner)\s*\?\s*\([\s\S]*?aria-label="Navegación principal"[\s\S]*?md:hidden/
    )
  })

  test("employee still has desktop sidebar modules path", () => {
    expect(src).toContain("modules.map")
  })
})
