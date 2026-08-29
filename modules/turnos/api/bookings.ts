import type { Business } from "@/lib/modules"
import type {
  JsonResult,
  SqlTagged,
  TurnosPaymentMethod,
} from "@/modules/turnos/lib/types"
import { initialPaymentStatus } from "@/modules/turnos/lib/types"

export type BookingsDeps = {
  sql: SqlTagged
  getBusiness: (id: string) => Promise<Business | null>
}

type ServiceRow = {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
  is_active: boolean
}

type BookingRow = {
  id: string
  status: string
  payment_method: string
  payment_status: string
  service_name: string
  price_cents: number
  duration_minutes: number
  starts_at: Date | string
  ends_at: Date | string
  customer_id?: string
  notes?: string | null
}

function mapBooking(r: BookingRow) {
  return {
    id: r.id,
    status: r.status,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    serviceName: r.service_name,
    priceCents: r.price_cents,
    durationMinutes: r.duration_minutes,
    startsAt: new Date(r.starts_at).toISOString(),
    endsAt: new Date(r.ends_at).toISOString(),
    customerId: r.customer_id,
    notes: r.notes ?? null,
  }
}

async function upsertCustomer(
  sql: SqlTagged,
  input: { businessId: string; name: string; phone: string }
): Promise<string | null> {
  const phone = input.phone.trim()
  const name = input.name.trim()
  const existing = (await sql`
    SELECT id FROM customers
    WHERE business_id = ${input.businessId} AND phone = ${phone}
    LIMIT 1
  `) as { id: string }[]
  if (existing[0]) {
    await sql`
      UPDATE customers SET name = ${name}
      WHERE id = ${existing[0].id}
    `
    return existing[0].id
  }
  const inserted = (await sql`
    INSERT INTO customers (business_id, name, phone)
    VALUES (${input.businessId}, ${name}, ${phone})
    RETURNING id
  `) as { id: string }[]
  return inserted[0]?.id ?? null
}

export async function createBooking(
  deps: BookingsDeps,
  input: {
    businessId: string
    serviceId: string
    startsAt: string
    customerName: string
    customerPhone: string
    paymentMethod: TurnosPaymentMethod
    idempotencyKey: string
    notes?: string
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const serviceId = input.serviceId?.trim() ?? ""
  const idempotencyKey = input.idempotencyKey?.trim() ?? ""
  const customerName = input.customerName?.trim() ?? ""
  const customerPhone = input.customerPhone?.trim() ?? ""

  if (!businessId || !serviceId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }
  if (!idempotencyKey) {
    return { status: 400, body: { error: "idempotencyKey es requerido." } }
  }
  if (!customerName || !customerPhone) {
    return { status: 400, body: { error: "Nombre y WhatsApp son requeridos." } }
  }
  if (input.paymentMethod !== "transfer" && input.paymentMethod !== "at_location") {
    return { status: 400, body: { error: "Método de pago inválido." } }
  }

  const business = await deps.getBusiness(businessId)
  if (!business || !business.active_modules?.includes("turnos")) {
    return { status: 404, body: { error: "Módulo de turnos no disponible." } }
  }

  const existingKey = (await deps.sql`
    SELECT id, status, payment_method, payment_status, service_name, price_cents,
           duration_minutes, starts_at, ends_at, customer_id, notes
    FROM turnos_bookings
    WHERE idempotency_key = ${idempotencyKey}
    LIMIT 1
  `) as BookingRow[]
  if (existingKey[0]) {
    return { status: 200, body: { booking: mapBooking(existingKey[0]) } }
  }

  const services = (await deps.sql`
    SELECT id, name, price_cents, duration_minutes, is_active
    FROM turnos_services
    WHERE id = ${serviceId} AND business_id = ${businessId}
  `) as ServiceRow[]
  const service = services[0]
  if (!service || !service.is_active) {
    return { status: 404, body: { error: "Servicio no encontrado." } }
  }

  const settings = (await deps.sql`
    SELECT is_paused, hours FROM turnos_settings WHERE business_id = ${businessId}
  `) as { is_paused: boolean; hours: unknown }[]
  if (settings[0]?.is_paused) {
    return { status: 409, body: { error: "Las reservas están pausadas." } }
  }

  const startsAt = new Date(input.startsAt)
  if (Number.isNaN(startsAt.getTime())) {
    return { status: 400, body: { error: "Fecha/hora inválida." } }
  }
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000)

  const overlaps = (await deps.sql`
    SELECT id FROM turnos_bookings
    WHERE business_id = ${businessId}
      AND status != 'cancelled'
      AND starts_at < ${endsAt.toISOString()}
      AND ends_at > ${startsAt.toISOString()}
    LIMIT 1
  `) as { id: string }[]
  if (overlaps[0]) {
    return { status: 409, body: { error: "Ese horario ya no está disponible." } }
  }

  const customerId = await upsertCustomer(deps.sql, {
    businessId,
    name: customerName,
    phone: customerPhone,
  })
  if (!customerId) {
    return { status: 500, body: { error: "No se pudo registrar el cliente." } }
  }

  const paymentStatus = initialPaymentStatus(input.paymentMethod)
  const status = input.paymentMethod === "at_location" ? "confirmed" : "pending"

  const rows = (await deps.sql`
    INSERT INTO turnos_bookings (
      business_id, customer_id, service_id,
      starts_at, ends_at, status, payment_method, payment_status,
      service_name, price_cents, duration_minutes, notes, idempotency_key
    ) VALUES (
      ${businessId},
      ${customerId},
      ${serviceId},
      ${startsAt.toISOString()},
      ${endsAt.toISOString()},
      ${status},
      ${input.paymentMethod},
      ${paymentStatus},
      ${service.name},
      ${service.price_cents},
      ${service.duration_minutes},
      ${input.notes ?? null},
      ${idempotencyKey}
    )
    RETURNING id, status, payment_method, payment_status, service_name, price_cents,
              duration_minutes, starts_at, ends_at, customer_id, notes
  `) as BookingRow[]

  const row = rows[0]
  if (!row) {
    return { status: 500, body: { error: "No se pudo crear la reserva." } }
  }

  return { status: 201, body: { booking: mapBooking(row) } }
}

