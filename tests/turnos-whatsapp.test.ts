import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  buildBookingWhatsAppMessage,
  buildBookingWhatsAppHref,
  whatsappDigits,
} from "@/modules/turnos/lib/whatsapp"

const root = join(import.meta.dir, "..")
const confirmationSrc = readFileSync(
  join(root, "modules/turnos/public/confirmation.tsx"),
  "utf8"
)
const settingsFormSrc = readFileSync(
  join(root, "modules/turnos/dashboard/settings-form.tsx"),
  "utf8"
)
const migration013 = readFileSync(
  join(root, "shell/db/migrations/013_turnos_whatsapp_phone.sql"),
  "utf8"
)
const migrateTs = readFileSync(join(root, "shell/db/migrate.ts"), "utf8")

describe("whatsappDigits", () => {
  test("deja solo dígitos", () => {
    expect(whatsappDigits("+54 9 2266 515-776")).toBe("5492266515776")
    expect(whatsappDigits("")).toBe("")
  })
})

describe("buildBookingWhatsAppMessage", () => {
  const base = {
    businessName: "Tumo Lab",
    serviceName: "Corte",
    startsAt: "2026-09-08T15:00:00.000Z",
    durationMinutes: 30,
    priceCents: 12500,
    bookingId: "abcdef12-3456-7890",
  }

  test("incluye datos del turno", () => {
    const msg = buildBookingWhatsAppMessage({
      ...base,
      paymentMethod: "at_location",
    })
    expect(msg).toContain("Tumo Lab")
    expect(msg).toContain("Corte")
    expect(msg).toContain("30")
    expect(msg).toMatch(/12\.500|12500|\$/)
    expect(msg).toContain("#abcdef12")
    expect(msg).toMatch(/local|efectivo|lugar/i)
    expect(msg).not.toMatch(/comprobante/i)
  })

  test("transfer pide adjuntar comprobante", () => {
    const msg = buildBookingWhatsAppMessage({
      ...base,
      paymentMethod: "transfer",
    })
    expect(msg).toMatch(/transfer/i)
    expect(msg).toMatch(/comprobante/i)
  })
})

describe("buildBookingWhatsAppHref", () => {
  test("sin dígitos → null", () => {
    expect(
      buildBookingWhatsAppHref({ phone: "abc", text: "hola" })
    ).toBeNull()
  })

  test("arma wa.me con text encoded", () => {
    const href = buildBookingWhatsAppHref({
      phone: "+54911 1234-5678",
      text: "Hola turno",
    })
    expect(href).toBe(
      `https://wa.me/5491112345678?text=${encodeURIComponent("Hola turno")}`
    )
  })
})

describe("confirmation WhatsApp (source contracts)", () => {
  test("CTA Avisar por WhatsApp + wa.me", () => {
    expect(confirmationSrc).toMatch(/Avisar por WhatsApp/)
    expect(confirmationSrc).toMatch(/wa\.me|buildBookingWhatsAppHref/)
  })
})

describe("settings form WhatsApp (source contracts)", () => {
  test("campo WhatsApp del negocio", () => {
    expect(settingsFormSrc).toMatch(/WhatsApp/)
    expect(settingsFormSrc).toMatch(/whatsappPhone/)
  })
})

describe("013_turnos_whatsapp_phone", () => {
  test("agrega whatsapp_phone a turnos_settings", () => {
    expect(migration013).toMatch(/whatsapp_phone/)
    expect(migration013).toMatch(/turnos_settings/)
  })

  test("migrate.ts incluye 013", () => {
    expect(migrateTs).toContain("013_turnos_whatsapp_phone.sql")
  })
})
