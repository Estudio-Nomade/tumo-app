import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const migration = readFileSync(
  join(root, "shell/db/migrations/004_orders.sql"),
  "utf8"
)
const mpCredentials = readFileSync(
  join(root, "shell/db/migrations/005_orders_mp_credentials.sql"),
  "utf8"
)
const productsAbm = readFileSync(
  join(root, "shell/db/migrations/006_orders_products_abm.sql"),
  "utf8"
)
const dropMp = readFileSync(
  join(root, "shell/db/migrations/011_orders_drop_mercadopago.sql"),
  "utf8"
)
const productPhotos = readFileSync(
  join(root, "shell/db/migrations/012_product_photos.sql"),
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

  test("credenciales MP por negocio (005) históricas con columnas", () => {
    expect(migrateTs).toContain('"005_orders_mp_credentials.sql"')
    expect(mpCredentials).toMatch(/mp_access_token TEXT/)
    expect(mpCredentials).toMatch(/mp_webhook_secret TEXT/)
  })

  test("011 drop mercadopago: backfill + CHECK sin mercadopago", () => {
    expect(migrateTs).toContain('"011_orders_drop_mercadopago.sql"')
    expect(dropMp).toMatch(/payment_method\s*=\s*'transfer'/i)
    expect(dropMp).toMatch(/WHERE payment_method = 'mercadopago'/i)
    expect(dropMp).toMatch(/method = 'mercadopago'/i)
    expect(dropMp).toMatch(/pending_receipt/)
    expect(dropMp).toMatch(/DROP CONSTRAINT.*payment_method/i)
    expect(dropMp).toMatch(/'transfer',\s*'at_pickup'/)
    expect(dropMp).not.toMatch(/'mercadopago'.*CHECK|CHECK.*'mercadopago'/)
  })

  test("ABM productos (006) registrada: nombre único, precio ≥0, ON DELETE SET NULL", () => {
    expect(migrateTs).toContain('"006_orders_products_abm.sql"')
    expect(productsAbm).toMatch(/lower\(name\)/)
    expect(productsAbm).toMatch(/price_cents >= 0/)
    expect(productsAbm).toMatch(/ON DELETE SET NULL/)
  })

  test("012 product_photos: tabla, index, backfill y FK cascade", () => {
    expect(migrateTs).toContain('"012_product_photos.sql"')
    expect(productPhotos).toMatch(/CREATE TABLE IF NOT EXISTS product_photos/)
    expect(productPhotos).toMatch(/product_id UUID NOT NULL REFERENCES products\(id\) ON DELETE CASCADE/)
    expect(productPhotos).toMatch(/url TEXT NOT NULL/)
    expect(productPhotos).toMatch(/sort_order INT NOT NULL DEFAULT 0/)
    expect(productPhotos).toMatch(/product_photos_product_sort_idx/)
    expect(productPhotos).toMatch(/INSERT INTO product_photos/)
    expect(productPhotos).toMatch(/p\.photo IS NOT NULL/)
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
