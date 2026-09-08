import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const layoutSrc = readFileSync(
  join(import.meta.dir, "../app/admin/(panel)/layout.tsx"),
  "utf8"
)

describe("admin panel route segment config", () => {
  test("force-dynamic evita prerender de /admin en build (sin DB)", () => {
    expect(layoutSrc).toMatch(
      /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/
    )
  })
})
