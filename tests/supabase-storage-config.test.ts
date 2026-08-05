import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
  join(import.meta.dir, "../shell/storage/supabase.ts"),
  "utf8"
)
const envExample = readFileSync(join(import.meta.dir, "../.env.example"), "utf8")

describe("supabase storage keys (modern)", () => {
  test("usa SUPABASE_SECRET_KEY no service_role legacy", () => {
    expect(src).toContain("SUPABASE_SECRET_KEY")
    expect(src).toContain("sb_secret_")
    expect(src).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(src).toContain("detectSessionInUrl: false")
  })

  test(".env.example documenta publishable + secret", () => {
    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    expect(envExample).toContain("SUPABASE_SECRET_KEY")
    expect(envExample).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
  })
})
