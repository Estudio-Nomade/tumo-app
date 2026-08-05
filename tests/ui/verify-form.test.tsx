import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
  join(import.meta.dir, "../../shell/auth/login/verify-form.tsx"),
  "utf8"
)

describe("VerifyForm UX", () => {
  test("muestra teléfono enmascarado", () => {
    expect(src).toContain("maskPhone")
    expect(src).toContain("Enviado a")
  })

  test("resend cooldown alineado a ~60s (no 5 min)", () => {
    expect(src).toMatch(/RESEND_SECONDS\s*=\s*60\b/)
    expect(src).not.toMatch(/RESEND_SECONDS\s*=\s*300\b/)
  })
})
