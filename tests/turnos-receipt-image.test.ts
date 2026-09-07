import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  bytesToBase64,
  decodeReceiptBase64,
  ALLOWED_RECEIPT_MIMES,
  MAX_RECEIPT_BYTES,
} from "@/modules/turnos/lib/receipt-image"

const root = join(import.meta.dir, "..")
const wizardSrc = readFileSync(
  join(root, "modules/turnos/public/booking-wizard.tsx"),
  "utf8"
)
const receiptRouteSrc = readFileSync(
  join(root, "app/api/turnos/bookings/[id]/receipt/route.ts"),
  "utf8"
)

describe("bytesToBase64", () => {
  test("encodea bytes chicos igual que btoa clásico", () => {
    const bytes = new Uint8Array([72, 105]) // "Hi"
    expect(bytesToBase64(bytes)).toBe(btoa("Hi"))
  })

  test("encodea buffers grandes sin spread de N args (no RangeError)", () => {
    const size = 300_000
    const bytes = new Uint8Array(size)
    for (let i = 0; i < size; i++) bytes[i] = i % 256
    const b64 = bytesToBase64(bytes)
    expect(b64.length).toBeGreaterThan(0)
    const roundtrip = Buffer.from(b64, "base64")
    expect(roundtrip.byteLength).toBe(size)
    expect(roundtrip[0]).toBe(0)
    expect(roundtrip[255]).toBe(255)
  })
})

describe("decodeReceiptBase64", () => {
  test("base64 válido → bytes", () => {
    const bytes = decodeReceiptBase64(btoa("Hi"))
    expect(bytes).not.toBeNull()
    expect(Array.from(bytes!)).toEqual([72, 105])
  })

  test("basura / vacío → null (no confiar en Buffer.from solo)", () => {
    expect(decodeReceiptBase64("")).toBeNull()
    expect(decodeReceiptBase64("!!!not-b64!!!")).toBeNull()
    expect(decodeReceiptBase64("abc")).toBeNull()
  })
})

describe("receipt constants", () => {
  test("allowlist imagen como orders (sin PDF)", () => {
    expect(ALLOWED_RECEIPT_MIMES).toContain("image/jpeg")
    expect(ALLOWED_RECEIPT_MIMES).toContain("image/png")
    expect(ALLOWED_RECEIPT_MIMES).toContain("image/webp")
    expect(ALLOWED_RECEIPT_MIMES).toContain("image/heic")
    expect(ALLOWED_RECEIPT_MIMES).toContain("image/heif")
    expect(ALLOWED_RECEIPT_MIMES).not.toContain("application/pdf")
  })

  test("tope 3MB", () => {
    expect(MAX_RECEIPT_BYTES).toBe(3 * 1024 * 1024)
  })
})

describe("BookingWizard receipt (source contracts)", () => {
  test("no usa String.fromCharCode(... sobre el buffer del receipt", () => {
    expect(wizardSrc).not.toMatch(/String\.fromCharCode\(\.\.\./)
  })

  test("chequea res.ok del POST receipt antes de redirigir", () => {
    expect(wizardSrc).toMatch(/\/receipt[\s\S]*!res\.ok|receiptRes[\s\S]*!.*\.ok/)
  })

  test("solo acepta imagen (no PDF)", () => {
    expect(wizardSrc).not.toMatch(/accept=["'][^"']*application\/pdf/)
    expect(wizardSrc).toMatch(/accept=["']image\//)
  })

  test("usa compress / helper de imagen turnos", () => {
    expect(wizardSrc).toMatch(/compressImage|receipt-image/)
  })

  test("reusa bookingId en reintento (no recrea si ya hay id)", () => {
    expect(wizardSrc).toMatch(/let id = bookingId|if \(!id\)/)
    expect(wizardSrc).toContain("idempotencyKeyRef")
  })
})

describe("turnos receipt route (source contracts)", () => {
  test("decodifica base64 con helper estricto, no atob", () => {
    expect(receiptRouteSrc).toContain("decodeReceiptBase64")
    expect(receiptRouteSrc).not.toMatch(/\batob\b/)
  })

  test("base64 inválido → 400 Imagen inválida", () => {
    expect(receiptRouteSrc).toContain("Imagen inválida.")
  })
})