export async function listBookings(
  deps: BookingsDeps,
  input: {
    businessId: string
    filter?: "today" | "upcoming" | "pending_payment" | "all"
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const filter = input.filter ?? "all"
  let rows: BookingRow[] = []

  if (filter === "today") {
    rows = (await deps.sql`
      SELECT id, status, payment_method, payment_status, service_name, price_cents,
             duration_minutes, starts_at, ends_at, customer_id, notes
      FROM turnos_bookings
      WHERE business_id = ${businessId}
        AND starts_at::date = CURRENT_DATE
        AND status != 'cancelled'
      ORDER BY starts_at ASC
    `) as BookingRow[]
  } else if (filter === "upcoming") {
    rows = (await deps.sql`
      SELECT id, status, payment_method, payment_status, service_name, price_cents,
             duration_minutes, starts_at, ends_at, customer_id, notes
      FROM turnos_bookings
      WHERE business_id = ${businessId}
        AND starts_at >= NOW()
        AND status != 'cancelled'
      ORDER BY starts_at ASC
    `) as BookingRow[]
  } else if (filter === "pending_payment") {
    rows = (await deps.sql`
      SELECT id, status, payment_method, payment_status, service_name, price_cents,
             duration_minutes, starts_at, ends_at, customer_id, notes
      FROM turnos_bookings
      WHERE business_id = ${businessId}
        AND payment_status IN ('unpaid', 'pending_receipt', 'pending_verification')
        AND status != 'cancelled'
      ORDER BY starts_at ASC
    `) as BookingRow[]
  } else {
    rows = (await deps.sql`
      SELECT id, status, payment_method, payment_status, service_name, price_cents,
             duration_minutes, starts_at, ends_at, customer_id, notes
      FROM turnos_bookings
      WHERE business_id = ${businessId}
      ORDER BY starts_at DESC
      LIMIT 100
    `) as BookingRow[]
  }

  return { status: 200, body: { bookings: rows.map(mapBooking) } }
}

export async function getBooking(
  deps: BookingsDeps,
  input: { businessId: string; bookingId: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const bookingId = input.bookingId?.trim() ?? ""
  if (!businessId || !bookingId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  const rows = (await deps.sql`
    SELECT id, status, payment_method, payment_status, service_name, price_cents,
           duration_minutes, starts_at, ends_at, customer_id, notes
    FROM turnos_bookings
    WHERE id = ${bookingId} AND business_id = ${businessId}
  `) as BookingRow[]

  if (!rows[0]) {
    return { status: 404, body: { error: "Reserva no encontrada." } }
  }

  return { status: 200, body: { booking: mapBooking(rows[0]) } }
}

export async function updateBookingStatus(
  deps: BookingsDeps,
  input: {
    businessId: string
    bookingId: string
    status: "confirmed" | "completed" | "cancelled"
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const bookingId = input.bookingId?.trim() ?? ""
  if (!businessId || !bookingId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  const rows = (await deps.sql`
    UPDATE turnos_bookings
    SET status = ${input.status}, updated_at = now()
    WHERE id = ${bookingId} AND business_id = ${businessId}
    RETURNING id, status, payment_method, payment_status, service_name, price_cents,
              duration_minutes, starts_at, ends_at, customer_id, notes
  `) as BookingRow[]

  if (!rows[0]) {
    return { status: 404, body: { error: "Reserva no encontrada." } }
  }

  return { status: 200, body: { booking: mapBooking(rows[0]) } }
}
