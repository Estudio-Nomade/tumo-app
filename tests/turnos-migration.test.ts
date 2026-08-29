import { describe, expect, test } from "bun:test"
import { readFileSync } from "fs"
import { join } from "path"

const migrationPath = join(
  import.meta.dir,
  "../shell/db/migrations/009_turnos.sql"
)

describe("009_turnos.sql", () => {
  const sql = () => readFileSync(migrationPath, "utf-8")

  test("archivo existe y no está vacío", () => {
    const body = sql()
    expect(body.length).toBeGreaterThan(100)
  })

  test("crea turnos_services con price_cents y duration_minutes", () => {
    const body = sql()
    expect(body).toContain("CREATE TABLE IF NOT EXISTS turnos_services")
    expect(body).toContain("price_cents")
    expect(body).toContain("duration_minutes")
  })

  test("crea turnos_settings con is_paused y transfer fields", () => {
    const body = sql()
    expect(body).toContain("CREATE TABLE IF NOT EXISTS turnos_settings")
    expect(body).toContain("is_paused")
    expect(body).toContain("transfer_alias")
    expect(body).toContain("transfer_cbu")
    expect(body).toContain("transfer_holder")
  })

  test("crea turnos_bookings con estados e idempotency_key", () => {
    const body = sql()
    expect(body).toContain("CREATE TABLE IF NOT EXISTS turnos_bookings")
    expect(body).toContain("idempotency_key")
    expect(body).toContain("starts_at")
    expect(body).toContain("ends_at")
    expect(body).toMatch(/pending/)
    expect(body).toMatch(/confirmed/)
    expect(body).toMatch(/at_location/)
    expect(body).toMatch(/transfer/)
  })

  test("crea turnos_payments con receipt_bytes", () => {
    const body = sql()
    expect(body).toContain("CREATE TABLE IF NOT EXISTS turnos_payments")
    expect(body).toContain("receipt_bytes")
  })
})
