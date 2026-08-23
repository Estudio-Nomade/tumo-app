import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
  join(import.meta.dir, "../shell/db/pool.ts"),
  "utf8"
)

describe("db pool", () => {
  test("reusa una sola instancia via globalThis (evita leak en HMR/dev)", () => {
    expect(src).toContain("globalThis")
    expect(src).toContain("globalForDb.__tumoSql")
    expect(src).toContain("max:")
  })

  test("limita conexiones por proceso para no saturar Supabase free", () => {
    const maxMatch = src.match(/max:\s*(\d+)/)
    expect(maxMatch).not.toBeNull()
    const max = Number(maxMatch![1])
    expect(max).toBeGreaterThan(0)
    expect(max).toBeLessThanOrEqual(5)
  })

  test("desactiva prepared statements para transaction pooler (:6543)", () => {
    expect(src).toContain("prepare: false")
  })

  test("usa TLS para el pooler de Supabase y plaintext en local", () => {
    expect(src).toContain("isPooler")
    expect(src).toContain(".pooler.supabase.com")
    expect(src).toContain("'require'")
  })
})
