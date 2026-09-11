import { describe, expect, test } from "bun:test"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const shellMig = join(root, "shell/db/migrations/016_schema_normalization_expand.sql")
const supabaseMig = join(
  root,
  "supabase/migrations/20260911120000_schema_normalization_expand.sql"
)
const migrateTs = readFileSync(join(root, "shell/db/migrate.ts"), "utf8")

function sqlBody(): string {
  expect(existsSync(shellMig)).toBe(true)
  return readFileSync(shellMig, "utf8")
}

describe("016 schema normalization expand", () => {
  test("archivo shell + supabase existen y migrate.ts lo registra", () => {
    expect(existsSync(shellMig)).toBe(true)
    expect(existsSync(supabaseMig)).toBe(true)
    expect(migrateTs).toContain('"016_schema_normalization_expand.sql"')
    const a = readFileSync(shellMig, "utf8")
    const b = readFileSync(supabaseMig, "utf8")
    expect(a.length).toBeGreaterThan(200)
    expect(a).toBe(b)
  })

  test("crea people con phone unique + name + birthday", () => {
    const body = sqlBody()
    expect(body).toMatch(/CREATE TABLE IF NOT EXISTS people/)
    expect(body).toMatch(/phone TEXT NOT NULL/)
    expect(body).toMatch(/UNIQUE\s*\(\s*phone\s*\)|phone TEXT NOT NULL UNIQUE/)
    expect(body).toMatch(/birthday DATE/)
  })

  test("crea loyalty_settings 1:1 business con premio y tope por compra", () => {
    const body = sqlBody()
    expect(body).toMatch(/CREATE TABLE IF NOT EXISTS loyalty_settings/)
    expect(body).toMatch(/business_id UUID PRIMARY KEY REFERENCES businesses\(id\)/)
    expect(body).toMatch(/points_needed/)
    expect(body).toMatch(/reward_name/)
    expect(body).toMatch(/max_points_per_purchase/)
  })

  test("crea loyalty_point_ranges tabulares", () => {
    const body = sqlBody()
    expect(body).toMatch(/CREATE TABLE IF NOT EXISTS loyalty_point_ranges/)
    expect(body).toMatch(/min_cents/)
    expect(body).toMatch(/max_cents/)
    expect(body).toMatch(/points INT/)
    expect(body).toMatch(/business_id UUID .* REFERENCES businesses\(id\)/)
  })

  test("customers: person_id + rewards_redeemed_count; backfill people", () => {
    const body = sqlBody()
    expect(body).toMatch(/ALTER TABLE customers[\s\S]*person_id/)
    expect(body).toMatch(/rewards_redeemed_count/)
    expect(body).toMatch(/INSERT INTO people/)
    expect(body).toMatch(/UPDATE customers[\s\S]*person_id/)
  })

  test("business_payment_profiles + backfill desde settings de módulos", () => {
    const body = sqlBody()
    expect(body).toMatch(/CREATE TABLE IF NOT EXISTS business_payment_profiles/)
    expect(body).toMatch(/transfer_alias/)
    expect(body).toMatch(/transfer_cbu/)
    expect(body).toMatch(/transfer_holder/)
    expect(body).toMatch(/INSERT INTO business_payment_profiles/)
  })

  test("module_hours con tramos partidos por módulo", () => {
    const body = sqlBody()
    expect(body).toMatch(/CREATE TABLE IF NOT EXISTS module_hours/)
    expect(body).toMatch(/module_id/)
    expect(body).toMatch(/weekday/)
    expect(body).toMatch(/start_minute/)
    expect(body).toMatch(/end_minute/)
  })

  test("empleados: developer role + owner un teléfono un comercio + phone por business", () => {
    const body = sqlBody()
    expect(body).toMatch(/developer/)
    expect(body).toMatch(/DROP CONSTRAINT IF EXISTS employees_phone_key|DROP INDEX IF EXISTS employees_phone_key/)
    expect(body).toMatch(/UNIQUE\s*\(\s*phone\s*,\s*business_id\s*\)|employees_phone_business/)
    expect(body).toMatch(/role\s*=\s*'owner'|WHERE role = 'owner'/)
  })

  test("backfill loyalty desde businesses y NO dropea columnas legacy", () => {
    const body = sqlBody()
    expect(body).toMatch(/INSERT INTO loyalty_settings/)
    expect(body).toMatch(/INSERT INTO loyalty_point_ranges|point_ranges/)
    expect(body).not.toMatch(/DROP COLUMN\s+points_needed/i)
    expect(body).not.toMatch(/DROP COLUMN\s+active_modules/i)
    expect(body).not.toMatch(/DROP COLUMN\s+points\b/i)
  })
})
