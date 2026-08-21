import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const migration = readFileSync(
  join(root, "shell/db/migrations/004_orders.sql"),
  "utf8"
)
const migrateTs = readFileSync(join(root, "shell/db/migrate.ts"), "utf8")

const TABLES = [
  "product_categories",
  "products",
  "product_variant_groups",
  "product_variant_options",
  "orders",
  "order_items",
  "order_item_variants",
  "order_payments",
  "orders_settings",
]

describe("migración 004_orders", () => {
  test("crea las 9 tablas del módulo", () => {
    for (const t of TABLES) {
      expect(migration).toMatch(new RegExp(`CREATE TABLE (IF NOT EXISTS )?${t}\\s`))
    }
  })

  test("registrada en migrate.ts", () => {
    expect(migrateTs).toContain('"004_orders.sql"')
  })

  test("no altera la tabla customers", () => {
    expect(migration).not.toMatch(/ALTER TABLE\s+customers/i)
  })

  test("precios en centavos INT", () => {
    expect(migration).toMatch(/price_cents INT NOT NULL/)
    expect(migration).toMatch(/subtotal_cents INT NOT NULL/)
    expect(migration).toMatch(/total_cents INT NOT NULL/)
    expect(migration).toMatch(/delivery_fee_cents INT/)
    expect(migration).toMatch(/price_delta_cents INT/)
    expect(migration).toMatch(/unit_price_cents INT NOT NULL/)
  })

  test("snapshots en items y variantes", () => {
    expect(migration).toMatch(/product_name TEXT NOT NULL/)
    expect(migration).toMatch(/group_name TEXT NOT NULL/)
    expect(migration).toMatch(/option_name TEXT NOT NULL/)
  })

  test("idempotency_key UNIQUE (anti doble-tap)", () => {
    expect(migration).toMatch(/idempotency_key TEXT UNIQUE/)
  })

  test("order_number correlativo por negocio", () => {
    expect(migration).toMatch(/UNIQUE\s*\(\s*business_id\s*,\s*order_number\s*\)/)
  })

  test("comprobantes como BYTEA", () => {
    expect(migration).toMatch(/receipt_image BYTEA/)
    expect(migration).toMatch(/receipt_mime TEXT/)
  })

  test("settings: hours JSONB + kill switch is_paused + mp_enabled", () => {
    expect(migration).toMatch(/hours JSONB NOT NULL/)
    expect(migration).toMatch(/is_paused BOOLEAN/)
    expect(migration).toMatch(/mp_enabled BOOLEAN/)
  })

  test("cantidad con tope 20", () => {
    expect(migration).toMatch(/quantity BETWEEN 1 AND 20/)
  })

  test("FKs hacia shell (businesses/customers/products/employees)", () => {
    expect(migration).toMatch(/REFERENCES businesses\(id\)/)
    expect(migration).toMatch(/REFERENCES customers\(id\)/)
    expect(migration).toMatch(/REFERENCES products\(id\)/)
    expect(migration).toMatch(/REFERENCES employees\(id\)/)
  })
})
