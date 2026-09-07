import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  bookingStatusLabel,
  bookingStatusBadgeClass,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/modules/turnos/lib/status-labels"

const root = join(import.meta.dir, "..")

describe("bookingStatusLabel", () => {
  test("mapea estados D1", () => {
    expect(bookingStatusLabel("pending")).toBe("Reservado")
    expect(bookingStatusLabel("confirmed")).toBe("Confirmado")
    expect(bookingStatusLabel("completed")).toBe("Atendido")
    expect(bookingStatusLabel("cancelled")).toBe("Cancelado")
  })

  test("fallback seguro", () => {
    expect(bookingStatusLabel("weird")).toBe("weird")
    expect(bookingStatusLabel("")).toBe("—")
  })
})

describe("paymentStatusLabel", () => {
  test("paid / rejected genéricos", () => {
    expect(paymentStatusLabel("transfer", "paid")).toBe("Pagado")
    expect(paymentStatusLabel("at_location", "paid")).toBe("Pagado")
    expect(paymentStatusLabel("transfer", "rejected")).toBe("Pago rechazado")
  })

  test("transfer pendientes", () => {
    expect(paymentStatusLabel("transfer", "pending_receipt")).toBe(
      "Falta comprobante"
    )
    expect(paymentStatusLabel("transfer", "pending_verification")).toBe(
      "Revisar comprobante"
    )
  })

  test("at_location unpaid", () => {
    expect(paymentStatusLabel("at_location", "unpaid")).toBe("Paga en el local")
  })

  test("unpaid genérico", () => {
    expect(paymentStatusLabel("transfer", "unpaid")).toBe("Sin cobrar")
  })
})

describe("paymentMethodLabel", () => {
  test("métodos", () => {
    expect(paymentMethodLabel("transfer")).toBe("Transferencia")
    expect(paymentMethodLabel("at_location")).toBe("En el local")
  })
})

describe("bookingStatusBadgeClass", () => {
  test("clases semánticas no vacías", () => {
    expect(bookingStatusBadgeClass("completed")).toMatch(/green/)
    expect(bookingStatusBadgeClass("cancelled")).toMatch(/red|stone/)
    expect(bookingStatusBadgeClass("pending")).toMatch(/amber|stone|orange/)
  })
})

describe("source contracts UI", () => {
  test("panel y detalle no muestran snake_case crudo como badge único", () => {
    const panel = readFileSync(
      join(root, "modules/turnos/dashboard/panel.tsx"),
      "utf8"
    )
    const detail = readFileSync(
      join(root, "modules/turnos/dashboard/booking-detail.tsx"),
      "utf8"
    )
    expect(panel).toMatch(/bookingStatusLabel|paymentStatusLabel/)
    expect(detail).toMatch(/bookingStatusLabel|paymentStatusLabel/)
    expect(panel).not.toMatch(/\{b\.status\}/)
    expect(panel).not.toMatch(/\{b\.paymentStatus\}/)
    expect(detail).not.toMatch(/Estado: <strong>\{.*\.status\}<\/strong>/)
    expect(panel).not.toMatch(/from ["']@\/modules\/orders/)
    expect(detail).not.toMatch(/from ["']@\/modules\/orders/)
  })

  test("detalle usa PATCH y gating", () => {
    const detail = readFileSync(
      join(root, "modules/turnos/dashboard/booking-detail.tsx"),
      "utf8"
    )
    expect(detail).toMatch(/method:\s*["']PATCH["']/)
    expect(detail).toMatch(/Marcar atendido/)
    expect(detail).toMatch(/Aprobar pago/)
    expect(detail).toMatch(/Cancelar turno/)
    expect(detail).toMatch(/completed|cancelled/)
  })

  test("route PATCH acciones admin", () => {
    const route = readFileSync(
      join(root, "app/api/turnos/bookings/[id]/route.ts"),
      "utf8"
    )
    expect(route).toMatch(/export async function PATCH/)
    expect(route).toMatch(/approve_payment|complete|cancel/)
    expect(route).toMatch(/session_token/)
    expect(route).toMatch(/approvePayment|updateBookingStatus/)
  })
})
